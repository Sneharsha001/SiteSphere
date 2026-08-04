import express, { Application } from 'express'
import cors from 'cors'
import { corsOptions } from './config/cors'
import { requestLogger } from './middleware/requestLogger'
import { notFoundHandler, errorHandler } from './middleware/errorHandler'
import healthRoutes from './routes/healthRoutes'
import apiRoutes from './routes'

const app: Application = express()

// ── Core middleware ───────────────────────────────────────────────────────
app.use(cors(corsOptions))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(requestLogger)

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/health', healthRoutes)
app.use('/api', apiRoutes)

// ── Root redirect ─────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    name: 'SiteTrack API',
    version: '1.0.0',
    health: '/health',
  })
})

// ── Error handling (must be last) ─────────────────────────────────────────
app.use(notFoundHandler)
app.use(errorHandler)

export default app
