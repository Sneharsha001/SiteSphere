/**
 * src/routes/authRoutes.ts
 *
 * Route definitions for all /api/auth/* endpoints.
 *
 * Rate limiting strategy:
 *   authLimiter  — 10 req / 15 min / IP (login, register, forgot-password, reset-password)
 *   refreshLimiter — 30 req / 5 min / IP (refresh — called silently by the client)
 *
 * /logout and /me are intentionally not rate-limited:
 *   - logout is idempotent and low-cost
 *   - /me is protected by authenticateToken and typical usage is low-frequency
 */

import { Router } from 'express'
import rateLimit from 'express-rate-limit'

import {
  register,
  login,
  verifyEmail,
  refresh,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
} from '../controllers/authController'
import { authenticateToken } from '../middleware/auth'

const router = Router()

// ── Strict rate limiter: login / register / password-reset ────────────────
const isTest = process.env['NODE_ENV'] === 'test'

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 10_000 : 10, // effectively unlimited during tests
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    status: 429,
    message: 'Too many attempts — please try again in 15 minutes.',
  },
})

// ── Lenient limiter: token refresh (called automatically by the frontend) ─
const refreshLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: isTest ? 10_000 : 30, // effectively unlimited during tests
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    status: 429,
    message: 'Too many refresh requests — please wait a moment.',
  },
})


// ── Public endpoints ──────────────────────────────────────────────────────

// POST /api/auth/register — public self-registration (creates org + admin user)
router.post('/register', authLimiter, register)

// POST /api/auth/verify-email — verify user email address
router.post('/verify-email', authLimiter, verifyEmail)

// POST /api/auth/login
router.post('/login', authLimiter, login)


// POST /api/auth/refresh — uses HttpOnly cookie; no body required
router.post('/refresh', refreshLimiter, refresh)

// POST /api/auth/logout — clears cookie; no auth required (cookie itself is the credential)
router.post('/logout', logout)

// POST /api/auth/forgot-password
router.post('/forgot-password', authLimiter, forgotPassword)

// POST /api/auth/reset-password
router.post('/reset-password', authLimiter, resetPassword)

// ── Protected endpoints ───────────────────────────────────────────────────

// GET /api/auth/me — returns safe profile of the current user
router.get('/me', authenticateToken, getMe)

export default router
