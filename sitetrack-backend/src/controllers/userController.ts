import { Request, Response, NextFunction } from 'express'

import bcrypt from 'bcrypt'
import { User } from '../models/User'
import { Project } from '../models/Project'
import { ProjectAssignment } from '../models/ProjectAssignment'
import mongoose from 'mongoose'
import { AppError } from '../middleware/errorHandler'
import { validatePasswordStrength } from '../utils/passwordValidation'

/** Strip sensitive fields before sending user data */
function sanitizeUser(user: any) {
  return {
    _id: user._id,
    orgId: user.orgId,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

// ── POST /api/users ───────────────────────────────────────────────────────

export async function createUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name, email, password, role } = req.body as {
      name?: string
      email?: string
      password?: string
      role?: 'admin' | 'pm' | 'site_engineer'
    }

    if (!name || !email || !password || !role) {
      throw new AppError('name, email, password, and role are required', 400)
    }

    const allowedRoles = ['admin', 'pm', 'site_engineer']
    if (!allowedRoles.includes(role)) {
      throw new AppError(`Invalid role. Allowed roles: ${allowedRoles.join(', ')}`, 400)
    }

    const passCheck = validatePasswordStrength(password)
    if (!passCheck.isValid) {
      throw new AppError(passCheck.error || 'Password does not meet complexity requirements', 400)
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() })
    if (existingUser) {
      throw new AppError('A user with this email already exists', 400)
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await User.create({
      orgId: req.user!.orgId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role,
      status: 'active',
    })

    res.status(201).json({
      success: true,
      data: sanitizeUser(user),
    })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/users ────────────────────────────────────────────────────────

export async function listUsers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const users = await User.find({ orgId: req.user!.orgId })
      .select(
        '-passwordHash -resetPasswordToken -resetPasswordExpires ' +
        '-refreshTokenHash -emailVerificationToken -emailVerificationExpires ' +
        '-tokenVersion'
      )
      .sort({ createdAt: -1 })
      .lean()

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    })
  } catch (err) {
    next(err)
  }
}

// ── PATCH /api/users/:id/status ─────────────────────────────────────────

export async function toggleUserStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = String(req.params.id)

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid user ID format', 400)
    }

    // Prevent admin from deactivating themselves
    if (id === (req.user! as any).userId) {
      throw new AppError('You cannot change your own status', 400)
    }

    const target = await User.findOne({ _id: id, orgId: req.user!.orgId })
    if (!target) {
      throw new AppError('User not found in your organization', 404)
    }

    target.status = target.status === 'active' ? 'inactive' : 'active'
    await target.save()

    res.status(200).json({
      success: true,
      data: sanitizeUser(target),
    })
  } catch (err) {
    next(err)
  }
}

// ── POST /api/project-assignments ────────────────────────────────────────

export async function createAssignment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { projectId, userId, roleOnProject } = req.body as {
      projectId?: string
      userId?: string
      roleOnProject?: string
    }

    if (!projectId || !userId) {
      throw new AppError('projectId and userId are required', 400)
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      throw new AppError('Invalid projectId format', 400)
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new AppError('Invalid userId format', 400)
    }

    // Ensure project belongs to current org
    const project = await Project.findOne({ _id: projectId, orgId: req.user!.orgId })
    if (!project) {
      throw new AppError('Project not found in your organization', 404)
    }

    // Ensure target user belongs to current org
    const targetUser = await User.findOne({ _id: userId, orgId: req.user!.orgId })
    if (!targetUser) {
      throw new AppError('User not found in your organization', 404)
    }

    // Upsert assignment or check existing
    let assignment = await ProjectAssignment.findOne({ projectId, userId })
    if (assignment) {
      if (roleOnProject !== undefined) {
        assignment.roleOnProject = roleOnProject
        await assignment.save()
      }
    } else {
      assignment = await ProjectAssignment.create({
        projectId,
        userId,
        roleOnProject: roleOnProject || targetUser.role,
      })
    }

    res.status(201).json({
      success: true,
      data: assignment,
    })
  } catch (err: any) {
    if (err.code === 11000) {
      next(new AppError('User is already assigned to this project', 400))
      return
    }
    next(err)
  }
}
