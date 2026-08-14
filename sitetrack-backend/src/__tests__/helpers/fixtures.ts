/**
 * helpers/fixtures.ts
 * Shared test helpers: seed DB with realistic users/projects/assignments,
 * and return bearer tokens via the real login endpoint.
 *
 * Uses a monotonically increasing counter to generate unique email addresses
 * so that multiple test files can call seedAll() in parallel without hitting
 * the unique email index constraint in MongoDB.
 */
import bcrypt from 'bcrypt'
import mongoose from 'mongoose'
import supertest from 'supertest'
import app from '../../app'
import { Organization } from '../../models/Organization'
import { User } from '../../models/User'
import { Project } from '../../models/Project'
import { ProjectAssignment } from '../../models/ProjectAssignment'

const request = supertest(app)

/**
 * Generates a short unique identifier that is safe to use in email addresses.
 * Combines timestamp + random to be collision-resistant even across parallel workers.
 */
function uid(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export interface SeedResult {
  orgId: string
  adminId: string
  engineerId: string
  pmId: string
  projectId: string
  adminToken: string
  engineerToken: string
  pmToken: string
  adminEmail: string
  engineerEmail: string
  pmEmail: string
}

/**
 * Seeds an Organisation, three Users (admin/pm/site_engineer), a Project,
 * and assigns both engineer and PM to the project.
 * Returns IDs, emails, and pre-fetched bearer tokens.
 */
export async function seedAll(): Promise<SeedResult> {
  const id = uid()

  const adminEmail = `admin_${id}@test.com`
  const pmEmail = `pm_${id}@test.com`
  const engineerEmail = `engineer_${id}@test.com`

  // 1. Organisation
  const org = await Organization.create({ name: `Test Org ${id}` })
  const orgId = (org._id as any).toString()

  // 2. Users — unique emails per invocation
  const password = 'Password1!'
  const hash = await bcrypt.hash(password, 10)

  const [admin, pm, engineer] = await User.insertMany([
    { orgId, name: 'Admin User', email: adminEmail, passwordHash: hash, role: 'admin', status: 'active', isEmailVerified: true, tokenVersion: 0 },
    { orgId, name: 'PM User',    email: pmEmail,    passwordHash: hash, role: 'pm',    status: 'active', isEmailVerified: true, tokenVersion: 0 },
    { orgId, name: 'Engineer User', email: engineerEmail, passwordHash: hash, role: 'site_engineer', status: 'active', isEmailVerified: true, tokenVersion: 0 },
  ])


  const adminId    = (admin._id as any).toString()
  const pmId       = (pm._id as any).toString()
  const engineerId = (engineer._id as any).toString()

  // 3. Project
  const project = await Project.create({
    orgId,
    name: 'Test Project',
    buildingType: 'residential_house',
    status: 'active',
    createdBy: new mongoose.Types.ObjectId(adminId),
  })
  const projectId = (project._id as any).toString()

  // 4. Assign both engineer and PM to the project
  await ProjectAssignment.insertMany([
    { projectId: new mongoose.Types.ObjectId(projectId), userId: new mongoose.Types.ObjectId(engineerId), roleOnProject: 'site_engineer' },
    { projectId: new mongoose.Types.ObjectId(projectId), userId: new mongoose.Types.ObjectId(pmId),       roleOnProject: 'pm' },
  ])

  // 5. Obtain tokens via the real login endpoint
  const [adminRes, pmRes, engineerRes] = await Promise.all([
    request.post('/api/auth/login').send({ email: adminEmail,    password }),
    request.post('/api/auth/login').send({ email: pmEmail,       password }),
    request.post('/api/auth/login').send({ email: engineerEmail, password }),
  ])

  return {
    orgId,
    adminId,
    engineerId,
    pmId,
    projectId,
    adminToken:    adminRes.body.token,
    engineerToken: engineerRes.body.token,
    pmToken:       pmRes.body.token,
    adminEmail,
    engineerEmail,
    pmEmail,
  }
}


/** Minimal DPR body that passes Zod validation */
export function dprBody(projectId: string, date = '2026-08-01'): Record<string, unknown> {
  return {
    projectId,
    date,
    workDone: 'Laid foundation brickwork on north wall',
    labourSkilled: 4,
    labourUnskilled: 6,
    labourOperators: 1,
  }
}
