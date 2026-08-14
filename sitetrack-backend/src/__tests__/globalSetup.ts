/**
 * globalSetup.ts
 *
 * Runs ONCE before the entire Vitest suite.
 * Starts the in-memory MongoDB server and exports its URI via an env variable
 * so every test file can connect to the same instance.
 *
 * Also sets all env vars required by the auth system so no real secrets
 * are needed during testing.
 */
import { MongoMemoryServer } from 'mongodb-memory-server'

let mongod: MongoMemoryServer

export async function setup() {
  mongod = await MongoMemoryServer.create()
  process.env['MONGO_URI'] = mongod.getUri()

  // ── JWT / Auth ────────────────────────────────────────────────────────
  process.env['JWT_SECRET'] = 'test-access-secret-vitest-do-not-use-in-prod'
  process.env['JWT_REFRESH_SECRET'] = 'test-refresh-secret-vitest-do-not-use-in-prod'
  process.env['ACCESS_TOKEN_EXPIRES_IN'] = '15m'
  process.env['REFRESH_TOKEN_EXPIRES_IN'] = '7d'
  process.env['JWT_EXPIRES_IN'] = '15m' // legacy compat

  // ── App ───────────────────────────────────────────────────────────────
  process.env['NODE_ENV'] = 'test'
  process.env['FRONTEND_URL'] = 'http://localhost:5173'

  // ── Cloudinary & email — stub values so imports don't explode ─────────
  process.env['CLOUDINARY_CLOUD_NAME'] = 'test'
  process.env['CLOUDINARY_API_KEY'] = 'test'
  process.env['CLOUDINARY_API_SECRET'] = 'test'
}

export async function teardown() {
  await mongod.stop()
}
