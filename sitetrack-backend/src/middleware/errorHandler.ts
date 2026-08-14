import { Request, Response, NextFunction } from 'express'

// ── Custom error class ────────────────────────────────────────────────────

export class AppError extends Error {
  public statusCode: number
  public isOperational: boolean

  constructor(message: string, statusCode: number) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true
    Error.captureStackTrace(this, this.constructor)
  }
}

// ── 404 handler (place before error handler) ──────────────────────────────

export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404))
}

// ── Global error handler ──────────────────────────────────────────────────

import { reportError } from '../utils/monitoring'

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isAppError = err instanceof AppError

  const statusCode = isAppError ? err.statusCode : 500
  const message = isAppError ? err.message : 'Internal Server Error'

  // Report 500 errors to monitoring / logging pipeline
  if (statusCode >= 500 || !isAppError) {
    reportError(err, statusCode, req)
  } else if (process.env.NODE_ENV !== 'production') {
    console.error(`[Error] ${statusCode} — ${err.message}`)
  }

  res.status(statusCode).json({
    success: false,
    status: statusCode,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  })
}

