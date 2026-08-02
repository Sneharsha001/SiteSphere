import { Request, Response } from 'express'
import mongoose from 'mongoose'

/**
 * GET /health
 * Returns server and database status.
 */
export function healthCheck(_req: Request, res: Response): void {
  const dbState = mongoose.connection.readyState

  // mongoose readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
  const dbStatus: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  }

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? 'development',
    database: dbStatus[dbState] ?? 'unknown',
  })
}
