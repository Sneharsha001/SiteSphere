/**
 * setup.ts
 *
 * Runs before EACH test file (setupFiles in vitest.config.ts).
 *
 * - Connects mongoose to the in-memory MongoDB started by globalSetup.ts
 * - Wipes all collections between each test for perfect isolation
 * - Mocks Cloudinary and Nodemailer so tests never make real network calls
 */
import { beforeAll, afterAll, beforeEach, vi } from 'vitest'
import mongoose from 'mongoose'

// ── Mock Cloudinary ────────────────────────────────────────────────────────
vi.mock('../config/cloudinary', () => ({
  uploadBufferToCloudinary: vi
    .fn()
    .mockResolvedValue('https://res.cloudinary.com/test/image/upload/test.jpg'),
}))

// ── Mock email utility (all exported functions) ────────────────────────────
vi.mock('../utils/email', () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
  buildNewDprEmailHtml: vi.fn().mockReturnValue('<p>mock email</p>'),
  buildPasswordResetEmailHtml: vi.fn().mockReturnValue('<p>mock reset email</p>'),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(true),
  buildVerificationEmailHtml: vi.fn().mockReturnValue('<p>mock verify email</p>'),
  sendVerificationEmail: vi.fn().mockResolvedValue(true),
}))


// ── Connect to in-memory MongoDB ───────────────────────────────────────────
beforeAll(async () => {
  const uri = process.env['MONGO_URI']
  if (!uri) throw new Error('MONGO_URI not set — globalSetup must run first')
  await mongoose.connect(uri)
})

// ── Wipe all collections before each individual test ──────────────────────
beforeEach(async () => {
  const collections = mongoose.connection.collections
  for (const key in collections) {
    await collections[key]!.deleteMany({})
  }
})

// ── Disconnect after all tests in this file ────────────────────────────────
afterAll(async () => {
  await mongoose.disconnect()
})
