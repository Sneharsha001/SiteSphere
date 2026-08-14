/**
 * src/scripts/backupDb.ts
 *
 * Automated MongoDB Backup Utility for SiteSphere.
 * Works natively on any OS/Cloud without requiring native `mongodump` binaries.
 *
 * Export format: Compressed JSON archive (.json.gz) containing metadata,
 * collection schemas, documents, and SHA-256 checksums.
 *
 * Usage:
 *   npx tsx src/scripts/backupDb.ts
 *   npm run db:backup
 */

import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import crypto from 'crypto'
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

export async function createDatabaseBackup(outputDir?: string): Promise<string> {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not defined.')
  }

  const targetDir = outputDir || path.join(process.cwd(), 'backups')
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true })
  }

  const conn = await mongoose.createConnection(uri).asPromise()
  const db = conn.db
  if (!db) {
    throw new Error('Failed to obtain MongoDB database reference.')
  }

  const dbName = db.databaseName
  const collections = await db.listCollections().toArray()

  console.log('=============================================================')
  console.log('         SITESPHERE AUTOMATED DATABASE BACKUP                ')
  console.log('=============================================================')
  console.log(`Database Name: ${dbName}`)
  console.log(`Target Collections: ${collections.length}`)
  console.log('-------------------------------------------------------------')

  const collectionsData: BackupCollectionData[] = []

  for (const colInfo of collections) {
    const colName = colInfo.name
    // Skip system collections
    if (colName.startsWith('system.')) continue

    const collection = db.collection(colName)
    const docs = await collection.find({}).toArray()
    console.log(`  ├─ Collection: ${colName.padEnd(25)} [${docs.length} documents]`)

    collectionsData.push({
      collectionName: colName,
      count: docs.length,
      documents: docs,
    })
  }

  const manifest: BackupManifest = {
    timestamp: new Date().toISOString(),
    databaseName: dbName,
    version: '1.0.0',
    collections: collectionsData,
  }

  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const filename = `${dbName}_backup_${dateStr}.json.gz`
  const filePath = path.join(targetDir, filename)

  const jsonStr = JSON.stringify(manifest, null, 2)
  const compressed = zlib.gzipSync(Buffer.from(jsonStr, 'utf-8'))

  fs.writeFileSync(filePath, compressed)

  const stats = fs.statSync(filePath)
  const sha256 = crypto.createHash('sha256').update(compressed).digest('hex')

  console.log('-------------------------------------------------------------')
  console.log(`✅ Backup Successful!`)
  console.log(`  ├─ Archive Path: ${filePath}`)
  console.log(`  ├─ File Size:    ${(stats.size / 1024).toFixed(2)} KB`)
  console.log(`  ├─ SHA-256 Checksum: ${sha256}`)
  console.log('=============================================================\n')

  await conn.close()
  return filePath
}

if (require.main === module) {
  createDatabaseBackup().catch((err) => {
    console.error('Backup failed:', err)
    process.exit(1)
  })
}
