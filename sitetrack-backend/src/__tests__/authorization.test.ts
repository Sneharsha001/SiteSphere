/**
 * authorization.test.ts
 *
 * Horizontal Privilege Escalation & Cross-Org Isolation Tests
 *
 * Sets up TWO completely independent organizations:
 *   Org A — admin_a, pm_a, engineer_a, project_a, dpr_a
 *   Org B — admin_b, pm_b, engineer_b, project_b, dpr_b
 *
 * Verifies that:
 *   1. Users in Org A CANNOT read, write, or modify any resource from Org B
 *   2. Users in Org B CANNOT read, write, or modify any resource from Org A
 *   3. Role escalation attempts are blocked (engineer cannot call admin-only routes)
 *   4. A user cannot inject a foreign orgId to bypass authorization
 *
 * All token acquisition uses the real login endpoint.
 * All org-scoping is derived from req.user (JWT payload) — never from the body.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import supertest from 'supertest'
import mongoose from 'mongoose'
import bcrypt from 'bcrypt'
import app from '../app'
import { Organization } from '../models/Organization'
import { User } from '../models/User'
import { Project } from '../models/Project'
import { ProjectAssignment } from '../models/ProjectAssignment'
import { DailyProgressReport } from '../models/DailyProgressReport'

const request = supertest(app)

// ── Fixture types ──────────────────────────────────────────────────────────

interface OrgFixture {
  orgId: string
  adminToken: string
  pmToken: string
  engineerToken: string
  engineerId: string
  projectId: string
  dprId: string
}

// ── Shared seed function ───────────────────────────────────────────────────

/**
 * Collision-resistant unique identifier for email addresses.
 * Safe even across parallel Vitest workers.
 */
function uid(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

async function seedOrg(label: string): Promise<OrgFixture> {
  const id = uid()
  const password = 'Password1!'
  const hash = await bcrypt.hash(password, 10)

  const org = await Organization.create({ name: `Org ${label} ${id}` })
  const orgId = (org._id as any).toString()

  const [admin, pm, engineer] = await User.insertMany([
    { orgId, name: `Admin ${label}`, email: `admin_${label}_${id}@authtest.com`, passwordHash: hash, role: 'admin', status: 'active', tokenVersion: 0 },
    { orgId, name: `PM ${label}`,    email: `pm_${label}_${id}@authtest.com`,    passwordHash: hash, role: 'pm',    status: 'active', tokenVersion: 0 },
    { orgId, name: `Eng ${label}`,   email: `eng_${label}_${id}@authtest.com`,   passwordHash: hash, role: 'site_engineer', status: 'active', tokenVersion: 0 },
  ])

  const engineerId = (engineer._id as any).toString()

  const project = await Project.create({
    orgId,
    name: `Project ${label} ${id}`,
    buildingType: 'residential_house',
    status: 'active',
    createdBy: admin._id,
  })
  const projectId = (project._id as any).toString()

  // Assign PM and engineer to the project
  await ProjectAssignment.insertMany([
    { projectId: project._id, userId: pm._id,       roleOnProject: 'pm' },
    { projectId: project._id, userId: engineer._id, roleOnProject: 'site_engineer' },
  ])

  // Create a DPR for this org's project / engineer
  const dpr = await DailyProgressReport.create({
    projectId: project._id,
    engineerId: engineer._id,
    date: new Date('2026-08-01'),
    workDone: `Work done in Org ${label}`,
    labourSkilled: 2,
    labourUnskilled: 3,
    labourOperators: 0,
    syncStatus: 'synced',
    createdAt: new Date(),
  })
  const dprId = (dpr._id as any).toString()

  // Obtain tokens via real login
  const [adminRes, pmRes, engRes] = await Promise.all([
    request.post('/api/auth/login').send({ email: `admin_${label}_${id}@authtest.com`, password }),
    request.post('/api/auth/login').send({ email: `pm_${label}_${id}@authtest.com`,    password }),
    request.post('/api/auth/login').send({ email: `eng_${label}_${id}@authtest.com`,   password }),
  ])

  return {
    orgId,
    adminToken:    adminRes.body.token,
    pmToken:       pmRes.body.token,
    engineerToken: engRes.body.token,
    engineerId,
    projectId,
    dprId,
  }
}


// ── Tests ──────────────────────────────────────────────────────────────────

describe('Cross-Org Isolation — Org A cannot access Org B resources', () => {
  let orgA: OrgFixture
  let orgB: OrgFixture

  beforeEach(async () => {
    ;[orgA, orgB] = await Promise.all([seedOrg('A'), seedOrg('B')])
  })

  // ── Projects ─────────────────────────────────────────────────────────────

  it('Org A admin cannot read Org B project (GET /api/projects/:id → 404)', async () => {
    const res = await request
      .get(`/api/projects/${orgB.projectId}`)
      .set('Authorization', `Bearer ${orgA.adminToken}`)

    expect(res.status).toBe(404)
  })

  it('Org A engineer cannot read Org B project (GET /api/projects/:id → 404)', async () => {
    const res = await request
      .get(`/api/projects/${orgB.projectId}`)
      .set('Authorization', `Bearer ${orgA.engineerToken}`)

    // Engineers are blocked by assignment scope (not assigned to org B project)
    expect([403, 404]).toContain(res.status)
  })

  it('Org A admin cannot update Org B project (PATCH /api/projects/:id → 404)', async () => {
    const res = await request
      .patch(`/api/projects/${orgB.projectId}`)
      .set('Authorization', `Bearer ${orgA.adminToken}`)
      .send({ name: 'Hacked Project Name' })

    expect(res.status).toBe(404)
  })

  it('Org A admin cannot list Org B project assignments (GET /api/projects/:id/assignments → 404)', async () => {
    const res = await request
      .get(`/api/projects/${orgB.projectId}/assignments`)
      .set('Authorization', `Bearer ${orgA.adminToken}`)

    expect(res.status).toBe(404)
  })

  // ── DPRs ─────────────────────────────────────────────────────────────────

  it('Org A engineer cannot read Org B DPR (GET /api/reports/:id → 404)', async () => {
    const res = await request
      .get(`/api/reports/${orgB.dprId}`)
      .set('Authorization', `Bearer ${orgA.engineerToken}`)

    expect(res.status).toBe(404)
  })

  it('Org A PM cannot read Org B DPR (GET /api/reports/:id → 404)', async () => {
    const res = await request
      .get(`/api/reports/${orgB.dprId}`)
      .set('Authorization', `Bearer ${orgA.pmToken}`)

    expect(res.status).toBe(404)
  })

  it('Org A admin cannot read Org B DPR (GET /api/reports/:id → 404)', async () => {
    const res = await request
      .get(`/api/reports/${orgB.dprId}`)
      .set('Authorization', `Bearer ${orgA.adminToken}`)

    expect(res.status).toBe(404)
  })

  it('Org A engineer cannot edit Org B DPR (PATCH /api/reports/:id → 404)', async () => {
    const res = await request
      .patch(`/api/reports/${orgB.dprId}`)
      .set('Authorization', `Bearer ${orgA.engineerToken}`)
      .send({ workDone: 'Injected work description' })

    expect(res.status).toBe(404)
  })

  it('Org A admin cannot admin-edit Org B DPR (PATCH /api/reports/:id/admin-edit → 404)', async () => {
    const res = await request
      .patch(`/api/reports/${orgB.dprId}/admin-edit`)
      .set('Authorization', `Bearer ${orgA.adminToken}`)
      .send({ workDone: 'Admin override from wrong org' })

    expect(res.status).toBe(404)
  })

  it('Org A admin cannot read Org B DPR audit log (GET /api/reports/:id/audit → 404)', async () => {
    const res = await request
      .get(`/api/reports/${orgB.dprId}/audit`)
      .set('Authorization', `Bearer ${orgA.adminToken}`)

    expect(res.status).toBe(404)
  })

  it('Org A engineer cannot submit a DPR for Org B project (POST /api/reports → 404)', async () => {
    const res = await request
      .post('/api/reports')
      .set('Authorization', `Bearer ${orgA.engineerToken}`)
      .send({
        projectId: orgB.projectId,
        date: '2026-08-10',
        workDone: 'Trying to write into Org B project',
        labourSkilled: 1,
        labourUnskilled: 1,
        labourOperators: 0,
      })

    // Project from org B not found in org A's scope
    expect(res.status).toBe(404)
  })

  // ── Users ─────────────────────────────────────────────────────────────────

  it('Org A admin cannot list Org B users (GET /api/users only returns own org)', async () => {
    const res = await request
      .get('/api/users')
      .set('Authorization', `Bearer ${orgA.adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)

    // Ensure no Org B users appear in the response
    const returnedOrgIds: string[] = res.body.data.map((u: any) => u.orgId?.toString())
    const hasCrossOrgUser = returnedOrgIds.some((id) => id === orgB.orgId)
    expect(hasCrossOrgUser).toBe(false)
  })

  it('Org A admin cannot toggle Org B user status (PATCH /api/users/:id/status → 404)', async () => {
    // Get an Org B user ID
    const orgBUsers = await User.find({ orgId: new mongoose.Types.ObjectId(orgB.orgId) }).lean()
    const orgBEngineerId = orgBUsers.find((u) => u.role === 'site_engineer')?._id?.toString()
    expect(orgBEngineerId).toBeDefined()

    const res = await request
      .patch(`/api/users/${orgBEngineerId}/status`)
      .set('Authorization', `Bearer ${orgA.adminToken}`)

    expect(res.status).toBe(404)
  })

  it('Org A admin cannot assign Org B user to Org A project', async () => {
    // Try to assign an Org B engineer to Org A's project
    const orgBUsers = await User.find({ orgId: new mongoose.Types.ObjectId(orgB.orgId) }).lean()
    const orgBEngineerId = orgBUsers.find((u) => u.role === 'site_engineer')?._id?.toString()
    expect(orgBEngineerId).toBeDefined()

    const res = await request
      .post('/api/project-assignments')
      .set('Authorization', `Bearer ${orgA.adminToken}`)
      .send({
        projectId: orgA.projectId,
        userId: orgBEngineerId,
      })

    // The org-scoped user lookup should reject this
    expect(res.status).toBe(404)
  })

  // ── Dashboard ─────────────────────────────────────────────────────────────

  it('Org A PM dashboard feed does not include Org B DPRs', async () => {
    const res = await request
      .get('/api/dashboard/feed')
      .set('Authorization', `Bearer ${orgA.pmToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)

    // None of the returned DPRs should belong to Org B's project
    const projectIds: string[] = res.body.data.map((d: any) =>
      d.projectId?._id?.toString() ?? d.projectId?.toString()
    )
    const hasCrossOrgDpr = projectIds.some((id) => id === orgB.projectId)
    expect(hasCrossOrgDpr).toBe(false)
  })

  it('Org A admin dashboard feed does not include Org B DPRs', async () => {
    const res = await request
      .get('/api/dashboard/feed')
      .set('Authorization', `Bearer ${orgA.adminToken}`)

    expect(res.status).toBe(200)
    const projectIds: string[] = res.body.data.map((d: any) =>
      d.projectId?._id?.toString() ?? d.projectId?.toString()
    )
    const hasCrossOrgDpr = projectIds.some((id) => id === orgB.projectId)
    expect(hasCrossOrgDpr).toBe(false)
  })
})

// ── Role Escalation Tests ──────────────────────────────────────────────────

describe('Role Escalation — engineers cannot call admin/PM routes', () => {
  let orgA: OrgFixture

  beforeEach(async () => {
    orgA = await seedOrg('RoleEsc')
  })

  it('site_engineer cannot call POST /api/users (admin-only)', async () => {
    const res = await request
      .post('/api/users')
      .set('Authorization', `Bearer ${orgA.engineerToken}`)
      .send({ name: 'Hacker', email: 'hacker@test.com', password: 'Password1!', role: 'admin' })

    expect(res.status).toBe(403)
  })

  it('site_engineer cannot call GET /api/users (admin-only)', async () => {
    const res = await request
      .get('/api/users')
      .set('Authorization', `Bearer ${orgA.engineerToken}`)

    expect(res.status).toBe(403)
  })

  it('site_engineer cannot call PATCH /api/users/:id/status (admin-only)', async () => {
    const res = await request
      .patch(`/api/users/${orgA.engineerId}/status`)
      .set('Authorization', `Bearer ${orgA.engineerToken}`)

    expect(res.status).toBe(403)
  })

  it('site_engineer cannot admin-edit a DPR', async () => {
    const res = await request
      .patch(`/api/reports/${orgA.dprId}/admin-edit`)
      .set('Authorization', `Bearer ${orgA.engineerToken}`)
      .send({ workDone: 'engineer trying admin-edit' })

    expect(res.status).toBe(403)
  })

  it('site_engineer cannot view audit logs', async () => {
    const res = await request
      .get(`/api/reports/${orgA.dprId}/audit`)
      .set('Authorization', `Bearer ${orgA.engineerToken}`)

    expect(res.status).toBe(403)
  })

  it('PM cannot submit a DPR (site_engineer-only)', async () => {
    const res = await request
      .post('/api/reports')
      .set('Authorization', `Bearer ${orgA.pmToken}`)
      .send({
        projectId: orgA.projectId,
        date: '2026-08-10',
        workDone: 'PM trying to submit DPR',
        labourSkilled: 1,
        labourUnskilled: 1,
        labourOperators: 0,
      })

    expect(res.status).toBe(403)
  })

  it('PM cannot create a project (admin-only)', async () => {
    const res = await request
      .post('/api/projects')
      .set('Authorization', `Bearer ${orgA.pmToken}`)
      .send({ name: 'PM Project', buildingType: 'residential_house' })

    expect(res.status).toBe(403)
  })
})

// ── Own-engineer isolation — engineer cannot read another engineer's DPR in same org ──

describe('Within-Org Isolation — engineer cannot read another engineer\'s DPR', () => {
  let orgA: OrgFixture
  let secondEngineerId: string
  let secondEngineerToken: string
  let secondEngineerDprId: string

  beforeEach(async () => {
    orgA = await seedOrg('SameOrg')

    // Create a second engineer in the same org (unique email per beforeEach)
    const id2 = uid()
    const password = 'Password1!'
    const hash = await bcrypt.hash(password, 10)
    const eng2 = await User.create({
      orgId: new mongoose.Types.ObjectId(orgA.orgId),
      name: 'Engineer 2',
      email: `eng2_sameorg_${id2}@authtest.com`,
      passwordHash: hash,
      role: 'site_engineer',
      status: 'active',
      tokenVersion: 0,
    })
    secondEngineerId = (eng2._id as any).toString()


    // Assign eng2 to the same project
    await ProjectAssignment.create({
      projectId: new mongoose.Types.ObjectId(orgA.projectId),
      userId: eng2._id,
      roleOnProject: 'site_engineer',
    })

    // Create a DPR for eng2 on a different date
    const dpr2 = await DailyProgressReport.create({
      projectId: new mongoose.Types.ObjectId(orgA.projectId),
      engineerId: eng2._id,
      date: new Date('2026-08-02'),
      workDone: 'Engineer 2 work',
      labourSkilled: 1,
      labourUnskilled: 1,
      labourOperators: 0,
      syncStatus: 'synced',
      createdAt: new Date(),
    })
    secondEngineerDprId = (dpr2._id as any).toString()

    // Login eng2
    const loginRes = await request
      .post('/api/auth/login')
      .send({ email: `eng2_sameorg_${id2}@authtest.com`, password })
    secondEngineerToken = loginRes.body.token

  })

  it('engineer1 cannot read engineer2\'s DPR (same org, different engineer)', async () => {
    const res = await request
      .get(`/api/reports/${secondEngineerDprId}`)
      .set('Authorization', `Bearer ${orgA.engineerToken}`)

    // Should get 403 (own-report check) since the org boundary passes but engineerId doesn't match
    expect(res.status).toBe(403)
  })

  it('engineer1 cannot PATCH engineer2\'s DPR (same org, different engineer)', async () => {
    const res = await request
      .patch(`/api/reports/${secondEngineerDprId}`)
      .set('Authorization', `Bearer ${orgA.engineerToken}`)
      .send({ workDone: 'engineer1 trying to edit engineer2 DPR' })

    expect(res.status).toBe(403)
  })
})
