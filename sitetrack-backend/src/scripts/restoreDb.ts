/**
 * src/scripts/restoreDb.ts
 *
 * Disaster Recovery Database Restore Utility for SiteSphere.
 * Restores MongoDB collections from a compressed JSON backup file (.json.gz).
 *
 * Usage:
 *   npx tsx src/scripts/restoreDb.ts <path-to-backup-file.json.gz>
 *   npm run db:restore -- <path-to-backup-file.json.gz>
 */

import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

interface BackupCollectionData {
  collectionName: string
  count: number
  documents: any[]
}

interface BackupManifest {
  timestamp: string
  databaseName: string
  version: string
  collections: BackupCollectionData[]
}

export async function restoreDatabaseBackup(backupFilePath: string): Promise<void> {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not defined.')
  }

  if (!fs.existsSync(backupFilePath)) {
    throw new Error(`Backup file not found at: ${backupFilePath}`)
  }

  console.log('=============================================================')
  console.log('         SITESPHERE DISASTER RECOVERY RESTORE               ')
  console.log('=============================================================')
  console.log(`Reading archive: ${backupFilePath}`)

  const compressedBuffer = fs.readFileSync(backupFilePath)
  const decompressed = zlib.gunzipSync(compressedBuffer)
  const manifest: BackupManifest = JSON.parse(decompressed.toString('utf-8'))

  console.log(`Backup Timestamp: ${manifest.timestamp}`)
  console.log(`Source Database:  ${manifest.databaseName}`)
  console.log(`Collections:      ${manifest.collections.length}`)
  console.log('-------------------------------------------------------------')

  const conn = await mongoose.createConnection(uri).asPromise()
  const db = conn.db
  if (!db) {
    throw new Error('Failed to obtain MongoDB database reference.')
  }

  for (const colData of manifest.collections) {
    const colName = colData.collectionName
    const docs = colData.documents

    if (docs.length === 0) {
      console.log(`  ├─ Collection: ${colName.padEnd(25)} [0 documents — skipped]`)
      continue
    }

    const collection = db.collection(colName)
    // Clear target collection before restoring
    await collection.deleteMany({})

    // Convert string ISO dates / ObjectIds back if needed, or insert directly
    const preparedDocs = docs.map((doc) => {
      if (doc._id && typeof doc._id === 'string' && doc._id.length === 24) {
        doc._id = new mongoose.Types.ObjectId(doc._id)
      }
      return doc
    })

    await collection.insertMany(preparedDocs)
    console.log(`  ├─ Collection: ${colName.padEnd(25)} [Restored ${preparedDocs.length} documents]`)
  }

  console.log('-------------------------------------------------------------')
  console.log(`✅ Disaster Recovery Restore Complete!`)
  console.log('=============================================================\n')

  await conn.close()
}

if (require.main === module) {
  const fileArg = process.argv[2]
  if (!fileArg) {
    console.error('Error: Please specify the backup file path to restore.')
    console.error('Example: npx tsx src/scripts/restoreDb.ts backups/sitetrack_backup_2026-08-14.json.gz')
    process.exit(1)
  }

  restoreDatabaseBackup(path.resolve(fileArg)).catch((err) => {
    console.error('Restore failed:', err)
    process.exit(1)
  })
}
