import { Request, Response, NextFunction } from 'express'
import mongoose from 'mongoose'
import { Project } from '../models/Project'
import { ProjectAssignment } from '../models/ProjectAssignment'
import { AppError } from '../middleware/errorHandler'

// ── Helpers ───────────────────────────────────────────────────────────────

/** IDs of projects the current user is directly assigned to */
async function assignedProjectIds(userId: string): Promise<mongoose.Types.ObjectId[]> {
  const assignments = await ProjectAssignment.find({ userId }).select('projectId').lean()
  return assignments.map((a) => a.projectId)
}

/** Build a base query scoped to the user's org (and assignments for non-admins) */
async function buildProjectQuery(req: Request) {
  const { orgId, role, userId } = req.user!
  const baseFilter: Record<string, unknown> = { orgId }

  if (role !== 'admin') {
    const ids = await assignedProjectIds(userId)
    baseFilter._id = { $in: ids }
  }

  return baseFilter
}

/** Extract and validate a MongoDB ObjectId from route params */
function parseObjectId(id: string, label: string): mongoose.Types.ObjectId {
  if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(`Invalid ${label} ID format`, 400)
  }
  return new mongoose.Types.ObjectId(id)
}

// ── POST /api/projects ────────────────────────────────────────────────────

export async function createProject(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name, location, startDate, buildingType, status } = req.body as Record<
      string,
      unknown
    >

    if (!name) throw new AppError('name is required', 400)
    if (!buildingType) throw new AppError('buildingType is required', 400)

    const project = await Project.create({
      orgId: req.user!.orgId,
      name: String(name),
      location: location ? String(location) : undefined,
      startDate: startDate ? new Date(String(startDate)) : undefined,
      buildingType: buildingType as any,
      status: status ? (status as any) : 'active',
      createdBy: req.user!.userId,
    })

    res.status(201).json({ success: true, data: project })
  } catch (err: unknown) {
    // Translate Mongoose validation errors (e.g. invalid buildingType enum) into 400
    if ((err as any)?.name === 'ValidationError') {
      const messages = Object.values((err as any).errors)
        .map((e: any) => e.message)
        .join('; ')
      next(new AppError(messages, 400))
      return
    }
    next(err)
  }
}

// ── GET /api/projects ─────────────────────────────────────────────────────

export async function listProjects(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const filter = await buildProjectQuery(req)
    const projects = await Project.find(filter).sort({ createdAt: -1 }).lean()

    res.status(200).json({ success: true, count: projects.length, data: projects })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/projects/:id ─────────────────────────────────────────────────

export async function getProject(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const projectId = parseObjectId(req.params.id as string, 'project')
    const filter = await buildProjectQuery(req)

    const project = await Project.findOne({ ...filter, _id: projectId }).lean()
    if (!project) {
      throw new AppError('Project not found or you do not have access to it', 404)
    }

    res.status(200).json({ success: true, data: project })
  } catch (err) {
    next(err)
  }
}

// ── PATCH /api/projects/:id ───────────────────────────────────────────────

export async function updateProject(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const projectId = parseObjectId(req.params.id as string, 'project')

    // Admins can only update projects within their own org
    const project = await Project.findOne({ _id: projectId, orgId: req.user!.orgId })
    if (!project) throw new AppError('Project not found', 404)

    const { name, location, startDate, buildingType, status } = req.body as Record<
      string,
      unknown
    >

    if (name !== undefined) project.name = name as string
    if (location !== undefined) project.location = location as string
    if (startDate !== undefined) project.startDate = new Date(startDate as string)
    if (buildingType !== undefined) project.buildingType = buildingType as any
    if (status !== undefined) project.status = status as any

    await project.save() // triggers schema validation including buildingType enum

    res.status(200).json({ success: true, data: project })
  } catch (err: unknown) {
    if ((err as any)?.name === 'ValidationError') {
      const messages = Object.values((err as any).errors)
        .map((e: any) => e.message)
        .join('; ')
      next(new AppError(messages, 400))
      return
    }
    next(err)
  }
}

// ── GET /api/projects/:id/assignments ─────────────────────────────────────

export async function listProjectAssignments(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const projectId = parseObjectId(req.params.id as string, 'project')

    // Verify the project belongs to the user's org
    const project = await Project.findOne({ _id: projectId, orgId: req.user!.orgId }).lean()
    if (!project) throw new AppError('Project not found', 404)

    const assignments = await ProjectAssignment.find({ projectId })
      .populate('userId', 'name email role status')
      .lean()

    res.status(200).json({ success: true, count: assignments.length, data: assignments })
  } catch (err) {
    next(err)
  }
}
