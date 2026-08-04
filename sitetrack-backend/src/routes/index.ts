import { Router } from 'express'
import healthRoutes from './healthRoutes'
import authRoutes from './authRoutes'
import projectRoutes from './projectRoutes'
import userRoutes from './userRoutes'
import { createAssignment } from '../controllers/userController'
import { authenticateToken, requireRole } from '../middleware/auth'

const router = Router()

// ── Mount route groups ────────────────────────────────────────────────────
router.use('/health', healthRoutes)
router.use('/auth', authRoutes)
router.use('/projects', projectRoutes)
router.use('/users', userRoutes)

// Direct route for project assignments
router.post('/project-assignments', authenticateToken, requireRole('admin'), createAssignment)

export default router
