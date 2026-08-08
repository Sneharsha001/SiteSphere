import { Request, Response, NextFunction } from 'express'
import mongoose from 'mongoose'
import { DailyProgressReport } from '../models/DailyProgressReport'
import { Project } from '../models/Project'
import { AppError } from '../middleware/errorHandler'
import { getAccessibleProjectIds } from '../utils/projectAccess'

// ── Helpers ───────────────────────────────────────────────────────────────

function parseObjectId(id: string, label: string): mongoose.Types.ObjectId {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(`Invalid ${label} ID format`, 400)
  }
  return new mongoose.Types.ObjectId(id)
}

/**
 * Returns the UTC start-of-day for a given date (sets H/M/S/ms to 0).
 * Used for startDate boundary in feed filters.
 */
function startOfDay(d: Date): Date {
  const out = new Date(d)
  out.setUTCHours(0, 0, 0, 0)
  return out
}

/**
 * Returns the UTC end-of-day for a given date (sets H/M/S/ms to max).
 * Used for endDate boundary in feed filters.
 */
function endOfDay(d: Date): Date {
  const out = new Date(d)
  out.setUTCHours(23, 59, 59, 999)
  return out
}

// ── GET /api/dashboard/feed ───────────────────────────────────────────────
//
// Returns DPRs across all projects accessible to the logged-in PM/Admin.
// Supports optional query filters:
//   ?projectId=<id>           — narrow to a single project
//   ?startDate=<ISO date>     — include only reports on or after this date
//   ?endDate=<ISO date>       — include only reports on or before this date
// Sorted by date descending (most recent first).
// Restricted to role pm | admin (enforced in the router via requireRole).

export async function getDashboardFeed(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 1. Determine the set of project IDs this user may see
    const accessibleProjectIds = await getAccessibleProjectIds(req)

    const filter: Record<string, any> = {
      projectId: { $in: accessibleProjectIds },
    }

    // 2. Optional ?projectId= filter — validate it is within accessible scope
    if (req.query.projectId) {
      const requestedId = parseObjectId(String(req.query.projectId), 'project')
      const isAccessible = accessibleProjectIds.some((id) =>
        id.equals(requestedId)
      )
      if (!isAccessible) {
        throw new AppError('You do not have access to this project', 403)
      }
      filter.projectId = requestedId
    }

    // 3. Optional ?startDate= / ?endDate= date range filter
    if (req.query.startDate || req.query.endDate) {
      const dateFilter: Record<string, Date> = {}
      if (req.query.startDate) {
        dateFilter.$gte = startOfDay(new Date(String(req.query.startDate)))
      }
      if (req.query.endDate) {
        dateFilter.$lte = endOfDay(new Date(String(req.query.endDate)))
      }
      filter.date = dateFilter
    }

    // 4. Fetch and return DPRs, most recent first
    const reports = await DailyProgressReport.find(filter)
      .populate('projectId', 'name buildingType location')
      .populate('engineerId', 'name email')
      .sort({ date: -1, createdAt: -1 })
      .lean()

    res.status(200).json({
      success: true,
      count: reports.length,
      data: reports,
    })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/dashboard/kpis ───────────────────────────────────────────────
//
// Returns aggregate stats for all projects accessible to the logged-in PM/Admin:
//   - reportsThisWeek  : DPRs submitted since Monday of the current week (UTC)
//   - reportsThisMonth : DPRs submitted since the 1st of the current month (UTC)
//   - openIssues       : DPRs in the last 7 days where the "issues" field is non-empty
//   - activeProjects   : count of projects with status === "active"
// Restricted to role pm | admin (enforced in the router via requireRole).

export async function getDashboardKpis(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 1. Scope: project IDs this user may see
    const accessibleProjectIds = await getAccessibleProjectIds(req)

    const now = new Date()

    // 2. Compute UTC date boundaries
    // Start of the current week: Monday 00:00:00 UTC
    const dayOfWeek = now.getUTCDay() // 0 = Sun, 1 = Mon, …, 6 = Sat
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const startOfWeek = new Date(now)
    startOfWeek.setUTCDate(now.getUTCDate() - daysFromMonday)
    startOfWeek.setUTCHours(0, 0, 0, 0)

    // Start of the current month: 1st at 00:00:00 UTC
    const startOfMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)
    )

    // 7 days ago at 00:00:00 UTC
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setUTCDate(now.getUTCDate() - 7)
    sevenDaysAgo.setUTCHours(0, 0, 0, 0)

    const projectFilter = { projectId: { $in: accessibleProjectIds } }

    // 3. Run all four counts in parallel for efficiency
    const [reportsThisWeek, reportsThisMonth, openIssues, activeProjects] =
      await Promise.all([
        // DPRs submitted on or after Monday of this week
        DailyProgressReport.countDocuments({
          ...projectFilter,
          date: { $gte: startOfWeek },
        }),

        // DPRs submitted on or after 1st of this month
        DailyProgressReport.countDocuments({
          ...projectFilter,
          date: { $gte: startOfMonth },
        }),

        // DPRs in the last 7 days where "issues" is non-empty
        DailyProgressReport.countDocuments({
          ...projectFilter,
          date: { $gte: sevenDaysAgo },
          issues: { $exists: true, $nin: [null, ''] },
        }),

        // Active projects within this user's scope
        Project.countDocuments({
          _id: { $in: accessibleProjectIds },
          status: 'active',
        }),
      ])

    res.status(200).json({
      success: true,
      data: {
        reportsThisWeek,
        reportsThisMonth,
        openIssues,
        activeProjects,
      },
    })
  } catch (err) {
    next(err)
  }
}
