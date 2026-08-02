import { Router } from 'express'
import healthRoutes from './healthRoutes'
import authRoutes from './authRoutes'

const router = Router()

// ── Mount route groups ────────────────────────────────────────────────────
router.use('/health', healthRoutes)
router.use('/auth', authRoutes)

// Future routes go here:
// router.use('/projects', projectRoutes)
// router.use('/users', userRoutes)

export default router

