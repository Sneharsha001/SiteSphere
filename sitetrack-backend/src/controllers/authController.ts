import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { User } from '../models/User'
import { AppError } from '../middleware/errorHandler'

// ── Helpers ───────────────────────────────────────────────────────────────

function signToken(userId: string, orgId: string, role: string): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new AppError('JWT_SECRET is not configured', 500)

  return jwt.sign(
    { userId, orgId, role },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' } as jwt.SignOptions
  )
}

/** Strip sensitive fields before sending to client */
function sanitizeUser(user: InstanceType<typeof User>) {
  const { _id, name, email, role, status, orgId } = user as any
  return { _id, name, email, role, status, orgId }
}

// ── POST /api/auth/login ──────────────────────────────────────────────────

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body as { email?: string; password?: string }

    if (!email || !password) {
      throw new AppError('email and password are required', 400)
    }

    // Find user — we explicitly select passwordHash (it is not excluded by default here,
    // but being explicit makes intent clear for future schema changes)
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash')
    if (!user) {
      // Use a generic message to avoid user-enumeration attacks
      throw new AppError('Invalid email or password', 401)
    }

    if (user.status === 'inactive') {
      throw new AppError('Account is deactivated — contact your administrator', 403)
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash)
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401)
    }

    const token = signToken(
      (user._id as any).toString(),
      user.orgId.toString(),
      user.role
    )

    res.status(200).json({
      success: true,
      token,
      user: sanitizeUser(user),
    })
  } catch (err) {
    next(err)
  }
}

// ── POST /api/auth/forgot-password ───────────────────────────────────────

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body as { email?: string }
    if (!email) throw new AppError('email is required', 400)

    const user = await User.findOne({ email: email.toLowerCase().trim() })

    // Always respond with 200 to avoid email-enumeration
    if (!user) {
      res.status(200).json({
        success: true,
        message: 'If that email exists, a reset link has been sent.',
      })
      return
    }

    // Generate a cryptographically random 32-byte raw token
    const rawToken = crypto.randomBytes(32).toString('hex')

    // Store only the hashed version in the database
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex')

    user.resetPasswordToken = hashedToken
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    await user.save()

    // ── In production this would be sent via email ──────────────────────
    const resetLink = `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/reset-password?token=${rawToken}`
    console.log('─────────────────────────────────────────────')
    console.log('[DEV] Password reset link for', user.email)
    console.log(resetLink)
    console.log('─────────────────────────────────────────────')

    res.status(200).json({
      success: true,
      message: 'If that email exists, a reset link has been sent.',
    })
  } catch (err) {
    next(err)
  }
}

// ── POST /api/auth/reset-password ────────────────────────────────────────

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token, password } = req.body as { token?: string; password?: string }

    if (!token || !password) {
      throw new AppError('token and password are required', 400)
    }

    if (password.length < 8) {
      throw new AppError('New password must be at least 8 characters', 400)
    }

    // Hash the raw token to compare against stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() }, // must not be expired
    })

    if (!user) {
      throw new AppError('Reset token is invalid or has expired', 400)
    }

    // Update password and clear reset fields
    user.passwordHash = await bcrypt.hash(password, 12)
    user.resetPasswordToken = undefined
    user.resetPasswordExpires = undefined
    await user.save()

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. Please log in with your new password.',
    })
  } catch (err) {
    next(err)
  }
}
