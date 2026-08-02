import { Router } from 'express'
import { login, forgotPassword, resetPassword } from '../controllers/authController'

const router = Router()

// POST /api/auth/login
router.post('/login', login)

// POST /api/auth/forgot-password
router.post('/forgot-password', forgotPassword)

// POST /api/auth/reset-password
router.post('/reset-password', resetPassword)

export default router
