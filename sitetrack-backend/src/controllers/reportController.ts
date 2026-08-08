import { Request, Response, NextFunction } from 'express'
import mongoose from 'mongoose'
import { DailyProgressReport } from '../models/DailyProgressReport'
import { ReportPhoto } from '../models/ReportPhoto'
import { ProjectAssignment } from '../models/ProjectAssignment'
import { AppError } from '../middleware/errorHandler'
import { uploadBufferToCloudinary } from '../config/cloudinary'
import { getAccessibleProjectIds } from '../utils/projectAccess'

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

// getAccessibleProjectIds is imported from '../utils/projectAccess'

// ── POST /api/reports ─────────────────────────────────────────────────────

export async function createReport(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { role, userId } = req.user!

    // 1. Role enforcement: Site Engineer only
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

    // 2. Validate project assignment
    const assignment = await ProjectAssignment.findOne({
      projectId: parsedProjectId,
      userId: new mongoose.Types.ObjectId(userId),
    })

    if (!assignment) {
      throw new AppError('Access denied: You are not assigned to this project', 403)
    }

    // 3. Duplicate check for engineer + project + date
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

    // 4. Create DailyProgressReport document
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

    // 5. Handle photo uploads via Cloudinary
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
    const { role, userId } = req.user!
    const filter: Record<string, any> = {}

    // 1. Role-based scoping
    if (role === 'site_engineer') {
      filter.engineerId = new mongoose.Types.ObjectId(userId)
    } else {
      // PM or Admin: scope to accessible projects
      const accessibleProjectIds = await getAccessibleProjectIds(req)
      filter.projectId = { $in: accessibleProjectIds }
    }

    // 2. Query param filtering: ?projectId=
    if (req.query.projectId) {
      const qProjectId = parseObjectId(String(req.query.projectId), 'project')
      if (role !== 'site_engineer') {
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

    // Map photos to their corresponding report
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
    const { role, userId } = req.user!

    const report = await DailyProgressReport.findById(reportId)
      .populate('projectId', 'name buildingType location orgId')
      .populate('engineerId', 'name email')
      .lean()

    if (!report) {
      throw new AppError('Daily Progress Report not found', 404)
    }

    // Access control check
    if (role === 'site_engineer') {
      const engineerObjId = (report.engineerId as any)?._id || report.engineerId
      if (!engineerObjId.equals(new mongoose.Types.ObjectId(userId))) {
        throw new AppError('Access denied: You can only view your own progress reports', 403)
      }
    } else {
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
