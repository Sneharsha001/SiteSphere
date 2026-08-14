/**
 * auth.test.ts
 *
 * Comprehensive authentication test suite covering 20 scenarios:
 *
 *  1.  Valid registration
 *  2.  Duplicate registration
 *  3.  Registration validation (missing / weak password)
 *  4.  Valid login
 *  5.  Wrong password
 *  6.  Non-existent user login
 *  7.  Deactivated account login
 *  8.  Refresh token — valid
 *  9.  Refresh token — missing cookie
 * 10.  Refresh token — revoked (post-logout)
 * 11.  Logout
 * 12.  GET /me — authenticated
 * 13.  GET /me — no token
 * 14.  Expired / invalid access token
 * 15.  Role restriction
 * 16.  Organization isolation
 * 17.  Forgot password (anti-enumeration)
 * 18.  Reset password — valid
 * 19.  Reset password — expired token
 * 20.  tokenVersion revocation (sessions invalidated after password reset)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import supertest from 'supertest'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import app from '../app'
import { Organization } from '../models/Organization'
import { User } from '../models/User'
import { Project } from '../models/Project'
import { seedAll, SeedResult } from './helpers/fixtures'
import mongoose from 'mongoose'

const request = supertest(app)

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function loginAs(email: string, password = 'Password1!') {
  return request.post('/api/auth/login').send({ email, password })
}

// ─────────────────────────────────────────────────────────────────────────────
// 1-3  Registration
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  const validPayload = {
    organizationName: 'Acme Construction',
    name: 'Alice Admin',
    email: 'alice@acme.com',
    password: 'SecurePass1!',
  }

  it('registers a new organization + admin user and returns a JWT', async () => {
    const res = await request.post('/api/auth/register').send(validPayload)

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.token).toBeDefined()

    // Validate the JWT payload
    const decoded = jwt.verify(
      res.body.token,
      process.env['JWT_SECRET']!
    ) as any
    expect(decoded.role).toBe('admin')
    expect(decoded.userId).toBeDefined()
    expect(decoded.orgId).toBeDefined()

    // Safe user object must not contain secrets
    const user = res.body.user
    expect(user.email).toBe(validPayload.email)
    expect(user.role).toBe('admin')
    expect(user.passwordHash).toBeUndefined()
    expect(user.refreshTokenHash).toBeUndefined()
    expect(user.resetPasswordToken).toBeUndefined()
  })

  it('returns 409 on duplicate email', async () => {
    await request.post('/api/auth/register').send(validPayload)
    const res = await request.post('/api/auth/register').send(validPayload)

    expect(res.status).toBe(409)
    expect(res.body.success).toBe(false)
  })

  it('returns 400 when required fields are missing', async () => {
    const res = await request
      .post('/api/auth/register')
      .send({ email: 'bad@example.com', password: 'SecurePass1!' })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('returns 400 when password is too weak', async () => {
    const res = await request.post('/api/auth/register').send({
      ...validPayload,
      email: 'newuser@acme.com',
      password: 'weakpassword', // no uppercase, number, or special char
    })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 4-7  Login
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  let seed: SeedResult
  beforeEach(async () => {
    seed = await seedAll()
  })

  it('returns 200 + valid JWT with correct credentials', async () => {
    const res = await loginAs(seed.engineerEmail)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.token).toBeDefined()

    const decoded = jwt.verify(res.body.token, process.env['JWT_SECRET']!) as any
    expect(decoded.role).toBe('site_engineer')
    expect(decoded.userId).toBeDefined()
    expect(decoded.tokenVersion).toBeDefined()

    // Sensitive fields must not be in the response body
    expect(res.body.user.passwordHash).toBeUndefined()
    expect(res.body.user.refreshTokenHash).toBeUndefined()
  })

  it('returns 401 with wrong password (generic message)', async () => {
    const res = await loginAs(seed.engineerEmail, 'WrongPass1!')

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toMatch(/invalid email or password/i)
  })

  it('returns 401 when user does not exist', async () => {
    const res = await loginAs('nobody@example.com')

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
    // Must NOT reveal that the email doesn't exist
    expect(res.body.message).toMatch(/invalid email or password/i)
  })

  it('returns 403 when account is inactive', async () => {
    // Directly deactivate the engineer
    await User.updateOne({ email: seed.engineerEmail }, { status: 'inactive' })

    const res = await loginAs(seed.engineerEmail)
    expect(res.status).toBe(403)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toMatch(/deactivated/i)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 8-10  Refresh token
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/refresh', () => {
  let seed: SeedResult
  beforeEach(async () => {
    seed = await seedAll()
  })

  it('issues a new access token when the refresh cookie is valid', async () => {
    // Login to obtain the cookie
    const loginRes = await request
      .post('/api/auth/login')
      .send({ email: seed.engineerEmail, password: 'Password1!' })

    expect(loginRes.status).toBe(200)

    // Extract Set-Cookie header
    const cookies = loginRes.headers['set-cookie'] as unknown as string[]
    expect(cookies).toBeDefined()
    const cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies

    const refreshRes = await request
      .post('/api/auth/refresh')
      .set('Cookie', cookieHeader)

    expect(refreshRes.status).toBe(200)
    expect(refreshRes.body.token).toBeDefined()

    // New token must be a valid JWT
    const decoded = jwt.verify(refreshRes.body.token, process.env['JWT_SECRET']!) as any
    expect(decoded.role).toBe('site_engineer')
  })

  it('returns 401 when no refresh cookie is present', async () => {
    const res = await request.post('/api/auth/refresh')

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })

  it('returns 401 when refresh cookie is revoked (after logout)', async () => {
    // Login
    const loginRes = await request
      .post('/api/auth/login')
      .send({ email: seed.engineerEmail, password: 'Password1!' })

    const cookies = loginRes.headers['set-cookie'] as unknown as string[]
    const cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies

    // Logout (revokes the cookie server-side)
    await request.post('/api/auth/logout').set('Cookie', cookieHeader)

    // Try to use the cookie again
    const refreshRes = await request
      .post('/api/auth/refresh')
      .set('Cookie', cookieHeader)

    expect(refreshRes.status).toBe(401)
    expect(refreshRes.body.success).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 11  Logout
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
  it('returns 200 and clears the cookie', async () => {
    const seed = await seedAll()

    const loginRes = await request
      .post('/api/auth/login')
      .send({ email: seed.adminEmail, password: 'Password1!' })

    const cookies = loginRes.headers['set-cookie'] as unknown as string[]
    const cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies

    const res = await request.post('/api/auth/logout').set('Cookie', cookieHeader)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('returns 200 even when no cookie is present (idempotent)', async () => {
    const res = await request.post('/api/auth/logout')
    expect(res.status).toBe(200)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 12-13  GET /api/auth/me
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/auth/me', () => {
  let seed: SeedResult
  beforeEach(async () => {
    seed = await seedAll()
  })

  it('returns safe user profile when authenticated', async () => {
    const loginRes = await loginAs(seed.adminEmail)
    const token = loginRes.body.token

    const res = await request
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)

    const data = res.body.data
    expect(data.email).toBe(seed.adminEmail)
    expect(data.role).toBe('admin')
    expect(data.organization).toBeDefined()
    expect(data.organization.name).toBeDefined()

    // Sensitive fields must be absent
    expect(data.passwordHash).toBeUndefined()
    expect(data.refreshTokenHash).toBeUndefined()
    expect(data.resetPasswordToken).toBeUndefined()
    expect(data.emailVerificationToken).toBeUndefined()
  })

  it('returns 401 when no token is provided', async () => {
    const res = await request.get('/api/auth/me')
    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })

  it('returns 401 with a malformed token', async () => {
    const res = await request
      .get('/api/auth/me')
      .set('Authorization', 'Bearer this.is.notvalid')

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })

  it('returns 401 with an expired access token', async () => {
    // Sign a token that expired 1 second ago
    const expiredToken = jwt.sign(
      { userId: new mongoose.Types.ObjectId().toString(), orgId: 'x', role: 'admin', tokenVersion: 0 },
      process.env['JWT_SECRET']!,
      { expiresIn: -1 } as any
    )

    const res = await request
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`)

    expect(res.status).toBe(401)
    expect(res.body.message).toMatch(/expired/i)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 14  Role restrictions
// ─────────────────────────────────────────────────────────────────────────────

describe('Role Restrictions', () => {
  let seed: SeedResult
  beforeEach(async () => {
    seed = await seedAll()
  })

  it('403 when site_engineer accesses admin-only GET /api/dashboard/feed', async () => {
    const loginRes = await loginAs(seed.engineerEmail)
    const res = await request
      .get('/api/dashboard/feed')
      .set('Authorization', `Bearer ${loginRes.body.token}`)

    expect(res.status).toBe(403)
    expect(res.body.message).toMatch(/access denied/i)
  })

  it('403 when site_engineer tries POST /api/projects', async () => {
    const loginRes = await loginAs(seed.engineerEmail)
    const res = await request
      .post('/api/projects')
      .set('Authorization', `Bearer ${loginRes.body.token}`)
      .send({ name: 'Hacked Project', buildingType: 'residential_house' })

    expect(res.status).toBe(403)
  })

  it('403 when PM tries to manage users', async () => {
    const loginRes = await loginAs(seed.pmEmail)
    const res = await request
      .get('/api/users')
      .set('Authorization', `Bearer ${loginRes.body.token}`)

    expect(res.status).toBe(403)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 15  Organization isolation
// ─────────────────────────────────────────────────────────────────────────────

describe('Organization Isolation', () => {
  it('cannot access resources from a different organization', async () => {
    // Org A
    const { projectId: projectIdA } = await seedAll()

    // Org B — a separate seeded org with its own data
    const orgB = await Organization.create({ name: 'Org B' })
    const hashB = await bcrypt.hash('Password1!', 10)
    await User.create({
      orgId: orgB._id,
      name: 'B Admin',
      email: 'admin@orgb.com',
      passwordHash: hashB,
      role: 'admin',
      status: 'active',
      tokenVersion: 0,
    })
    const loginB = await loginAs('admin@orgb.com')
    const tokenB = loginB.body.token

    // Org B admin trying to access Org A's project
    const res = await request
      .get(`/api/projects/${projectIdA}`)
      .set('Authorization', `Bearer ${tokenB}`)

    // Should be 404 (not found within org) rather than 200 or 403
    expect(res.status).toBe(404)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 17-20  Password reset flow
// ─────────────────────────────────────────────────────────────────────────────

describe('Forgot + Reset Password', () => {
  let seed: SeedResult
  beforeEach(async () => {
    seed = await seedAll()
  })

  it('forgot-password always returns 200 (anti-enumeration)', async () => {
    // Known email
    const res1 = await request
      .post('/api/auth/forgot-password')
      .send({ email: seed.adminEmail })
    expect(res1.status).toBe(200)

    // Unknown email — must respond identically
    const res2 = await request
      .post('/api/auth/forgot-password')
      .send({ email: 'unknown@nowhere.com' })
    expect(res2.status).toBe(200)
    expect(res2.body.message).toBe(res1.body.message)
  })

  it('reset-password with valid token changes password and revokes sessions', async () => {
    const rawToken = crypto.randomBytes(32).toString('hex')
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex')

    await User.updateOne(
      { email: seed.engineerEmail },
      {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: new Date(Date.now() + 60 * 60 * 1000),
      }
    )

    // Login first to get an access token
    const loginRes = await loginAs(seed.engineerEmail)
    const oldToken = loginRes.body.token

    // Apply the reset
    const resetRes = await request.post('/api/auth/reset-password').send({
      token: rawToken,
      password: 'NewSecurePass9@',
    })

    expect(resetRes.status).toBe(200)
    expect(resetRes.body.success).toBe(true)

    // Old token should now be rejected (tokenVersion incremented)
    const meRes = await request
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${oldToken}`)
    expect(meRes.status).toBe(401)

    // New password should work
    const newLoginRes = await loginAs(seed.engineerEmail, 'NewSecurePass9@')
    expect(newLoginRes.status).toBe(200)
  })

  it('reset-password returns 400 for invalid/expired token', async () => {
    const res = await request.post('/api/auth/reset-password').send({
      token: 'fakeinvalidtoken',
      password: 'NewSecurePass9@',
    })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('reset-password returns 400 for weak new password', async () => {
    // Set up a real reset token
    const rawToken = crypto.randomBytes(32).toString('hex')
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex')

    await User.updateOne(
      { email: seed.engineerEmail },
      {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: new Date(Date.now() + 60 * 60 * 1000),
      }
    )

    const res = await request.post('/api/auth/reset-password').send({
      token: rawToken,
      password: 'weakpassword', // fails complexity check
    })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })
})
