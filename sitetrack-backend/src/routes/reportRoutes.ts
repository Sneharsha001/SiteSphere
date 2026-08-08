import { Router } from 'express'
import { authenticateToken, requireRole } from '../middleware/auth'
import { handlePhotoUpload } from '../middleware/upload'
import { validateCreateReport } from '../middleware/reportValidator'
import { 
  createReport, 
  listReports, 
  getReport,
  updateReport,
  adminUpdateReport,
  getReportAudit
} from '../controllers/reportController'
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

// PATCH /api/reports/:id — Site Engineer edits their own DPR (within 24 hours)
router.patch('/:id', requireRole('site_engineer'), handlePhotoUpload, updateReport)

// PATCH /api/reports/:id/admin-edit — Admin override edit (any time)
router.patch('/:id/admin-edit', requireRole('admin'), handlePhotoUpload, adminUpdateReport)

// GET /api/reports/:id/audit — Admin views audit history
router.get('/:id/audit', requireRole('admin'), getReportAudit)

export default router
