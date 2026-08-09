/**
 * testAuditAndWindow.ts
 *
 * End-to-end integration test verifying the 24-hour edit window,
 * Admin override, and Audit Logging.
 *
 * Run with:
 *   npx ts-node -r tsconfig-paths/register src/scripts/testAuditAndWindow.ts
 */
import dotenv from 'dotenv'
dotenv.config()

import http from 'http'
import mongoose from 'mongoose'
import app from '../app'
import { connectDB } from '../config/database'
import { DailyProgressReport } from '../models/DailyProgressReport'
import { ReportPhoto } from '../models/ReportPhoto'
import { AuditLog } from '../models/AuditLog'
import { User } from '../models/User'
import { Project } from '../models/Project'

// ANSI colour helpers
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
const header = (msg: string) => console.log(`\n${c.bold}${c.cyan}── ${msg} ${'─'.repeat(Math.max(0, 60 - msg.length))}${c.reset}`)

async function runTest() {
  console.log(`\n${c.bold}╔════════════════════════════════════════════════════════════╗${c.reset}`)
  console.log(`${c.bold}║   SiteTrack · Audit Logging & 24h Window Integration Test  ║${c.reset}`)
  console.log(`${c.bold}╚════════════════════════════════════════════════════════════╝\n`)

  await connectDB()
  info('Connected to MongoDB')

  // Find users and project
  const project = await Project.findOne({ name: 'Metro Extension Phase 1' })
  if (!project) {
    err('Test project "Metro Extension Phase 1" not found. Run seedTestEngineer.ts first.')
    process.exit(1)
  }

  // Start test server
  const server = http.createServer(app)
  await new Promise<void>((resolve) => server.listen(0, resolve))
  const port = (server.address() as any).port
  const base = `http://localhost:${port}/api`
  ok(`Test server running on port ${port}`)

  try {
    // ── 1. Logins ────────────────────────────────────────────────────────────
    header('1. Authenticating Users')

    // Engineer login
    const engLoginRes = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'engineer@sitetrack.dev', password: 'Engineer@123' }),
    })
    const engLoginData = (await engLoginRes.json()) as any
    if (!engLoginRes.ok) throw new Error(`Engineer login failed: ${JSON.stringify(engLoginData)}`)
    const engineerToken = engLoginData.token
    ok(`Logged in as Site Engineer (engineer@sitetrack.dev)`)

    // Admin login
    const adminLoginRes = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@sitetrack.dev', password: 'Admin@123' }),
    })
    const adminLoginData = (await adminLoginRes.json()) as any
    if (!adminLoginRes.ok) throw new Error(`Admin login failed: ${JSON.stringify(adminLoginData)}`)
    const adminToken = adminLoginData.token
    ok(`Logged in as Admin (admin@sitetrack.dev)`)

    // ── 2. Submit a fresh DPR ────────────────────────────────────────────────
    header('2. Submitting Fresh DPR as Engineer')

    // Ensure no duplicate for today's test date (using a specific date to avoid conflict)
    const testDateStr = '2026-11-11'
    const reportDate = new Date(testDateStr)
    const startOfDay = new Date(reportDate)
    startOfDay.setUTCHours(0, 0, 0, 0)
    const endOfDay = new Date(reportDate)
    endOfDay.setUTCHours(23, 59, 59, 999)

    await DailyProgressReport.deleteMany({
      projectId: project._id,
      date: { $gte: startOfDay, $lte: endOfDay },
    })

    const form = new FormData()
    form.append('projectId', String(project._id))
    form.append('date', testDateStr)
    form.append('workDone', 'Excavation of trench section T4-T8. Slurry wall reinforcement initialized.')
    form.append('labourSkilled', '4')
    form.append('labourUnskilled', '8')
    form.append('labourOperators', '1')

    const createRes = await fetch(`${base}/reports`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${engineerToken}` },
      body: form,
    })
    const createData = (await createRes.json()) as any
    if (createRes.status !== 201) {
      throw new Error(`DPR creation failed: ${JSON.stringify(createData)}`)
    }
    const reportId = createData.data._id
    ok(`DPR created. ID: ${reportId}`)

    // ── 3. Edit within 24 hours (Site Engineer) ──────────────────────────────
    header('3. Testing Site Engineer edit WITHIN 24-hour window')

    const editForm = new FormData()
    editForm.append('workDone', 'Excavation of trench section T4-T8 completed. Slurry wall reinforcement updated.')
    editForm.append('labourSkilled', '5') // changed from 4 to 5

    const editRes = await fetch(`${base}/reports/${reportId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${engineerToken}` },
      body: editForm,
    })
    const editData = (await editRes.json()) as any
    console.log(`Response Status: ${editRes.status} (Expected: 200)`)
    if (editRes.status !== 200) {
      throw new Error(`Direct edit within 24h window failed: ${JSON.stringify(editData)}`)
    }
    ok(`DPR edited successfully by Site Engineer!`)

    // Fetch and print the created AuditLog document
    const engineerAudit = await AuditLog.findOne({ entityId: reportId, action: 'engineer_edit' }).lean()
    if (!engineerAudit) {
      throw new Error('Audit log entry for engineer_edit was not created!')
    }
    ok('AuditLog entry created for engineer_edit. Document details:')
    console.log(JSON.stringify(engineerAudit, null, 2))

    // ── 4. Force report to be older than 24 hours ────────────────────────────
    header('4. Simulating DPR older than 24 hours')
    
    // Set createdAt back by 26 hours
    const oldDate = new Date(Date.now() - 26 * 60 * 60 * 1000)
    await DailyProgressReport.findByIdAndUpdate(reportId, { createdAt: oldDate })
    ok(`Report createdAt field updated to: ${oldDate.toISOString()}`)

    // ── 5. Attempt direct edit after 24 hours (Site Engineer) ────────────────
    header('5. Testing Site Engineer edit AFTER 24-hour window')

    const lateEditForm = new FormData()
    lateEditForm.append('workDone', 'Late attempt to edit without permission.')

    const lateEditRes = await fetch(`${base}/reports/${reportId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${engineerToken}` },
      body: lateEditForm,
    })
    const lateEditData = (await lateEditRes.json()) as any
    console.log(`Response Status: ${lateEditRes.status} (Expected: 403)`)
    console.log(`Response Message: "${lateEditData.message}"`)
    
    if (lateEditRes.status === 403 && lateEditData.message.includes('older than 24 hours')) {
      ok('Direct edit correctly rejected with 403 Forbidden!')
    } else {
      throw new Error(`Expected edit to fail with 403, got status ${lateEditRes.status}: ${JSON.stringify(lateEditData)}`)
    }

    // ── 6. Admin override edit after 24 hours (Admin) ────────────────────────
    header('6. Testing Admin Override edit on old DPR')

    const adminEditForm = new FormData()
    adminEditForm.append('workDone', 'Excavation completed. Inspected and approved by Admin override.')
    adminEditForm.append('remarks', 'Direct correction of information.')

    const adminEditRes = await fetch(`${base}/reports/${reportId}/admin-edit`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: adminEditForm,
    })
    const adminEditData = (await adminEditRes.json()) as any
    console.log(`Response Status: ${adminEditRes.status} (Expected: 200)`)
    if (adminEditRes.status !== 200) {
      throw new Error(`Admin edit override failed: ${JSON.stringify(adminEditData)}`)
    }
    ok('DPR successfully updated by Admin override!')

    // ── 7. Get full audit log history (Admin) ────────────────────────────────
    header('7. Fetching full Audit History for the DPR')

    const historyRes = await fetch(`${base}/reports/${reportId}/audit`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    const historyData = (await historyRes.json()) as any
    console.log(`Response Status: ${historyRes.status} (Expected: 200)`)
    if (historyRes.status !== 200) {
      throw new Error(`Failed to fetch audit history: ${JSON.stringify(historyData)}`)
    }

    ok(`Audit history retrieved. Log documents count: ${historyData.data.length}`)
    console.log('\n--- Live Audit Log Documents from Database ---')
    console.log(JSON.stringify(historyData.data, null, 2))
    console.log('----------------------------------------------\n')

    // Verify both logs exist
    const actions = historyData.data.map((log: any) => log.action)
    if (actions.includes('engineer_edit') && actions.includes('admin_edit_after_window')) {
      ok('Both "engineer_edit" and "admin_edit_after_window" audit entries verified in database! ✓')
    } else {
      throw new Error(`Audit log is missing expected actions. Found actions: ${actions.join(', ')}`)
    }

    console.log(`\n${c.bold}${c.green}🎉 ALL AUDIT & WINDOW INTEGRATION TESTS PASSED SUCCESSFULLY!${c.reset}\n`)

  } finally {
    server.close()
    await mongoose.disconnect()
    info('Server closed, MongoDB disconnected')
  }
}

runTest().catch((error) => {
  err(`Test suite failed: ${error.message}`)
  console.error(error)
  process.exit(1)
})
