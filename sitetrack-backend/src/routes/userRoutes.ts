import { Router } from 'express'
import { authenticateToken, requireRole } from '../middleware/auth'
import { createUser, listUsers, toggleUserStatus } from '../controllers/userController'

const router = Router()

// All routes require authentication & admin role
router.use(authenticateToken, requireRole('admin'))

router.get('/', listUsers)
router.post('/', createUser)
router.patch('/:id/status', toggleUserStatus)

export default router

