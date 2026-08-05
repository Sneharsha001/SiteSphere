import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import http from 'http'
import mongoose from 'mongoose'
import app from '../app'
import { connectDB } from '../config/database'
import { DailyProgressReport } from '../models/DailyProgressReport'
import { ReportPhoto } from '../models/ReportPhoto'

async function runDprApiTest() {
  console.log('\n🧪  Starting DPR API Integration Test Suite')
  console.log('──────────────────────────────────────────')

  await connectDB()

  // Clean up previous test DPRs for test project to ensure fresh test runs
  const testProjectId = '6a72c2fa3cb3e9cebf96b114'
  const oldReports = await DailyProgressReport.find({ projectId: testProjectId }).select('_id')
  const oldReportIds = oldReports.map((r) => r._id)
  await ReportPhoto.deleteMany({ reportId: { $in: oldReportIds } })
  await DailyProgressReport.deleteMany({ projectId: testProjectId })

  // Start temporary HTTP server on random port
  const server = http.createServer(app)
  await new Promise<void>((resolve) => server.listen(0, resolve))
  const port = (server.address() as any).port
  const baseUrl = `http://localhost:${port}/api`
  console.log(`📡 Test server running on http://localhost:${port}`)

  try {
    // ── 1. Login as Admin ──────────────────────────────────────────────
    console.log('\n1. Logging in as Admin...')
    const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@sitetrack.dev', password: 'Admin@123' }),
    })
    const adminLoginData = (await adminLoginRes.json()) as any
    if (!adminLoginRes.ok) throw new Error(`Admin login failed: ${JSON.stringify(adminLoginData)}`)
    const adminToken = adminLoginData.token
    console.log('✅ Admin login successful')

    // ── 2. Login as Site Engineer ──────────────────────────────────────
    console.log('\n2. Logging in as Site Engineer (engineer@sitetrack.dev)...')
    const engLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'engineer@sitetrack.dev', password: 'Engineer@123' }),
    })
    const engLoginData = (await engLoginRes.json()) as any
    if (!engLoginRes.ok) throw new Error(`Engineer login failed: ${JSON.stringify(engLoginData)}`)
    const engineerToken = engLoginData.token
    console.log('✅ Site Engineer login successful')

    // ── 3. Test Role Enforcement: Admin cannot submit DPR ──────────────
    console.log('\n3. Testing Role Enforcement (Admin POST /api/reports)...')
    const adminPostRes = await fetch(`${baseUrl}/reports`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    const adminPostData = await adminPostRes.json()
    console.log(`Response Status: ${adminPostRes.status} (Expected: 403)`)
    if (adminPostRes.status !== 403) throw new Error(`Expected 403 for admin submission, got ${adminPostRes.status}`)
    console.log('✅ Admin submission rejected with 403 Forbidden as expected')

    // ── 4. Test Validation: Missing required fields ────────────────────
    console.log('\n4. Testing Zod Validation (Missing workDone and date)...')
    const emptyForm = new FormData()
    emptyForm.append('projectId', testProjectId)
    const valRes = await fetch(`${baseUrl}/reports`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${engineerToken}` },
      body: emptyForm,
    })
    const valData = (await valRes.json()) as any
    console.log(`Response Status: ${valRes.status} (Expected: 400)`)
    console.log(`Validation Error Message: ${valData.message}`)
    if (valRes.status !== 400) throw new Error(`Expected 400 for invalid body, got ${valRes.status}`)
    console.log('✅ Zod validation correctly rejected invalid payload with 400')

    // ── 5. Submit valid DPR with 2 Photos ─────────────────────────────
    console.log('\n5. Submitting valid DPR with 2 Photos (Multipart/Form-Data)...')
    const form = new FormData()
    form.append('projectId', testProjectId)
    form.append('date', '2026-08-05')
    form.append('workDone', 'Poured 120m3 of reinforced concrete for column base C1-C8')
    form.append('quantity', '120 m3')
    form.append('labourSkilled', '8')
    form.append('labourUnskilled', '15')
    form.append('labourOperators', '3')
    form.append('tomorrowPlan', 'Rebar placement for beam B4')
    form.append('issues', 'Minor delay in RMC transit due to traffic')
    form.append('remarks', 'Safety inspection passed')

    // Attach 2 sample photo buffers as File blobs
    const img1Buffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    )
    const img2Buffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    )
    const blob1 = new Blob([img1Buffer], { type: 'image/png' })
    const blob2 = new Blob([img2Buffer], { type: 'image/png' })

    form.append('photos', blob1, 'site_photo_1.png')
    form.append('photos', blob2, 'site_photo_2.png')

    const createRes = await fetch(`${baseUrl}/reports`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${engineerToken}` },
      body: form,
    })

    const createData = (await createRes.json()) as any
    console.log(`Response Status: ${createRes.status} (Expected: 201)`)
    if (createRes.status !== 201) throw new Error(`Create DPR failed: ${JSON.stringify(createData)}`)

    const createdReportId = createData.data._id
    console.log(`✅ DPR Created Successfully! ID: ${createdReportId}`)
    console.log(`   Photos uploaded (${createData.data.photos.length}):`)
    createData.data.photos.forEach((p: any, idx: number) => {
      console.log(`   Photo ${idx + 1}: ${p.fileUrl}`)
    })

    if (!createData.data.photos || createData.data.photos.length !== 2) {
      throw new Error(`Expected 2 photo URLs, got ${createData.data.photos?.length}`)
    }

    // ── 6. Test Duplicate Rejection ────────────────────────────────────
    console.log('\n6. Testing Duplicate Submission Rejection (Same Project + Date)...')
    const dupForm = new FormData()
    dupForm.append('projectId', testProjectId)
    dupForm.append('date', '2026-08-05')
    dupForm.append('workDone', 'Duplicate report attempt')

    const dupRes = await fetch(`${baseUrl}/reports`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${engineerToken}` },
      body: dupForm,
    })
    const dupData = (await dupRes.json()) as any
    console.log(`Response Status: ${dupRes.status} (Expected: 400)`)
    console.log(`Duplicate Error Message: ${dupData.message}`)
    if (dupRes.status !== 400) throw new Error(`Expected 400 for duplicate DPR, got ${dupRes.status}`)
    console.log('✅ Duplicate submission correctly blocked with clear error message')

    // ── 7. Test GET /api/reports ──────────────────────────────────────
    console.log('\n7. Testing GET /api/reports (List DPRs)...')
    const listRes = await fetch(`${baseUrl}/reports?projectId=${testProjectId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${engineerToken}` },
    })
    const listData = (await listRes.json()) as any
    console.log(`Response Status: ${listRes.status} (Expected: 200)`)
    console.log(`Found ${listData.count} DPRs in list`)
    if (listRes.status !== 200 || listData.count < 1) throw new Error('GET /api/reports failed')
    console.log('✅ GET /api/reports returns DPR list with photos')

    // ── 8. Test GET /api/reports/:id ──────────────────────────────────
    console.log(`\n8. Testing GET /api/reports/${createdReportId} (Single DPR Detail)...`)
    const detailRes = await fetch(`${baseUrl}/reports/${createdReportId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${engineerToken}` },
    })
    const detailData = (await detailRes.json()) as any
    console.log(`Response Status: ${detailRes.status} (Expected: 200)`)
    if (detailRes.status !== 200) throw new Error('GET /api/reports/:id failed')
    console.log(`✅ Single DPR retrieved. Work Done: "${detailData.data.workDone}"`)
    console.log(`   Photo URLs stored in DB (${detailData.data.photos.length}):`)
    detailData.data.photos.forEach((p: any, idx: number) => {
      console.log(`   [${idx + 1}] ${p.fileUrl}`)
    })

    console.log('\n🎉  ALL TEST ASSERTIONS PASSED SUCCESSFULLY!\n')
  } finally {
    server.close()
    await mongoose.disconnect()
  }
}

runDprApiTest().catch((err) => {
  console.error('\n❌  API TEST SUITE FAILED:', err)
  process.exit(1)
})
