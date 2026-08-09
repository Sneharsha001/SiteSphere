/**
 * seedPmUser.ts
 *
 * Seeds a Project Manager user into the SiteTrack DB and assigns them
 * to the test project created by seedTestEngineer.ts.
 *
 * Run with:
 *   npx ts-node -r tsconfig-paths/register src/scripts/seedPmUser.ts
 */
import dotenv from 'dotenv'
dotenv.config()

import bcrypt from 'bcrypt'
import { Organization } from '../models/Organization'
import { User } from '../models/User'
import { Project } from '../models/Project'
import { ProjectAssignment } from '../models/ProjectAssignment'
import { connectDB } from '../config/database'

async function seedPmUser() {
  console.log('🌱  Seeding Project Manager user...')
  await connectDB()

  // Ensure org exists
  let org = await Organization.findOne({ name: 'SiteTrack HQ' })
  if (!org) {
    org = await Organization.create({ name: 'SiteTrack HQ' })
    console.log('✅  Created Organization: SiteTrack HQ')
  }

  // Find or create PM user
  const pmEmail = 'pm@sitetrack.dev'
  let pm = await User.findOne({ email: pmEmail })
  const pmPass = await bcrypt.hash('Pm@123456', 12)

  if (!pm) {
    pm = await User.create({
      orgId: org._id,
      name: 'Sarah ProjectManager',
      email: pmEmail,
      passwordHash: pmPass,
      role: 'pm',
      status: 'active',
    })
    console.log(`✅  Created PM user: ${pmEmail}`)
  } else {
    pm.passwordHash = pmPass
    await pm.save()
    console.log(`ℹ️   PM user exists: ${pmEmail}`)
  }

  // Find the test project
  const project = await Project.findOne({ orgId: org._id, name: 'Metro Extension Phase 1' })
  if (!project) {
    console.error('❌  Test project "Metro Extension Phase 1" not found.')
    console.error('    Run seedTestEngineer.ts first to create it.')
    process.exit(1)
  }

  // Ensure PM assignment exists
  const existingAssignment = await ProjectAssignment.findOne({
    projectId: project._id,
    userId: pm._id,
  })

  if (!existingAssignment) {
    await ProjectAssignment.create({
      projectId: project._id,
      userId: pm._id,
      roleOnProject: 'Project Manager',
    })
    console.log(`✅  Assigned PM to project: "${project.name}"`)
  } else {
    console.log(`ℹ️   PM already assigned to project: "${project.name}"`)
  }

  console.log('\n--- PM Seed Summary ---')
  console.log(`Project:      ${project.name} (${project._id})`)
  console.log(`PM Name:      ${pm.name}`)
  console.log(`PM Email:     ${pm.email}`)
  console.log(`PM Password:  Pm@123456`)
  console.log('-----------------------\n')

  process.exit(0)
}

seedPmUser().catch((err) => {
  console.error('✖  Seed PM failed:', err)
  process.exit(1)
})
