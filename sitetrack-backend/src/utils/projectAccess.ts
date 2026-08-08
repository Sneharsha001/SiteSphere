import { Request } from 'express'
import mongoose from 'mongoose'
import { Project } from '../models/Project'
import { ProjectAssignment } from '../models/ProjectAssignment'

/**
 * Returns an array of project ObjectIds that the currently authenticated user
 * is allowed to access, based on their role:
 *
 *   - admin  → all projects in the same org
 *   - pm     → only projects they are explicitly assigned to via ProjectAssignment
 *
 * This helper is shared between reportController and dashboardController to
 * avoid duplicating the scoping logic.
 */
export async function getAccessibleProjectIds(
  req: Request
): Promise<mongoose.Types.ObjectId[]> {
  const { role, userId, orgId } = req.user!

  if (role === 'admin') {
    const projects = await Project.find({ orgId }).select('_id').lean()
    return projects.map((p) => p._id as mongoose.Types.ObjectId)
  }

  // PM (and any other non-admin role that reaches this helper): use assignments
  const assignments = await ProjectAssignment.find({ userId })
    .select('projectId')
    .lean()
  return assignments.map((a) => a.projectId as mongoose.Types.ObjectId)
}
