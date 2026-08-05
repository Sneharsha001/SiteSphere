import dotenv from 'dotenv'
dotenv.config()

import bcrypt from 'bcrypt'
import { Organization } from '../models/Organization'
import { User } from '../models/User'
import { Project } from '../models/Project'
import { ProjectAssignment } from '../models/ProjectAssignment'
import { connectDB } from '../config/database'

async function seedTestEngineer() {
  console.log('🌱  Seeding test project and Site Engineer...')
  await connectDB()

  let org = await Organization.findOne({ name: 'SiteTrack HQ' })
  if (!org) {
    org = await Organization.create({ name: 'SiteTrack HQ' })
  }

  // Find or create admin
  let admin = await User.findOne({ email: 'admin@sitetrack.dev' })
  if (!admin) {
    const adminPass = await bcrypt.hash('Admin@123', 12)
    admin = await User.create({
      orgId: org._id,
      name: 'System Administrator',
      email: 'admin@sitetrack.dev',
      passwordHash: adminPass,
      role: 'admin',
      status: 'active',
    })
  }

  // Find or create Site Engineer
  const engineerEmail = 'engineer@sitetrack.dev'
  let engineer = await User.findOne({ email: engineerEmail })
  const engPass = await bcrypt.hash('Engineer@123', 12)

  if (!engineer) {
    engineer = await User.create({
      orgId: org._id,
      name: 'John Engineer',
      email: engineerEmail,
      passwordHash: engPass,
      role: 'site_engineer',
      status: 'active',
    })
    console.log(`✅  Created Site Engineer: ${engineerEmail}`)
  } else {
    engineer.passwordHash = engPass
    await engineer.save()
    console.log(`ℹ️   Site Engineer exists: ${engineerEmail}`)
  }

  // Find or create Project
  let project = await Project.findOne({ orgId: org._id, name: 'Metro Extension Phase 1' })
  if (!project) {
    project = await Project.create({
      orgId: org._id,
      name: 'Metro Extension Phase 1',
      location: 'Sector 62, Metro Corridor',
      startDate: new Date('2026-01-15'),
      buildingType: 'commercial_office',
      status: 'active',
      createdBy: admin._id,
    })
    console.log(`✅  Created Project: "Metro Extension Phase 1" (${project._id})`)
  } else {
    console.log(`ℹ️   Project exists: "Metro Extension Phase 1" (${project._id})`)
  }

  // Ensure ProjectAssignment exists
  let assignment = await ProjectAssignment.findOne({
    projectId: project._id,
    userId: engineer._id,
  })

  if (!assignment) {
    assignment = await ProjectAssignment.create({
      projectId: project._id,
      userId: engineer._id,
      roleOnProject: 'Lead Site Engineer',
    })
    console.log(`✅  Created ProjectAssignment for Site Engineer`)
  } else {
    console.log(`ℹ️   ProjectAssignment already exists`)
  }

  console.log('\n--- Test Seed Summary ---')
  console.log(`Project ID : ${project._id}`)
  console.log(`Engineer ID: ${engineer._id}`)
  console.log(`Engineer Email: ${engineer.email}`)
  console.log(`Engineer Password: Engineer@123`)
  console.log('-------------------------\n')

  process.exit(0)
}

seedTestEngineer().catch((err) => {
  console.error('✖ Seed test engineer failed:', err)
  process.exit(1)
})
