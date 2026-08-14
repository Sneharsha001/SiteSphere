/**
 * reports.test.ts
 * Tests 3, 4, 5: DPR creation, 24h edit window, and duplicate rejection
 *
 * Test 3: Role enforcement on POST /api/reports
 *   - site_engineer → 201
 *   - pm → 403 (route is requireRole('site_engineer'))
 *
 * Test 4: 24-hour edit window in PATCH /api/reports/:id
 *   - edit within 24h → 200
 *   - edit after 24h (createdAt backdated) → 403 with exact error message
 *
 * Test 5: Duplicate DPR rejection
 *   - same project + date + engineer on second POST → 400
 */
import { describe, it, expect, beforeEach } from 'vitest'
import supertest from 'supertest'
import mongoose from 'mongoose'
import app from '../app'
import { seedAll, dprBody } from './helpers/fixtures'
import { DailyProgressReport } from '../models/DailyProgressReport'

const request = supertest(app)

// ─────────────────────────────────────────────────────────────────────────────
// Test 3: DPR creation role enforcement
// ─────────────────────────────────────────────────────────────────────────────

describe('DPR Creation — POST /api/reports', () => {
  let engineerToken: string
  let pmToken: string
  let projectId: string

  beforeEach(async () => {
    const seed = await seedAll()
    engineerToken = seed.engineerToken
    pmToken = seed.pmToken
    projectId = seed.projectId
  })

  it('allows site_engineer to create a DPR (returns 201)', async () => {
    const res = await request
      .post('/api/reports')
      .set('Authorization', `Bearer ${engineerToken}`)
      .send(dprBody(projectId))

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toBeDefined()
    expect(res.body.data.workDone).toBe('Laid foundation brickwork on north wall')
  })

  it('blocks PM from creating a DPR (returns 403)', async () => {
    const res = await request
      .post('/api/reports')
      .set('Authorization', `Bearer ${pmToken}`)
      .send(dprBody(projectId))

    expect(res.status).toBe(403)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toMatch(/access denied/i)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 4: 24-hour edit window
// ─────────────────────────────────────────────────────────────────────────────

describe('DPR Edit Window — PATCH /api/reports/:id', () => {
  let engineerToken: string
  let engineerId: string
  let projectId: string

  beforeEach(async () => {
    const seed = await seedAll()
    engineerToken = seed.engineerToken
    engineerId = seed.engineerId
    projectId = seed.projectId
  })

  it('allows edit within 24 hours of createdAt (returns 200)', async () => {
    // Create a fresh report (createdAt = now)
    const createRes = await request
      .post('/api/reports')
      .set('Authorization', `Bearer ${engineerToken}`)
      .send(dprBody(projectId))

    expect(createRes.status).toBe(201)
    const reportId = createRes.body.data._id

    // Edit it immediately — well within 24 hours
    const patchRes = await request
      .patch(`/api/reports/${reportId}`)
      .set('Authorization', `Bearer ${engineerToken}`)
      .send({ workDone: 'Updated: installed formwork on south elevation' })

    expect(patchRes.status).toBe(200)
    expect(patchRes.body.success).toBe(true)
    expect(patchRes.body.data.workDone).toBe('Updated: installed formwork on south elevation')
  })

  it('rejects edit after 24 hours with 403 and correct error message', async () => {
    // Directly insert a report backdated to 25 hours ago
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000)

    const oldReport = await DailyProgressReport.create({
      projectId: new mongoose.Types.ObjectId(projectId),
      engineerId: new mongoose.Types.ObjectId(engineerId),
      date: new Date('2026-07-01'),
      workDone: 'Old work done description',
      labourSkilled: 2,
      labourUnskilled: 3,
      labourOperators: 0,
      syncStatus: 'synced',
      createdAt: twentyFiveHoursAgo,
    })

    const reportId = (oldReport._id as any).toString()

    const res = await request
      .patch(`/api/reports/${reportId}`)
      .set('Authorization', `Bearer ${engineerToken}`)
      .send({ workDone: 'Trying to edit an old report' })

    expect(res.status).toBe(403)
    expect(res.body.success).toBe(false)
    // Match the exact message from reportController.ts line 351
    expect(res.body.message).toMatch(/older than 24 hours/i)
    expect(res.body.message).toMatch(/cannot be edited directly/i)
    expect(res.body.message).toMatch(/contact an admin/i)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 5: Duplicate DPR rejection
// ─────────────────────────────────────────────────────────────────────────────

describe('DPR Duplicate Rejection — POST /api/reports', () => {
  let engineerToken: string
  let projectId: string

  beforeEach(async () => {
    const seed = await seedAll()
    engineerToken = seed.engineerToken
    projectId = seed.projectId
  })

  it('rejects a second DPR for the same project + date + engineer (returns 400)', async () => {
    const body = dprBody(projectId, '2026-08-05')

    // First submission — must succeed
    const first = await request
      .post('/api/reports')
      .set('Authorization', `Bearer ${engineerToken}`)
      .send(body)

    expect(first.status).toBe(201)

    // Second submission — same project + same date + same engineer → must fail
    const second = await request
      .post('/api/reports')
      .set('Authorization', `Bearer ${engineerToken}`)
      .send(body)

    expect(second.status).toBe(400)
    expect(second.body.success).toBe(false)
    expect(second.body.message).toMatch(/already exists/i)
  })
})
