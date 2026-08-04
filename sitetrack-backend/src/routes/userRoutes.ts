import { Router } from 'express'
import { authenticateToken, requireRole } from '../middleware/auth'
import { createUser, listUsers } from '../controllers/userController'

const router = Router()

// All routes require authentication & admin role
router.use(authenticateToken, requireRole('admin'))

router.post('/', createUser)
router.get('/', listUsers)

export default router
