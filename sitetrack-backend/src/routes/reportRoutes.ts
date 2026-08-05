import { Router } from 'express'
import { authenticateToken, requireRole } from '../middleware/auth'
import { handlePhotoUpload } from '../middleware/upload'
import { validateCreateReport } from '../middleware/reportValidator'
import { createReport, listReports, getReport } from '../controllers/reportController'

const router = Router()

// Protect all report routes with JWT authentication
router.use(authenticateToken)

// POST /api/reports — Site Engineer only
router.post(
  '/',
  requireRole('site_engineer'),
  handlePhotoUpload,
  validateCreateReport,
  createReport
)

// GET /api/reports — list DPRs (scoped by role, filters ?projectId= and ?date=)
router.get('/', listReports)

// GET /api/reports/:id — detail of one DPR with photo URLs
router.get('/:id', getReport)

export default router
