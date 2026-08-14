/**
 * roles.test.ts
 * Test 2: Admin-only routes return 403 for site_engineer role
 *   - GET /api/dashboard/feed  → 403
 *   - POST /api/projects        → 403
 */
import { describe, it, expect, beforeEach } from 'vitest'
import supertest from 'supertest'
import app from '../app'
import { seedAll } from './helpers/fixtures'

const request = supertest(app)

describe('Role Enforcement — admin-only routes block site_engineer', () => {
  let engineerToken: string

  beforeEach(async () => {
    const seed = await seedAll()
    engineerToken = seed.engineerToken
  })

  it('returns 403 when site_engineer hits GET /api/dashboard/feed', async () => {
    const res = await request
      .get('/api/dashboard/feed')
      .set('Authorization', `Bearer ${engineerToken}`)

    expect(res.status).toBe(403)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toMatch(/access denied/i)
  })

  it('returns 403 when site_engineer hits POST /api/projects', async () => {
    const res = await request
      .post('/api/projects')
      .set('Authorization', `Bearer ${engineerToken}`)
      .send({
        name: 'Hacked Project',
        buildingType: 'residential_house',
      })

    expect(res.status).toBe(403)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toMatch(/access denied/i)
  })

  it('returns 401 when no token is provided to an authenticated route', async () => {
    const res = await request.get('/api/dashboard/feed')
    expect(res.status).toBe(401)
  })
})
