import { Router } from 'express'
import healthRoutes from './healthRoutes'

const router = Router()

// ── Mount route groups ────────────────────────────────────────────────────
router.use('/health', healthRoutes)

// Future routes go here:
// router.use('/auth', authRoutes)
// router.use('/projects', projectRoutes)
// router.use('/users', userRoutes)

export default router
