import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { AppError } from './errorHandler'

import { User } from '../models/User'

// ── JWT payload shape ─────────────────────────────────────────────────────

export interface JwtPayload {
  userId: string
  orgId: string
  role: 'admin' | 'pm' | 'site_engineer'
  tokenVersion?: number
}

// ── Extend Express Request to carry decoded user ──────────────────────────

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

// ── Helper: extract and verify token ─────────────────────────────────────

function extractToken(req: Request): string {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('No token provided — please include Authorization: Bearer <token>', 401)
  }
  return authHeader.slice(7)
}

// ── Middleware: authenticateToken ─────────────────────────────────────────

export async function authenticateToken(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractToken(req)
    const secret = process.env.JWT_SECRET
    if (!secret) {
      throw new AppError('JWT_SECRET is not configured on the server', 500)
    }

    const decoded = jwt.verify(token, secret) as JwtPayload

    // Validate account status and session token version against DB
    const user = await User.findById(decoded.userId).select('status tokenVersion')
    if (!user || user.status === 'inactive') {
      throw new AppError('Account is deactivated or invalid', 401)
    }
    if (decoded.tokenVersion !== undefined && user.tokenVersion !== decoded.tokenVersion) {
      throw new AppError('Session has expired or was revoked — please log in again', 401)
    }

    req.user = decoded
    next()
  } catch (err) {
    if (err instanceof AppError) {
      next(err)
      return
    }
    if (err instanceof jwt.TokenExpiredError) {
      next(new AppError('Token has expired — please log in again', 401))
      return
    }
    if (err instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid token — please log in again', 401))
      return
    }
    next(err)
  }
}


// ── Middleware: requireRole ───────────────────────────────────────────────
//
// Usage: router.get('/admin-only', authenticateToken, requireRole('admin'), handler)

export function requireRole(...roles: Array<'admin' | 'pm' | 'site_engineer'>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Not authenticated', 401))
      return
    }
    if (!roles.includes(req.user.role)) {
      next(
        new AppError(
          `Access denied — required role(s): ${roles.join(', ')}. Your role: ${req.user.role}`,
          403
        )
      )
      return
    }
    next()
  }
}
