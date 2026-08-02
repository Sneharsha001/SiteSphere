import { Router } from 'express'
import { healthCheck } from '../controllers/healthController'

const router = Router()

/**
 * GET /health
 * @returns { status: "ok", timestamp, environment, database }
 */
router.get('/', healthCheck)

export default router
