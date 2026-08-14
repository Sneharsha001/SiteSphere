import { Request, Response, NextFunction } from 'express'
import mongoose from 'mongoose'
import { DailyProgressReport } from '../models/DailyProgressReport'
import { ReportPhoto } from '../models/ReportPhoto'
import { ProjectAssignment } from '../models/ProjectAssignment'
import { AppError } from '../middleware/errorHandler'
import { uploadBufferToCloudinary } from '../config/cloudinary'
import { getAccessibleProjectIds } from '../utils/projectAccess'
import { sendEmail, buildNewDprEmailHtml } from '../utils/email'
import { User } from '../models/User'
import { Project } from '../models/Project'
import { AuditLog } from '../models/AuditLog'

// ── Helpers ───────────────────────────────────────────────────────────────

function parseObjectId(id: string, label: string): mongoose.Types.ObjectId {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(`Invalid ${label} ID format`, 400)
  }
  return new mongoose.Types.ObjectId(id)
}

function getStartAndEndOfDay(dateInput: string | Date): { startOfDay: Date; endOfDay: Date } {
  const d = new Date(dateInput)
  const startOfDay = new Date(d)
  startOfDay.setUTCHours(0, 0, 0, 0)
  const endOfDay = new Date(d)
  endOfDay.setUTCHours(23, 59, 59, 999)
  return { startOfDay, endOfDay }
}

/**
 * Looks up a DPR and verifies it belongs to the authenticated user's org
 * by tracing DPR → Project → orgId.
 *
 * Returns the report document. Throws 404 if not found or 403 if the project
 * belongs to a different org.
 *
 * Using a generic "not found" message for cross-org IDs prevents information
 * leakage (an attacker shouldn't learn whether a resource ID exists at all).
 */
async function findReportInOrg(
  reportId: mongoose.Types.ObjectId,
  orgId: string
): Promise<InstanceType<typeof DailyProgressReport>> {
  const report = await DailyProgressReport.findById(reportId)
  if (!report) {
    throw new AppError('Daily Progress Report not found', 404)
  }

  // Verify the project this DPR belongs to is owned by the caller's org
  const project = await Project.findOne({
    _id: report.projectId,
    orgId,
  }).lean()

  if (!project) {
    // Return 404 (not 403) to avoid leaking that the resource exists
    throw new AppError('Daily Progress Report not found', 404)
  }

  return report
}

// ── POST /api/reports ─────────────────────────────────────────────────────

export async function createReport(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { role, userId, orgId } = req.user!

    // 1. Role enforcement: Site Engineer only (belt-and-suspenders; route also uses requireRole)
    if (role !== 'site_engineer') {
      throw new AppError('Only Site Engineers are allowed to submit Daily Progress Reports', 403)
    }

    const {
      projectId,
      date,
      workDone,
      quantity,
      labourSkilled,
      labourUnskilled,
      labourOperators,
      tomorrowPlan,
      issues,
      remarks,
    } = req.body

    const parsedProjectId = parseObjectId(projectId, 'project')

    // 2. Verify the project exists AND belongs to the user's org.
    //    Never trust projectId from the request body without an org check.
    const project = await Project.findOne({ _id: parsedProjectId, orgId }).lean()
    if (!project) {
      throw new AppError('Project not found', 404)
    }

    // 3. Validate project assignment (engineer must be assigned to this project)
    const assignment = await ProjectAssignment.findOne({
      projectId: parsedProjectId,
      userId: new mongoose.Types.ObjectId(userId),
    })

    if (!assignment) {
      throw new AppError('Access denied: You are not assigned to this project', 403)
    }

    // 4. Duplicate check for engineer + project + date
    const reportDate = new Date(date)
    const { startOfDay, endOfDay } = getStartAndEndOfDay(reportDate)

    const existingReport = await DailyProgressReport.findOne({
      projectId: parsedProjectId,
      engineerId: new mongoose.Types.ObjectId(userId),
      date: { $gte: startOfDay, $lte: endOfDay },
    })

    if (existingReport) {
      throw new AppError(
        'A Daily Progress Report already exists for this project on this date. Please edit the existing report instead.',
        400
      )
    }

    // 5. Create DailyProgressReport document
    const report = await DailyProgressReport.create({
      projectId: parsedProjectId,
      engineerId: new mongoose.Types.ObjectId(userId),
      date: reportDate,
      workDone,
      quantity: quantity || undefined,
      labourSkilled: Number(labourSkilled) || 0,
      labourUnskilled: Number(labourUnskilled) || 0,
      labourOperators: Number(labourOperators) || 0,
      tomorrowPlan: tomorrowPlan || undefined,
      issues: issues || undefined,
      remarks: remarks || undefined,
      syncStatus: 'synced',
    })

    // 6. Handle photo uploads via Cloudinary
    const files = (req.files as Express.Multer.File[]) || []
    const photoDocs = []

    for (const file of files) {
      const fileUrl = await uploadBufferToCloudinary(file.buffer, 'sitetrack/dpr_photos')
      const photoDoc = await ReportPhoto.create({
        reportId: report._id,
        fileUrl,
        timestamp: new Date(),
      })
      photoDocs.push(photoDoc)
    }

    // 7. Send Email Notifications to Project Managers
    try {
      const allAssignments = await ProjectAssignment.find({
        projectId: parsedProjectId,
      })
        .select('userId')
        .lean()

      if (allAssignments.length === 0) {
        console.warn(`⚠️ No users assigned to project ${projectId}; skipping email notification.`)
      } else {
        const assignedUserIds = allAssignments.map((a) => a.userId)

        // Only notify PMs in the same org (belt-and-suspenders)
        const pms = await User.find({
          _id: { $in: assignedUserIds },
          orgId,
          role: 'pm',
          status: 'active',
        }).lean()

        if (pms.length === 0) {
          console.warn(`⚠️ No active PM found among users assigned to project ${projectId}; skipping email.`)
        } else {
          const engineer = await User.findById(userId).lean()

          const projectName = project.name || 'Unknown Project'
          const engName = engineer?.name || 'Unknown Engineer'
          const dateStr = reportDate.toISOString().split('T')[0]
          const labourTotal =
            (Number(labourSkilled) || 0) +
            (Number(labourUnskilled) || 0) +
            (Number(labourOperators) || 0)

          const subject = `New Daily Progress Report — ${projectName} — ${dateStr}`
          const workDoneExcerpt = workDone.length > 200 ? workDone.substring(0, 200) + '…' : workDone

          const html = buildNewDprEmailHtml({
            projectName,
            engineerName: engName,
            dateStr,
            workDoneExcerpt,
            issues: issues || undefined,
            tomorrowPlan: tomorrowPlan || undefined,
            labourTotal,
            photoCount: photoDocs.length,
          })

          const pmEmails = pms.map((pm) => pm.email)
          console.log(`📧 Sending DPR notification to PM(s): ${pmEmails.join(', ')}`)

          await sendEmail(pmEmails, subject, html)
        }
      }
    } catch (emailErr) {
      console.warn('⚠️ Unexpected error during email notification process:', emailErr)
    }

    res.status(201).json({
      success: true,
      message: 'Daily Progress Report created successfully',
      data: {
        ...report.toObject(),
        photos: photoDocs,
      },
    })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/reports ──────────────────────────────────────────────────────

export async function listReports(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { role, userId, orgId } = req.user!
    const filter: Record<string, any> = {}

    // 1. Role-based scoping — always org-bounded
    if (role === 'site_engineer') {
      // Scope to engineer's own reports, but only for projects in their org.
      // Get all project IDs in this org that this engineer is assigned to.
      const assignments = await ProjectAssignment.find({
        userId: new mongoose.Types.ObjectId(userId),
      })
        .select('projectId')
        .lean()

      const assignedProjectIds = assignments.map((a) => a.projectId)

      // Intersect with org-owned projects to enforce org boundary at DB level
      const orgProjects = await Project.find({
        _id: { $in: assignedProjectIds },
        orgId,
      })
        .select('_id')
        .lean()

      const orgProjectIds = orgProjects.map((p) => p._id)

      filter.engineerId = new mongoose.Types.ObjectId(userId)
      filter.projectId = { $in: orgProjectIds }
    } else {
      // PM or Admin: scope to accessible projects (org-bounded in getAccessibleProjectIds)
      const accessibleProjectIds = await getAccessibleProjectIds(req)
      filter.projectId = { $in: accessibleProjectIds }
    }

    // 2. Query param filtering: ?projectId=
    if (req.query.projectId) {
      const qProjectId = parseObjectId(String(req.query.projectId), 'project')
      if (role === 'site_engineer') {
        // Verify the requested project is in the filter's allowed set
        const allowed = (filter.projectId as { $in: mongoose.Types.ObjectId[] }).$in
        const isAccessible = allowed.some((id) => id.equals(qProjectId))
        if (!isAccessible) {
          throw new AppError('You do not have access to this project', 403)
        }
      } else {
        const accessibleIds = await getAccessibleProjectIds(req)
        const isAccessible = accessibleIds.some((id) => id.equals(qProjectId))
        if (!isAccessible) {
          throw new AppError('You do not have access to this project', 403)
        }
      }
      filter.projectId = qProjectId
    }

    // 3. Query param filtering: ?date=
    if (req.query.date) {
      const { startOfDay, endOfDay } = getStartAndEndOfDay(String(req.query.date))
      filter.date = { $gte: startOfDay, $lte: endOfDay }
    }

    // 4. Fetch reports sorted by date descending
    const reports = await DailyProgressReport.find(filter)
      .populate('projectId', 'name buildingType location')
      .populate('engineerId', 'name email')
      .sort({ date: -1, createdAt: -1 })
      .lean()

    // 5. Fetch photos for all returned reports
    const reportIds = reports.map((r) => r._id)
    const photos = await ReportPhoto.find({ reportId: { $in: reportIds } }).lean()

    const photosByReportId: Record<string, any[]> = {}
    photos.forEach((photo) => {
      const key = photo.reportId.toString()
      if (!photosByReportId[key]) photosByReportId[key] = []
      photosByReportId[key].push(photo)
    })

    const reportsWithPhotos = reports.map((report) => ({
      ...report,
      photos: photosByReportId[report._id.toString()] || [],
    }))

    res.status(200).json({
      success: true,
      count: reportsWithPhotos.length,
      data: reportsWithPhotos,
    })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/reports/:id ──────────────────────────────────────────────────

export async function getReport(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const reportId = parseObjectId(req.params.id as string, 'report')
    const { role, userId, orgId } = req.user!

    // findReportInOrg: verifies DPR exists and DPR→project→orgId matches caller
    const report = await DailyProgressReport.findById(reportId)
      .populate<{ projectId: { _id: mongoose.Types.ObjectId; name: string; buildingType?: string; location?: string; orgId: mongoose.Types.ObjectId } }>('projectId', 'name buildingType location orgId')
      .populate('engineerId', 'name email')
      .lean()

    if (!report) {
      throw new AppError('Daily Progress Report not found', 404)
    }

    // Org isolation check — applies to ALL roles
    const projectOrgId = (report.projectId as any)?.orgId?.toString()
    if (projectOrgId !== orgId) {
      // Return 404 to avoid leaking that the resource exists in another org
      throw new AppError('Daily Progress Report not found', 404)
    }

    // Role-specific access control (beyond org boundary)
    if (role === 'site_engineer') {
      // Engineers can only read their own reports
      const engineerObjId = (report.engineerId as any)?._id || report.engineerId
      if (!engineerObjId.equals(new mongoose.Types.ObjectId(userId))) {
        throw new AppError('Access denied: You can only view your own progress reports', 403)
      }
    } else {
      // PM or Admin: verify the project is within their accessible scope
      const accessibleProjectIds = await getAccessibleProjectIds(req)
      const projectObjId = (report.projectId as any)?._id || report.projectId
      const hasAccess = accessibleProjectIds.some((id) => id.equals(projectObjId))
      if (!hasAccess) {
        throw new AppError('Access denied: You do not have access to this report', 403)
      }
    }

    // Fetch photos
    const photos = await ReportPhoto.find({ reportId }).lean()

    res.status(200).json({
      success: true,
      data: {
        ...report,
        photos,
      },
    })
  } catch (err) {
    next(err)
  }
}

// ── PATCH /api/reports/:id (Site Engineer Edit) ───────────────────────────

export async function updateReport(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const reportId = parseObjectId(req.params.id as string, 'report')
    const { role, userId, orgId } = req.user!

    if (role !== 'site_engineer') {
      throw new AppError('Only Site Engineers can use this endpoint', 403)
    }

    // findReportInOrg: fetches report and verifies it belongs to caller's org
    const report = await findReportInOrg(reportId, orgId)

    // Engineer can only edit their own reports
    if (!report.engineerId.equals(new mongoose.Types.ObjectId(userId))) {
      throw new AppError('Access denied: You can only edit your own progress reports', 403)
    }

    // 24-hour edit window
    const now = Date.now()
    const createdAtMs = report.createdAt.getTime()
    const windowMs = 24 * 60 * 60 * 1000

    if (now - createdAtMs > windowMs) {
      throw new AppError(
        'This report is older than 24 hours and cannot be edited directly. Contact an Admin to request a change.',
        403
      )
    }

    const {
      workDone,
      quantity,
      labourSkilled,
      labourUnskilled,
      labourOperators,
      tomorrowPlan,
      issues,
      remarks,
    } = req.body

    const changes: Record<string, any> = {}
    const updatePayload: Record<string, any> = {}

    const fieldsToUpdate = [
      'workDone', 'quantity', 'labourSkilled', 'labourUnskilled',
      'labourOperators', 'tomorrowPlan', 'issues', 'remarks',
    ]

    for (const field of fieldsToUpdate) {
      if (req.body[field] !== undefined) {
        let newVal = req.body[field]
        if (['labourSkilled', 'labourUnskilled', 'labourOperators'].includes(field)) {
          newVal = Number(newVal) || 0
        }
        const oldVal = (report as any)[field]
        if (oldVal !== newVal) {
          changes[field] = { before: oldVal, after: newVal }
          updatePayload[field] = newVal
        }
      }
    }

    // Handle photo uploads if any
    const files = (req.files as Express.Multer.File[]) || []
    const photoDocs = []

    if (files.length > 0) {
      const existingPhotosCount = await ReportPhoto.countDocuments({ reportId: report._id })
      if (existingPhotosCount + files.length > 5) {
        throw new AppError(
          `Upload limit exceeded: A report can have at most 5 photos. (Already has ${existingPhotosCount})`,
          400
        )
      }

      for (const file of files) {
        const fileUrl = await uploadBufferToCloudinary(file.buffer, 'sitetrack/dpr_photos')
        const photoDoc = await ReportPhoto.create({
          reportId: report._id,
          fileUrl,
          timestamp: new Date(),
        })
        photoDocs.push(photoDoc)
      }
      changes.photos = { added: photoDocs.map((p) => p.fileUrl) }
    }

    if (Object.keys(changes).length === 0) {
      res.status(200).json({ success: true, message: 'No changes detected' })
      return
    }

    Object.assign(report, updatePayload)
    report.editedAt = new Date()
    await report.save()

    await AuditLog.create({
      entity: 'DailyProgressReport',
      entityId: report._id,
      action: 'engineer_edit',
      changedBy: new mongoose.Types.ObjectId(userId),
      changes,
    })

    const allPhotos = await ReportPhoto.find({ reportId: report._id }).lean()

    res.status(200).json({
      success: true,
      message: 'Daily Progress Report updated successfully',
      data: {
        ...report.toObject(),
        photos: allPhotos,
      },
    })
  } catch (err) {
    next(err)
  }
}

// ── PATCH /api/reports/:id/admin-edit ─────────────────────────────────────

export async function adminUpdateReport(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const reportId = parseObjectId(req.params.id as string, 'report')
    const { userId, orgId } = req.user! // requireRole('admin') handles role check in router

    // findReportInOrg: fetches report and verifies it belongs to admin's org.
    // Without this, an admin from Org A could admin-edit a DPR from Org B.
    const report = await findReportInOrg(reportId, orgId)

    const {
      workDone,
      quantity,
      labourSkilled,
      labourUnskilled,
      labourOperators,
      tomorrowPlan,
      issues,
      remarks,
    } = req.body

    const changes: Record<string, any> = {}
    const updatePayload: Record<string, any> = {}

    const fieldsToUpdate = [
      'workDone', 'quantity', 'labourSkilled', 'labourUnskilled',
      'labourOperators', 'tomorrowPlan', 'issues', 'remarks',
    ]

    for (const field of fieldsToUpdate) {
      if (req.body[field] !== undefined) {
        let newVal = req.body[field]
        if (['labourSkilled', 'labourUnskilled', 'labourOperators'].includes(field)) {
          newVal = Number(newVal) || 0
        }
        const oldVal = (report as any)[field]
        if (oldVal !== newVal) {
          changes[field] = { before: oldVal, after: newVal }
          updatePayload[field] = newVal
        }
      }
    }

    // Handle photo uploads if any
    const files = (req.files as Express.Multer.File[]) || []
    const photoDocs = []

    if (files.length > 0) {
      const existingPhotosCount = await ReportPhoto.countDocuments({ reportId: report._id })
      if (existingPhotosCount + files.length > 5) {
        throw new AppError(
          `Upload limit exceeded: A report can have at most 5 photos. (Already has ${existingPhotosCount})`,
          400
        )
      }

      for (const file of files) {
        const fileUrl = await uploadBufferToCloudinary(file.buffer, 'sitetrack/dpr_photos')
        const photoDoc = await ReportPhoto.create({
          reportId: report._id,
          fileUrl,
          timestamp: new Date(),
        })
        photoDocs.push(photoDoc)
      }
      changes.photos = { added: photoDocs.map((p) => p.fileUrl) }
    }

    if (Object.keys(changes).length === 0) {
      res.status(200).json({ success: true, message: 'No changes detected' })
      return
    }

    Object.assign(report, updatePayload)
    report.editedAt = new Date()
    await report.save()

    await AuditLog.create({
      entity: 'DailyProgressReport',
      entityId: report._id,
      action: 'admin_edit_after_window',
      changedBy: new mongoose.Types.ObjectId(userId),
      changes,
    })

    const allPhotos = await ReportPhoto.find({ reportId: report._id }).lean()

    res.status(200).json({
      success: true,
      message: 'Daily Progress Report administratively updated successfully',
      data: {
        ...report.toObject(),
        photos: allPhotos,
      },
    })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/reports/:id/audit ─────────────────────────────────────────────

export async function getReportAudit(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const reportId = parseObjectId(req.params.id as string, 'report')
    const { orgId } = req.user! // requireRole('admin') handles role check in router

    // Verify report exists and belongs to admin's org before returning audit data.
    // Without this, an admin from Org A could read audit logs for Org B's DPRs.
    await findReportInOrg(reportId, orgId)

    const auditLogs = await AuditLog.find({
      entity: 'DailyProgressReport',
      entityId: reportId,
    })
      .populate('changedBy', 'name email role')
      .sort({ changedAt: -1 })
      .lean()

    res.status(200).json({
      success: true,
      data: auditLogs,
    })
  } catch (err) {
    next(err)
  }
}
