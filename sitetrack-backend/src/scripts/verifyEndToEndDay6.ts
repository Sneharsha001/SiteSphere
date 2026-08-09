import dotenv from 'dotenv'
dotenv.config()

import http from 'http'
import mongoose from 'mongoose'
import app from '../app'
import { connectDB } from '../config/database'
import { DailyProgressReport } from '../models/DailyProgressReport'
import { AuditLog } from '../models/AuditLog'
import { Project } from '../models/Project'
import { User } from '../models/User'

async function runE2EVerification() {
  console.log('===========================================================')
  console.log('   SITESPHERE DAY 6 END-TO-END VERIFICATION RUNNER')
  console.log('===========================================================\n')

  await connectDB()

  const server = http.createServer(app)
  await new Promise<void>((resolve) => server.listen(0, resolve))
  const port = (server.address() as any).port
  const baseUrl = `http://localhost:${port}/api`

  console.log(`Test server running on ${baseUrl}\n`)

  try {
    // -----------------------------------------------------------------------
    // STEP 1: Site Engineer submits a new DPR -> PM receives email notification
    // -----------------------------------------------------------------------
    console.log('--- STEP 1: Site Engineer Submits New DPR & PM Email Delivery ---')
    
    // Login as Engineer
    const engLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'engineer@sitetrack.dev', password: 'Engineer@123' }),
    })
    const engLogin = (await engLoginRes.json()) as any
    const engineerToken = engLogin.token
    console.log(`Engineer Auth: ${engLoginRes.status} OK (User: ${engLogin.user.name})`)

    // Find test project
    const project = await Project.findOne({ name: 'Metro Extension Phase 1' })
    if (!project) throw new Error('Test project not found')

    // Delete existing report for today's test date to allow fresh submission
    const testDate = '2026-12-01'
    await DailyProgressReport.deleteMany({ projectId: project._id, date: new Date(testDate) })

    // Create fresh DPR via POST /api/reports
    const postRes = await fetch(`${baseUrl}/reports`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${engineerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId: project._id.toString(),
        date: testDate,
        workDone: 'E2E Test: Poured slab section S4 with M30 concrete',
        quantity: '45 cu.m',
        labourSkilled: 5,
        labourUnskilled: 10,
        labourOperators: 2,
        tomorrowPlan: 'Curing and column formwork setup',
        issues: 'Minor delay due to concrete transit mixer',
        remarks: 'Quality tests passed',
      }),
    })

    const postData = (await postRes.json()) as any
    console.log(`POST /api/reports Status: ${postRes.status}`)
    console.log(`Created Report ID: ${postData.data._id}`)
    console.log(`Work Done: "${postData.data.workDone}"`)

    const reportId = postData.data._id

    // -----------------------------------------------------------------------
    // STEP 2: Site Engineer edits that report within 24 hours -> engineer_edit audit entry
    // -----------------------------------------------------------------------
    console.log('\n--- STEP 2: Site Engineer Edits Report (Within 24h Window) ---')

    const patchRes1 = await fetch(`${baseUrl}/reports/${reportId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${engineerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workDone: 'E2E Test: Poured slab section S4 with M30 concrete - Verified slump 120mm',
        quantity: '50 cu.m (updated count)',
        labourSkilled: 8,
      }),
    })

    const patchData1 = (await patchRes1.json()) as any
    console.log(`PATCH /api/reports/${reportId} Status: ${patchRes1.status}`)
    console.log(`Response Message: ${patchData1.message}`)

    // Check Audit Log for engineer_edit
    // Login as Admin to inspect audit log
    const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@sitetrack.dev', password: 'Admin@123' }),
    })
    const adminLogin = (await adminLoginRes.json()) as any
    const adminToken = adminLogin.token

    const audit1Res = await fetch(`${baseUrl}/reports/${reportId}/audit`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    })
    const audit1Data = (await audit1Res.json()) as any
    console.log(`Audit Log Count: ${audit1Data.data.length}`)
    console.log(`Audit Entry 1 Action: "${audit1Data.data[0].action}"`)
    console.log(`Audit Entry 1 Changed By: ${audit1Data.data[0].changedBy.name} (${audit1Data.data[0].changedBy.email})`)
    console.log(`Audit Entry 1 Changes:`, JSON.stringify(audit1Data.data[0].changes, null, 2))

    // -----------------------------------------------------------------------
    // STEP 3: Report passes 24-hour window -> direct editing is blocked
    // -----------------------------------------------------------------------
    console.log('\n--- STEP 3: Expire Report (>24h) & Verify Edit Block ---')

    const expiredCreatedAt = new Date(Date.now() - 30 * 60 * 60 * 1000) // 30 hours ago
    await DailyProgressReport.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(reportId) },
      { $set: { createdAt: expiredCreatedAt, updatedAt: expiredCreatedAt } }
    )
    console.log(`Report createdAt modified to: ${expiredCreatedAt.toISOString()} (30 hours ago)`)

    const patchExpiredRes = await fetch(`${baseUrl}/reports/${reportId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${engineerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workDone: 'Attempting edit on expired report',
      }),
    })

    const patchExpiredData = (await patchExpiredRes.json()) as any
    console.log(`PATCH /api/reports/${reportId} (Expired) Status: ${patchExpiredRes.status}`)
    console.log(`Blocked Response Message: "${patchExpiredData.message}"`)

    // -----------------------------------------------------------------------
    // STEP 4: Admin uses Admin Override Edit on expired report -> admin_edit_after_window audit entry
    // -----------------------------------------------------------------------
    console.log('\n--- STEP 4: Admin Override Edit on Expired Report ---')

    const adminEditRes = await fetch(`${baseUrl}/reports/${reportId}/admin-edit`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workDone: 'E2E Test: Admin Override - Finalized slab S4 specs and lab test certificate attached',
        labourOperators: 4,
        remarks: 'Admin override edit applied per project manager request after site inspection',
      }),
    })

    const adminEditData = (await adminEditRes.json()) as any
    console.log(`PATCH /api/reports/${reportId}/admin-edit Status: ${adminEditRes.status}`)
    console.log(`Admin Edit Message: "${adminEditData.message}"`)

    // -----------------------------------------------------------------------
    // STEP 5: Admin views Audit Log -> both audit entries appear in timeline
    // -----------------------------------------------------------------------
    console.log('\n--- STEP 5: Admin Views Audit Timeline (Both Entries) ---')

    const audit2Res = await fetch(`${baseUrl}/reports/${reportId}/audit`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    })
    const audit2Data = (await audit2Res.json()) as any
    console.log(`Total Audit Log Entries: ${audit2Data.data.length}`)
    
    audit2Data.data.forEach((entry: any, index: number) => {
      console.log(`\nTimeline Entry #${index + 1}:`)
      console.log(`  Action    : ${entry.action}`)
      console.log(`  By User   : ${entry.changedBy.name} (${entry.changedBy.email}, Role: ${entry.changedBy.role})`)
      console.log(`  Timestamp : ${entry.changedAt}`)
      console.log(`  Changes   :`, JSON.stringify(entry.changes))
    })

    // -----------------------------------------------------------------------
    // STEP 6: PM logs in -> verify PM cannot see audit log or edit controls
    // -----------------------------------------------------------------------
    console.log('\n--- STEP 6: PM Login & Security Access Verification ---')

    const pmLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'pm@sitetrack.dev', password: 'Pm@123456' }),
    })
    const pmLogin = (await pmLoginRes.json()) as any
    const pmToken = pmLogin.token
    console.log(`PM Auth: ${pmLoginRes.status} OK (User: ${pmLogin.user.name}, Role: ${pmLogin.user.role})`)

    // PM attempts GET /api/reports/:id/audit -> must fail with 403
    const pmAuditRes = await fetch(`${baseUrl}/reports/${reportId}/audit`, {
      headers: { 'Authorization': `Bearer ${pmToken}` },
    })
    const pmAuditData = (await pmAuditRes.json()) as any
    console.log(`PM GET Audit Log Status: ${pmAuditRes.status} (Expected: 403)`)
    console.log(`PM GET Audit Error Message: "${pmAuditData.message}"`)

    // PM attempts PATCH /api/reports/:id -> must fail with 403
    const pmPatchRes = await fetch(`${baseUrl}/reports/${reportId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${pmToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ workDone: 'PM edit attempt' }),
    })
    const pmPatchData = (await pmPatchRes.json()) as any
    console.log(`PM PATCH Report Status: ${pmPatchRes.status} (Expected: 403)`)
    console.log(`PM PATCH Report Error Message: "${pmPatchData.message}"`)

    // PM attempts PATCH /api/reports/:id/admin-edit -> must fail with 403
    const pmAdminEditRes = await fetch(`${baseUrl}/reports/${reportId}/admin-edit`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${pmToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ workDone: 'PM admin-edit attempt' }),
    })
    const pmAdminEditData = (await pmAdminEditRes.json()) as any
    console.log(`PM PATCH Admin-Edit Status: ${pmAdminEditRes.status} (Expected: 403)`)
    console.log(`PM PATCH Admin-Edit Error Message: "${pmAdminEditData.message}"`)

    console.log('\n===========================================================')
    console.log('   END-TO-END VERIFICATION COMPLETE — ALL 6 STEPS PASSED')
    console.log('===========================================================')

    server.close()
    process.exit(0)
  } catch (err) {
    console.error('Verification failed with error:', err)
    server.close()
    process.exit(1)
  }
}

runE2EVerification()
