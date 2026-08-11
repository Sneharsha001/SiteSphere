import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { login, forgotPassword, resetPassword } from '../controllers/authController'

const router = Router()

// Strict limiter: 5 attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    status: 429,
    message: "Too many attempts. Please try again in 15 minutes."
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})

// POST /api/auth/login
router.post('/login', authLimiter, login)

// POST /api/auth/forgot-password
router.post('/forgot-password', authLimiter, forgotPassword)

// POST /api/auth/reset-password
router.post('/reset-password', resetPassword)

export default router
