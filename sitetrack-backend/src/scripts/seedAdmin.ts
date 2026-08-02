/**
 * seedAdmin.ts
 *
 * One-time seed script — creates an Organization and an Admin user.
 * Run with:  npm run seed
 *
 * Safe to re-run — uses upsert so it won't duplicate records.
 */

import dotenv from 'dotenv'
dotenv.config()

import mongoose from 'mongoose'
import bcrypt from 'bcrypt'
import { Organization } from '../models/Organization'
import { User } from '../models/User'
import { connectDB } from '../config/database'

// ── Seed configuration — change here if needed ────────────────────────────

const SEED_ORG_NAME = 'SiteTrack HQ'
const SEED_ADMIN_EMAIL = 'admin@sitetrack.dev'
const SEED_ADMIN_PASSWORD = 'Admin@123'
const SEED_ADMIN_NAME = 'System Administrator'

// ─────────────────────────────────────────────────────────────────────────

async function seed(): Promise<void> {
  console.log('\n🌱  SiteTrack — Admin Seed Script')
  console.log('──────────────────────────────────')

  await connectDB()

  // ── 1. Create or find Organization ───────────────────────────────────
  let org = await Organization.findOne({ name: SEED_ORG_NAME })
  if (!org) {
    org = await Organization.create({ name: SEED_ORG_NAME })
    console.log(`✅  Organization created: "${SEED_ORG_NAME}"`)
  } else {
    console.log(`ℹ️   Organization already exists: "${SEED_ORG_NAME}"`)
  }

  // ── 2. Create or update Admin user ───────────────────────────────────
  const passwordHash = await bcrypt.hash(SEED_ADMIN_PASSWORD, 12)

  const existingUser = await User.findOne({ email: SEED_ADMIN_EMAIL })

  let user
  if (!existingUser) {
    user = await User.create({
      orgId: org._id,
      name: SEED_ADMIN_NAME,
      email: SEED_ADMIN_EMAIL,
      passwordHash,
      role: 'admin',
      status: 'active',
    })
    console.log(`✅  Admin user created`)
  } else {
    // Update password hash in case the script is re-run to reset credentials
    existingUser.passwordHash = passwordHash
    await existingUser.save()
    user = existingUser
    console.log(`ℹ️   Admin user already exists — password reset to seed value`)
  }

  // ── 3. Print credentials ─────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════╗')
  console.log('║        🔑  Seed Admin Credentials        ║')
  console.log('╠══════════════════════════════════════════╣')
  console.log(`║  Email   : ${SEED_ADMIN_EMAIL.padEnd(29)}║`)
  console.log(`║  Password: ${SEED_ADMIN_PASSWORD.padEnd(29)}║`)
  console.log('╠══════════════════════════════════════════╣')
  console.log(`║  User ID : ${(user._id as mongoose.Types.ObjectId).toString().padEnd(29)}║`)
  console.log(`║  Org ID  : ${(org._id as mongoose.Types.ObjectId).toString().padEnd(29)}║`)
  console.log(`║  Role    : ${'admin'.padEnd(29)}║`)
  console.log('╚══════════════════════════════════════════╝')
  console.log('\n🚀  Login endpoint: POST /api/auth/login')
  console.log('    Body: { "email": "admin@sitetrack.dev", "password": "Admin@123" }')
  console.log()
}

seed()
  .then(() => {
    console.log('✔  Seed completed successfully\n')
    process.exit(0)
  })
  .catch((err) => {
    console.error('✖  Seed failed:', err)
    process.exit(1)
  })
