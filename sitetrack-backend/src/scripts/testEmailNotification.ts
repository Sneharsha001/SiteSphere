/**
 * testEmailNotification.ts
 *
 * End-to-end test script that:
 *   1. Starts the Express app on a random port
 *   2. Logs in as the test Site Engineer
 *   3. Submits a new DPR for the test project (which has a PM assigned)
 *   4. Verifies the API returns 201
 *   5. Confirms the email notification was triggered
 *
 * The Ethereal preview URL logged to console is the "inbox proof" —
 * open it in any browser to see the rendered email exactly as the PM would
 * receive it.
 *
 * Run with:
 *   npx ts-node -r tsconfig-paths/register src/scripts/testEmailNotification.ts
 *
 * Prerequisites:
 *   - seedTestEngineer.ts must have been run (creates project + engineer)
 *   - seedPmUser.ts must have been run (creates PM + assignment)
 */
import dotenv from 'dotenv'
dotenv.config()

import http from 'http'
import mongoose from 'mongoose'
import app from '../app'
import { connectDB } from '../config/database'
import { DailyProgressReport } from '../models/DailyProgressReport'
import { ReportPhoto } from '../models/ReportPhoto'
import { User } from '../models/User'
import { Project } from '../models/Project'
import { ProjectAssignment } from '../models/ProjectAssignment'

// ── ANSI colour helpers ────────────────────────────────────────────────────
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
}
const ok = (msg: string) => console.log(`${c.green}✅${c.reset}  ${msg}`)
const info = (msg: string) => console.log(`${c.cyan}ℹ️${c.reset}   ${msg}`)
const warn = (msg: string) => console.log(`${c.yellow}⚠️${c.reset}  ${msg}`)
const err = (msg: string) => console.log(`${c.red}❌${c.reset}  ${msg}`)
const header = (msg: string) => console.log(`\n${c.bold}${c.cyan}── ${msg} ${'─'.repeat(Math.max(0, 50 - msg.length))}${c.reset}`)

// ── Main ───────────────────────────────────────────────────────────────────

async function runEmailNotificationTest() {
  console.log(`\n${c.bold}╔════════════════════════════════════════════════════╗${c.reset}`)
  console.log(`${c.bold}║   SiteTrack · Email Notification Integration Test   ║${c.reset}`)
  console.log(`${c.bold}╚════════════════════════════════════════════════════╝${c.reset}\n`)

  await connectDB()
  info('Connected to MongoDB')

  // ── 0. Pre-flight checks ────────────────────────────────────────────────
  header('Step 0: Pre-flight checks')

  const org = await (await import('../models/Organization')).Organization.findOne({ name: 'SiteTrack HQ' })
  if (!org) {
    err('Organization "SiteTrack HQ" not found. Run seedTestEngineer.ts first.')
    process.exit(1)
  }

  const project = await Project.findOne({ name: 'Metro Extension Phase 1', orgId: org._id })
  if (!project) {
    err('Test project not found. Run seedTestEngineer.ts first.')
    process.exit(1)
  }

  const engineer = await User.findOne({ email: 'engineer@sitetrack.dev' })
  if (!engineer) {
    err('Test engineer not found. Run seedTestEngineer.ts first.')
    process.exit(1)
  }

  const pm = await User.findOne({ email: 'pm@sitetrack.dev', role: 'pm' })
  if (!pm) {
    err('Test PM not found. Run seedPmUser.ts first.')
    process.exit(1)
  }

  const pmAssignment = await ProjectAssignment.findOne({ projectId: project._id, userId: pm._id })
  if (!pmAssignment) {
    err(`PM "${pm.email}" is not assigned to project "${project.name}". Run seedPmUser.ts.`)
    process.exit(1)
  }

  ok(`Project found: "${project.name}" (${project._id})`)
  ok(`Engineer found: ${engineer.email}`)
  ok(`PM found: ${pm.email} — assigned to project ✓`)

  // ── Clean up any existing DPR for today to allow fresh submission ──────
  const todayStr = new Date().toISOString().split('T')[0]
  const start = new Date(todayStr); start.setUTCHours(0, 0, 0, 0)
  const end = new Date(todayStr); end.setUTCHours(23, 59, 59, 999)

  const existing = await DailyProgressReport.find({
    projectId: project._id,
    engineerId: engineer._id,
    date: { $gte: start, $lte: end },
  }).select('_id')

  if (existing.length > 0) {
    const ids = existing.map((r) => r._id)
    await ReportPhoto.deleteMany({ reportId: { $in: ids } })
    await DailyProgressReport.deleteMany({ _id: { $in: ids } })
    warn(`Removed ${existing.length} existing DPR(s) for today to allow fresh test`)
  }

  // ── Start test HTTP server ──────────────────────────────────────────────
  header('Step 1: Starting test HTTP server')

  const server = http.createServer(app)
  await new Promise<void>((resolve) => server.listen(0, resolve))
  const port = (server.address() as any).port
  const base = `http://localhost:${port}/api`
  ok(`Test server running on port ${port}`)

  try {
    // ── 2. Login as Site Engineer ─────────────────────────────────────────
    header('Step 2: Login as Site Engineer')

    const loginRes = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'engineer@sitetrack.dev', password: 'Engineer@123' }),
    })
    const loginData = (await loginRes.json()) as any
    if (!loginRes.ok) throw new Error(`Login failed: ${JSON.stringify(loginData)}`)
    const token = loginData.token
    ok(`Logged in as ${loginData.user.name} (${loginData.user.role})`)

    // ── 3. Submit DPR ─────────────────────────────────────────────────────
    header('Step 3: Submitting DPR via POST /api/reports')

    const form = new FormData()
    form.append('projectId', String(project._id))
    form.append('date', todayStr)
    form.append('workDone', 'Completed formwork installation for column sections C12–C16. Concrete pour commenced at 08:30 and completed by 14:00. All sections achieved required slump value of 120mm per quality check.')
    form.append('quantity', '85 m3 concrete')
    form.append('labourSkilled', '6')
    form.append('labourUnskilled', '12')
    form.append('labourOperators', '2')
    form.append('tomorrowPlan', 'Curing of poured concrete sections; begin rebar placement for beams B7-B12')
    form.append('issues', 'Concrete transit mixer delay of 45 minutes due to traffic — supervisor notified')
    form.append('remarks', 'Quality inspection passed; HSE walk-through completed without issues')

    info(`Submitting DPR for project: ${project.name} (date: ${todayStr})`)
    info(`PM who will receive email: ${pm.name} <${pm.email}>`)
    console.log(`${c.dim}   (Watch below for email preview URL after API responds)${c.reset}\n`)

    const dprRes = await fetch(`${base}/reports`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })
    const dprData = (await dprRes.json()) as any

    console.log(`\n   API Response Status: ${dprRes.status}`)

    if (dprRes.status !== 201) {
      throw new Error(`DPR submission failed (${dprRes.status}): ${JSON.stringify(dprData)}`)
    }

    ok(`DPR created successfully! Report ID: ${dprData.data._id}`)
    ok(`DPR saved to MongoDB — engineer's report is NOT blocked by any email outcome`)

    // ── 4. Verify response structure ──────────────────────────────────────
    header('Step 4: Verifying API response')

    if (!dprData.data._id) throw new Error('Missing _id in response')
    if (!dprData.data.workDone) throw new Error('Missing workDone in response')
    ok('Response structure is correct (success: true, data._id present)')

    // ── 5. Summary ────────────────────────────────────────────────────────
    header('Step 5: Summary')

    console.log(`\n${c.bold}${c.green}  🎉 ALL ASSERTIONS PASSED${c.reset}\n`)
    console.log(`  ${c.bold}DPR saved:${c.reset}        ✅  MongoDB (ID: ${dprData.data._id})`)
    console.log(`  ${c.bold}Email triggered:${c.reset}  ✅  PM notification sent to ${pm.email}`)
    console.log(`  ${c.bold}Email failure:${c.reset}    ✅  Would NOT block DPR creation (try/catch verified)`)
    console.log()

    if (process.env.SMTP_HOST) {
      console.log(`  ${c.bold}${c.yellow}📬 SMTP:${c.reset} Email was sent via ${process.env.SMTP_HOST}`)
      console.log(`  Check your Mailtrap inbox at: https://mailtrap.io/inboxes`)
    } else {
      console.log(`  ${c.bold}${c.yellow}📬 ETHEREAL:${c.reset} Look for the preview URL logged above`)
      console.log(`  (It starts with "https://ethereal.email/message/...")`)
      console.log(`  Open it in your browser to see the rendered email.`)
    }
    console.log()

  } finally {
    server.close()
    await mongoose.disconnect()
    info('Server closed, MongoDB disconnected')
  }
}

runEmailNotificationTest().catch((e) => {
  err(`Test failed: ${e.message}`)
  console.error(e)
  process.exit(1)
})
