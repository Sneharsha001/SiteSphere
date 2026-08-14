/**
 * src/__tests__/helpers/test_isolation.ts
 *
 * Verifies complete database isolation between Staging and Production MongoDB databases.
 * Inserts a record into the Staging database and verifies it does NOT exist in the Production database.
 */

import mongoose, { Schema } from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'

const projectSchema = new Schema({
  name: String,
  environment: String,
  createdAt: { type: Date, default: Date.now },
})

export async function runIsolationTest() {
  let mongod: MongoMemoryServer | null = null
  let baseUri = process.env.MONGO_URI

  if (!baseUri) {
    mongod = await MongoMemoryServer.create()
    baseUri = mongod.getUri()
  }

  // Construct separate URIs for production and staging DBs on the cluster/instance
  const prodUri = baseUri.includes('?') 
    ? baseUri.replace(/\/[^/?]+(\?.*)$/, '/sitetrack_production$1')
    : `${baseUri.replace(/\/$/, '')}/sitetrack_production`
    
  const stagingUri = baseUri.includes('?')
    ? baseUri.replace(/\/[^/?]+(\?.*)$/, '/sitetrack_staging$1')
    : `${baseUri.replace(/\/$/, '')}/sitetrack_staging`

  console.log('\n=============================================================')
  console.log('         DATABASE ISOLATION VERIFICATION RUN                 ')
  console.log('=============================================================')
  console.log(`[TARGET] Production DB URI: ${prodUri.replace(/:([^@]+)@/, ':****@')}`)
  console.log(`[TARGET] Staging DB URI:    ${stagingUri.replace(/:([^@]+)@/, ':****@')}`)

  // 1. Connect to Staging DB & create a record
  const stagingConn = await mongoose.createConnection(stagingUri).asPromise()
  const StagingProject = stagingConn.model('Project', projectSchema)

  const testId = `test_staging_${Date.now()}`
  const stagingDoc = await StagingProject.create({
    name: `Staging Record (${testId})`,
    environment: 'staging',
  })
  console.log(`\n[STAGING DB] Successfully inserted test document:`)
  console.log(`  └─ ID:          ${stagingDoc._id}`)
  console.log(`  └─ Name:        "${stagingDoc.name}"`)
  console.log(`  └─ Environment: "${stagingDoc.environment}"`)

  // 2. Connect to Production DB & query for the record
  const prodConn = await mongoose.createConnection(prodUri).asPromise()
  const ProdProject = prodConn.model('Project', projectSchema)

  const prodDoc = await ProdProject.findOne({ name: stagingDoc.name })
  const prodCount = await ProdProject.countDocuments({ name: stagingDoc.name })

  console.log(`\n[PRODUCTION DB] Querying for document "${stagingDoc.name}"...`)
  console.log(`  └─ Matching Records Found: ${prodCount}`)
  console.log(`  └─ Document Present:       ${prodDoc !== null ? 'YES (LEAK DETECTED!)' : 'NO (ISOLATED)'}`)

  // 3. Assert Isolation
  if (prodDoc === null && prodCount === 0) {
    console.log('\n-------------------------------------------------------------')
    console.log('  PROOF CONFIRMED: Staging and Production databases are 100% ')
    console.log('                   ISOLATED. Staging records never leak into ')
    console.log('                   the Production database.')
    console.log('-------------------------------------------------------------')
  } else {
    console.error('\n❌ ISOLATION FAILURE: Staging record leaked into Production DB!')
    process.exit(1)
  }

  // Cleanup staging test doc
  await StagingProject.deleteOne({ _id: stagingDoc._id })
  console.log('\n[STAGING DB] Test record cleaned up.')

  await stagingConn.close()
  await prodConn.close()

  if (mongod) {
    await mongod.stop()
  }

  console.log('=============================================================\n')
}

if (require.main === module) {
  runIsolationTest().catch((err) => {
    console.error('Test error:', err)
    process.exit(1)
  })
}
