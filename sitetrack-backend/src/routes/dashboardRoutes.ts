import { Router } from 'express'
import { authenticateToken, requireRole } from '../middleware/auth'
import { getDashboardFeed, getDashboardKpis } from '../controllers/dashboardController'

const router = Router()

// Both routes are restricted to PM and Admin only.
// A site_engineer will receive a 403 Forbidden from the requireRole middleware.

// GET /api/dashboard/feed
// Returns DPRs across all accessible projects (PM: assigned; Admin: all in org).
// Optional filters: ?projectId=, ?startDate=, ?endDate=
router.get(
  '/feed',
  authenticateToken,
  requireRole('pm', 'admin'),
  getDashboardFeed
)

// GET /api/dashboard/kpis
// Returns aggregate counts: reportsThisWeek, reportsThisMonth, openIssues, activeProjects.
router.get(
  '/kpis',
  authenticateToken,
  requireRole('pm', 'admin'),
  getDashboardKpis
)

export default router
