import { Request } from 'express'
import mongoose from 'mongoose'
import { Project } from '../models/Project'
import { ProjectAssignment } from '../models/ProjectAssignment'

/**
 * Returns an array of project ObjectIds that the currently authenticated user
 * is allowed to access, based on their role:
 *
 *   - admin  → all projects in the same org
 *   - pm     → only projects they are explicitly assigned to, AND that belong
 *               to their org (prevents cross-org data leakage if an assignment
 *               row ever references a project from another org)
 *
 * IMPORTANT: orgId is always taken from req.user — never from the request body
 * or query parameters — to prevent client-side org spoofing.
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

  // PM (and any other non-admin role that reaches this helper):
  // Fetch directly assigned project IDs, then intersect with org-owned projects.
  // The intersection ensures that even if a stale/migrated assignment row pointed
  // to a cross-org project, the PM would still be prevented from seeing it.
  const assignments = await ProjectAssignment.find({ userId })
    .select('projectId')
    .lean()

  if (assignments.length === 0) return []

  const assignedIds = assignments.map((a) => a.projectId)

  // Org-scope intersection: only keep projects that belong to this user's org
  const orgProjects = await Project.find({
    _id: { $in: assignedIds },
    orgId,
  })
    .select('_id')
    .lean()

  return orgProjects.map((p) => p._id as mongoose.Types.ObjectId)
}
