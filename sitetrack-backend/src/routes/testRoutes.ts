import { Router, Request, Response } from 'express'
import {
  Organization,
  User,
  Project,
  ProjectAssignment,
  DailyProgressReport,
  ReportPhoto,
  AuditLog,
} from '../models'

const router = Router()

/**
 * GET /api/test/models
 * Temporary endpoint to verify saving and deleting a document for all 7 Mongoose models.
 */
router.get('/models', async (_req: Request, res: Response): Promise<void> => {
  const modelsChecked: string[] = []

  try {
    // 1. Organization
    const dummyOrg = await Organization.create({
      name: 'Test TestOrg Ltd_' + Date.now(),
    })
    modelsChecked.push('Organization')

    // 2. User
    const dummyUser = await User.create({
      orgId: dummyOrg._id,
      name: 'Test Engineer',
      email: `test.engineer_${Date.now()}@example.com`,
      passwordHash: '$2b$10$hashedpasswordplaceholder',
      role: 'site_engineer',
      status: 'active',
    })
    modelsChecked.push('User')

    // 3. Project (strictly building type)
    const dummyProject = await Project.create({
      orgId: dummyOrg._id,
      name: 'Test Residential Tower',
      location: '123 Test Street',
      startDate: new Date(),
      buildingType: 'residential_house',
      status: 'active',
      createdBy: dummyUser._id,
    })
    modelsChecked.push('Project')

    // 4. ProjectAssignment
    const dummyAssignment = await ProjectAssignment.create({
      projectId: dummyProject._id,
      userId: dummyUser._id,
      roleOnProject: 'Site Engineer',
    })
    modelsChecked.push('ProjectAssignment')

    // 5. DailyProgressReport
    const dummyReport = await DailyProgressReport.create({
      projectId: dummyProject._id,
      engineerId: dummyUser._id,
      date: new Date(),
      workDone: 'Foundation concrete pouring completed',
      quantity: '50 cubic meters',
      labourSkilled: 5,
      labourUnskilled: 10,
      labourOperators: 2,
      tomorrowPlan: 'Curing and column reinforcement',
      issues: 'None',
      remarks: 'Weather was clear',
      syncStatus: 'synced',
    })
    modelsChecked.push('DailyProgressReport')

    // 6. ReportPhoto
    const dummyPhoto = await ReportPhoto.create({
      reportId: dummyReport._id,
      fileUrl: 'https://example.com/photos/foundation.jpg',
      timestamp: new Date(),
      gpsLat: 12.9716,
      gpsLng: 77.5946,
    })
    modelsChecked.push('ReportPhoto')

    // 7. AuditLog
    const dummyAuditLog = await AuditLog.create({
      entity: 'Project',
      entityId: dummyProject._id,
      action: 'CREATE',
      changedBy: dummyUser._id,
      changedAt: new Date(),
    })
    modelsChecked.push('AuditLog')

    // Cleanup created dummy documents in reverse order
    await AuditLog.deleteOne({ _id: dummyAuditLog._id })
    await ReportPhoto.deleteOne({ _id: dummyPhoto._id })
    await DailyProgressReport.deleteOne({ _id: dummyReport._id })
    await ProjectAssignment.deleteOne({ _id: dummyAssignment._id })
    await Project.deleteOne({ _id: dummyProject._id })
    await User.deleteOne({ _id: dummyUser._id })
    await Organization.deleteOne({ _id: dummyOrg._id })

    res.status(200).json({
      success: true,
      modelsChecked,
    })
  } catch (error: any) {
    console.error('Error during /api/test/models check:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Error creating or deleting test model documents',
      modelsChecked,
    })
  }
})

export default router
