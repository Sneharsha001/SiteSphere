import { Router } from 'express'
import { authenticateToken, requireRole } from '../middleware/auth'
import {
  createProject,
  listProjects,
  getProject,
  updateProject,
  listProjectAssignments,
} from '../controllers/projectController'

const router = Router()

// All routes require authentication
router.use(authenticateToken)

router.post('/', requireRole('admin'), createProject)
router.get('/', listProjects)
router.get('/:id', getProject)
router.patch('/:id', requireRole('admin'), updateProject)
router.get('/:id/assignments', listProjectAssignments)

export default router
