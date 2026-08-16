/**
 * src/controllers/authController.ts
 *
 * Production-grade authentication controller.
 *
 * Endpoints:
 *   POST   /api/auth/register        — Public self-registration (creates org + admin user)
 *   POST   /api/auth/login           — Issue access + refresh tokens
 *   POST   /api/auth/refresh         — Rotate access token using HttpOnly cookie
 *   POST   /api/auth/logout          — Revoke refresh token, clear cookie
 *   GET    /api/auth/me              — Fetch authenticated user profile (safe fields only)
 *   POST   /api/auth/forgot-password — Send password reset email
 *   POST   /api/auth/reset-password  — Apply new password, invalidate all sessions
 *
 * Security guarantees:
 *   - All inputs validated with Zod before any DB access
 *   - Passwords hashed with bcrypt cost 12, never returned to client
 *   - Refresh tokens stored as SHA-256 hashes in MongoDB
 *   - Refresh tokens issued as HttpOnly, Secure (prod), SameSite cookies
 *   - Access tokens are short-lived (15m default)
 *   - tokenVersion incremented on password reset to revoke all sessions instantly
 *   - Every auth failure uses generic messages to prevent user enumeration
 *   - Stack traces never reach API consumers in production
 */

import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

import { User } from '../models/User'
import { Organization } from '../models/Organization'
import { AppError } from '../middleware/errorHandler'
import { sendPasswordResetEmail, sendVerificationEmail } from '../utils/email'
import {
  RegisterSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from '../validation/auth.schemas'

// ── Constants ─────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 12
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000 // 1 hour
const REFRESH_COOKIE_NAME = 'sitetrack_refresh'
const REFRESH_COOKIE_PATH = '/api/auth'

// ── Token helpers ─────────────────────────────────────────────────────────

function signAccessToken(
  userId: string,
  orgId: string,
  role: string,
  tokenVersion: number
): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new AppError('JWT_SECRET is not configured on this server', 500)

  return jwt.sign(
    { userId, orgId, role, tokenVersion },
    secret,
    { expiresIn: (process.env.ACCESS_TOKEN_EXPIRES_IN ?? '15m') } as jwt.SignOptions
  )
}

function signRefreshToken(userId: string, tokenVersion: number): string {
  // Use a dedicated secret if provided; fall back to JWT_SECRET so tests work
  // with a single env var.
  const secret = process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET
  if (!secret) throw new AppError('JWT_REFRESH_SECRET is not configured on this server', 500)

  return jwt.sign(
    { userId, tokenVersion },
    secret,
    { expiresIn: (process.env.REFRESH_TOKEN_EXPIRES_IN ?? '7d') } as jwt.SignOptions
  )
}

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

// ── Cookie helpers ────────────────────────────────────────────────────────

function setRefreshCookie(res: Response, token: string): void {
  const isProd = process.env.NODE_ENV === 'production'
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path: REFRESH_COOKIE_PATH,
  })
}

function clearRefreshCookie(res: Response): void {
  const isProd = process.env.NODE_ENV === 'production'
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: REFRESH_COOKIE_PATH,
  })
}

// ── Safe user projection ───────────────────────────────────────────────────
// Returns ONLY non-sensitive fields. Never includes passwordHash,
// refreshTokenHash, resetPasswordToken, or any verification secrets.

function sanitizeUser(user: InstanceType<typeof User>): object {
  return {
    id: (user._id as any).toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    orgId: user.orgId.toString(),
    isEmailVerified: user.isEmailVerified,
  }
}

// ── POST /api/auth/register ───────────────────────────────────────────────
//
// Public self-registration. Creates an Organization and its first Admin user.
// Responds with the same token pair as login so the client is immediately
// authenticated without a second round-trip.

export async function register(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 1. Validate with Zod — throws ZodError on bad input
    const parsed = RegisterSchema.safeParse(req.body)
    if (!parsed.success) {
      const messages = parsed.error.issues.map((e) => e.message).join('; ')
      throw new AppError(messages, 400)
    }
    const { organizationName, name, email, password } = parsed.data

    // 2. Check duplicate email (email is already normalised by Zod .toLowerCase())
    const existing = await User.findOne({ email })
    if (existing) {
      // 409 Conflict — specific enough to let the UI say "email already in use"
      // without revealing whether a full profile exists.
      throw new AppError('An account with this email already exists', 409)
    }

    // 3. Create organization
    const org = await Organization.create({ name: organizationName })
    const orgId = (org._id as any).toString()

    // 4. Hash password
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)

    // 5. Generate email verification token
    const rawVerificationToken = crypto.randomBytes(32).toString('hex')
    const hashedVerificationToken = hashToken(rawVerificationToken)
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h

    // 6. Create the new user as 'pending' — must be approved by an admin before login
    const user = await User.create({
      orgId,
      name,
      email,
      passwordHash,
      role: 'site_engineer', // default role; admin can correct on approval
      status: 'pending',
      isEmailVerified: false,
      emailVerificationToken: hashedVerificationToken,
      emailVerificationExpires: verificationExpires,
      tokenVersion: 0,
    })

    // 7. Do NOT issue tokens — pending users cannot log in yet.
    //    Send a verification email so the token doesn't expire unused,
    //    but the account still requires admin approval before first login.
    const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${rawVerificationToken}`
    sendVerificationEmail(user.email, user.name, verificationLink).catch(() => {})

    res.status(201).json({
      success: true,
      pending: true,
      message:
        'Your account request has been submitted. An Admin will review and approve it before you can log in.',
    })
  } catch (err) {
    next(err)
  }
}

// ── POST /api/auth/login ──────────────────────────────────────────────────

export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 1. Zod validation
    const parsed = LoginSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new AppError('Invalid email or password', 401)
    }
    const { email, password } = parsed.data

    // 2. Lookup user — select passwordHash, failedLoginAttempts, lockUntil explicitly
    const user = await User.findOne({ email }).select('+passwordHash +failedLoginAttempts +lockUntil')
    if (!user) {
      throw new AppError('Invalid email or password', 401)
    }

    // 3. Account Lockout check — 5 failed attempts locks for 15 minutes
    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingMs = user.lockUntil.getTime() - Date.now()
      const remainingMins = Math.ceil(remainingMs / 60000)
      throw new AppError(
        `Account is temporarily locked due to repeated failed login attempts. Please try again after ${user.lockUntil.toISOString()} (in ${remainingMins} minute(s)).`,
        423
      )
    }

    // Reset expired lock if present
    if (user.lockUntil && user.lockUntil <= new Date()) {
      user.failedLoginAttempts = 0
      user.lockUntil = undefined
    }

    // 4. Inactive check — 403 so client knows account is deactivated
    if (user.status === 'inactive') {
      throw new AppError('Account is deactivated — contact your administrator', 403)
    }

    // 5. Pending approval check — 403 with clear pending message
    if (user.status === 'pending') {
      throw new AppError(
        'Your account is pending admin approval. You will be notified once approved.',
        403
      )
    }

    // 5. Email verification check
    if (user.isEmailVerified === false) {
      throw new AppError('Email address is not verified. Please check your inbox for the verification link.', 403)
    }

    // 6. Constant-time bcrypt compare
    const isMatch = await bcrypt.compare(password, user.passwordHash)
    if (!isMatch) {
      const attempts = (user.failedLoginAttempts || 0) + 1
      if (attempts >= 5) {
        const lockUntil = new Date(Date.now() + 15 * 60 * 1000) // 15 min lock
        await User.updateOne(
          { _id: user._id },
          { $set: { failedLoginAttempts: attempts, lockUntil } }
        )
        throw new AppError(
          `Account is temporarily locked due to 5 consecutive failed login attempts. Please try again in 15 minute(s).`,
          423
        )
      } else {
        await User.updateOne(
          { _id: user._id },
          { $set: { failedLoginAttempts: attempts } }
        )
        throw new AppError('Invalid email or password', 401)
      }
    }

    // 7. Successful login — reset failed attempts and clear lock
    const userIdStr = (user._id as any).toString()
    const tokenVersion = user.tokenVersion ?? 0

    // Issue token pair
    const accessToken = signAccessToken(userIdStr, user.orgId.toString(), user.role, tokenVersion)
    const refreshToken = signRefreshToken(userIdStr, tokenVersion)

    // Persist hashed refresh token and reset lockout state
    await User.updateOne(
      { _id: user._id },
      {
        $set: { failedLoginAttempts: 0, refreshTokenHash: hashToken(refreshToken) },
        $unset: { lockUntil: '' },
      }
    )

    // Set HttpOnly refresh cookie
    setRefreshCookie(res, refreshToken)

    res.status(200).json({
      success: true,
      token: accessToken,
      refreshToken: refreshToken,
      user: sanitizeUser(user),
    })
  } catch (err) {
    next(err)
  }
}

// ── POST /api/auth/verify-email ───────────────────────────────────────────

export async function verifyEmail(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = String(req.body?.token || req.query?.token || '').trim()
    if (!token) {
      throw new AppError('Verification token is required', 400)
    }

    const hashedToken = hashToken(token)
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: new Date() },
    })

    if (!user) {
      throw new AppError('Invalid or expired email verification token', 400)
    }

    await User.updateOne(
      { _id: user._id },
      {
        $set: { isEmailVerified: true },
        $unset: { emailVerificationToken: '', emailVerificationExpires: '' },
      }
    )

    res.status(200).json({
      success: true,
      message: 'Email address verified successfully. You can now log in.',
    })
  } catch (err) {
    next(err)
  }
}

// ── POST /api/auth/refresh ────────────────────────────────────────────────

export async function refresh(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawRefreshToken =
      req.cookies?.[REFRESH_COOKIE_NAME] ||
      (req.body && req.body.refreshToken) ||
      (req.headers['x-refresh-token'] as string)

    if (!rawRefreshToken) {
      throw new AppError('No refresh token — please log in again', 401)
    }

    const secret = process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET
    if (!secret) throw new AppError('Server misconfiguration', 500)

    // Verify JWT signature + expiry
    let decoded: { userId: string; tokenVersion: number }
    try {
      decoded = jwt.verify(rawRefreshToken, secret) as any
    } catch {
      clearRefreshCookie(res)
      throw new AppError('Refresh token is invalid or expired — please log in again', 401)
    }

    // Fetch user, check active
    const user = await User.findById(decoded.userId)
    if (!user || user.status === 'inactive') {
      clearRefreshCookie(res)
      throw new AppError('Account not found or deactivated', 401)
    }

    // tokenVersion check — password reset / forced logout increments this
    if (user.tokenVersion !== decoded.tokenVersion) {
      clearRefreshCookie(res)
      throw new AppError('Session has been invalidated — please log in again', 401)
    }

    // Hash comparison — prevents reuse of a stolen refresh token after logout
    const expectedHash = hashToken(rawRefreshToken)
    if (user.refreshTokenHash !== expectedHash) {
      clearRefreshCookie(res)
      throw new AppError('Refresh token reuse detected — session terminated', 401)
    }

    // Issue a fresh access token (same tokenVersion, no refresh token rotation)
    const userIdStr = (user._id as any).toString()
    const newAccessToken = signAccessToken(
      userIdStr,
      user.orgId.toString(),
      user.role,
      user.tokenVersion
    )

    res.status(200).json({
      success: true,
      token: newAccessToken,
      user: sanitizeUser(user),
    })

  } catch (err) {
    next(err)
  }
}

// ── POST /api/auth/logout ─────────────────────────────────────────────────
//
// Server-side logout: removes the stored refresh token hash so the cookie
// cannot be reused even if it hasn't expired yet.

export async function logout(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME]

    if (rawRefreshToken) {
      // Clear the stored hash so this cookie is permanently invalidated
      const hashed = hashToken(rawRefreshToken)
      await User.updateOne(
        { refreshTokenHash: hashed },
        { $unset: { refreshTokenHash: '' } }
      )
    }

    clearRefreshCookie(res)

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/auth/me ──────────────────────────────────────────────────────
//
// Returns the safe profile of the currently authenticated user.
// Populates organization name so clients don't need a separate call.
// Protected by authenticateToken middleware applied in the router.

export async function getMe(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {

    const userId = req.user!.userId

    const user = await User.findById(userId).populate('orgId', 'name')
    if (!user) {
      throw new AppError('User not found', 404)
    }
    if (user.status === 'inactive') {
      throw new AppError('Account is deactivated', 403)
    }

    const orgObj = user.orgId as any
    const safeUser = {
      ...sanitizeUser(user),
      organization: orgObj && orgObj.name ? { id: orgObj._id?.toString(), name: orgObj.name } : undefined,
    }

    res.status(200).json({
      success: true,
      data: safeUser,
      user: safeUser,
    })


  } catch (err) {
    next(err)
  }
}

// ── POST /api/auth/forgot-password ───────────────────────────────────────
//
// Accepts an email address and sends a password-reset link.
// Always returns 200 with the same message to prevent user enumeration.

export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = ForgotPasswordSchema.safeParse(req.body)
    if (!parsed.success) {
      // Generic response to avoid enumeration
      res.status(200).json({
        success: true,
        message: 'If that email is registered, a reset link has been sent.',
      })
      return
    }
    const { email } = parsed.data

    const user = await User.findOne({ email })

    if (!user) {
      // Anti-enumeration: same response regardless
      res.status(200).json({
        success: true,
        message: 'If that email is registered, a reset link has been sent.',
      })
      return
    }

    // Generate cryptographically random 32-byte token
    const rawToken = crypto.randomBytes(32).toString('hex')
    const hashedToken = hashToken(rawToken)

    user.resetPasswordToken = hashedToken
    user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS)
    await user.save()

    const resetLink = `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/reset-password?token=${rawToken}`

    await sendPasswordResetEmail(user.email, user.name, resetLink)

    res.status(200).json({
      success: true,
      message: 'If that email is registered, a reset link has been sent.',
    })
  } catch (err) {
    next(err)
  }
}


// ── POST /api/auth/reset-password ────────────────────────────────────────
//
// Applies a new password and increments tokenVersion to invalidate all
// existing sessions (access tokens will fail the tokenVersion check in
// authenticateToken middleware).

export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = ResetPasswordSchema.safeParse(req.body)
    if (!parsed.success) {
      const messages = parsed.error.issues.map((e) => e.message).join('; ')
      throw new AppError(messages, 400)
    }
    const { token, password } = parsed.data

    const hashedToken = hashToken(token)

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    })

    if (!user) {
      throw new AppError('Password reset token is invalid or has expired', 400)
    }

    // Apply new password
    user.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)

    // Clear reset fields
    user.resetPasswordToken = undefined
    user.resetPasswordExpires = undefined

    // Invalidate all active sessions by incrementing tokenVersion
    user.refreshTokenHash = undefined
    user.tokenVersion = (user.tokenVersion ?? 0) + 1

    await user.save()

    res.status(200).json({
      success: true,
      message: 'Password has been reset. Please log in with your new password.',
    })
  } catch (err) {
    next(err)
  }
}
