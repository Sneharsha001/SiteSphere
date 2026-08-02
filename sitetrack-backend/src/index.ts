import dotenv from 'dotenv'
dotenv.config()
import app from './app'
import { connectDB } from './config/database'

const PORT = Number(process.env.PORT) || 5000

async function bootstrap(): Promise<void> {
  // Connect to MongoDB Atlas before starting the HTTP server
  await connectDB()

  const server = app.listen(PORT, () => {
    console.log(`🚀  SiteTrack API running on http://localhost:${PORT}`)
    console.log(`📋  Health check: http://localhost:${PORT}/api/health`)
    console.log(`🌍  Environment: ${process.env.NODE_ENV ?? 'development'}`)
  })

  // ── Graceful shutdown ───────────────────────────────────────────────────
  const shutdown = (signal: string) => {
    console.log(`\n${signal} received — shutting down gracefully…`)
    server.close(() => {
      console.log('HTTP server closed')
      process.exit(0)
    })
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason)
    server.close(() => process.exit(1))
  })
}

bootstrap()
