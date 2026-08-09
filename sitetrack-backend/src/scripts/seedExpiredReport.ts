import dotenv from 'dotenv'
dotenv.config()

import { connectDB } from '../config/database'
import { User } from '../models/User'
import { Project } from '../models/Project'
import { DailyProgressReport } from '../models/DailyProgressReport'

async function seedExpiredReport() {
  console.log('🌱 Seeding expired DPR (48h old)...')
  await connectDB()

  const engineer = await User.findOne({ email: 'engineer@sitetrack.dev' })
  if (!engineer) {
    console.error('Engineer not found. Run seedTestEngineer.ts first.')
    process.exit(1)
  }

  const project = await Project.findOne({ name: 'Metro Extension Phase 1' })
  if (!project) {
    console.error('Project not found. Run seedTestEngineer.ts first.')
    process.exit(1)
  }

  const expiredDate = new Date('2026-08-05')
  const expiredCreatedAt = new Date(Date.now() - 48 * 60 * 60 * 1000) // 48 hours ago

  // Check if an expired report for this date exists already
  const existing = await DailyProgressReport.findOne({
    projectId: project._id,
    engineerId: engineer._id,
    date: expiredDate,
  })

  const expiredId = existing?._id

  if (!existing) {
    const created = await DailyProgressReport.create({
      projectId: project._id,
      engineerId: engineer._id,
      date: expiredDate,
      workDone: 'Excavation for Station Pier 1 to 4 (Expired DPR)',
      quantity: '120 cu.m excavated',
      labourSkilled: 4,
      labourUnskilled: 8,
      labourOperators: 2,
      tomorrowPlan: 'Rebar placement for Pier 1 footings',
      issues: 'Delayed water tanker delivery',
      remarks: 'Work completed on schedule',
    })
    // Force createdAt to 48h ago via updateOne (bypasses Mongoose schema)
    await DailyProgressReport.collection.updateOne(
      { _id: created._id },
      { $set: { createdAt: expiredCreatedAt, updatedAt: expiredCreatedAt } }
    )
    console.log(`✅ Created expired report ID: ${created._id}`)
  } else {
    // Force createdAt to 48h ago via updateOne (bypasses Mongoose schema)
    await DailyProgressReport.collection.updateOne(
      { _id: expiredId },
      { $set: { createdAt: expiredCreatedAt, updatedAt: expiredCreatedAt } }
    )
    console.log(`✅ Updated existing report to be expired ID: ${expiredId}`)
  }

  console.log('Expired report ready!')
  process.exit(0)
}

seedExpiredReport().catch((err) => {
  console.error('Seed expired report failed:', err)
  process.exit(1)
})
