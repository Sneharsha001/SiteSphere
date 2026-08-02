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

export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isAppError = err instanceof AppError

  const statusCode = isAppError ? err.statusCode : 500
  const message = isAppError ? err.message : 'Internal Server Error'

  // Log stack trace only in development
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[Error] ${statusCode} — ${err.message}`)
    if (!isAppError) console.error(err.stack)
  }

  res.status(statusCode).json({
    success: false,
    status: statusCode,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  })
}
