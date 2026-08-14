/**
 * src/utils/monitoring.ts
 *
 * Environment-aware Error Tracking & Health Monitoring Utility.
 * Captures 500-level internal errors and tags them with the environment
 * (e.g. production, staging, development) for Sentry / Monitoring integrations.
 */

import { Request } from 'express'

export interface ErrorReport {
  message: string
  stack?: string
  statusCode: number
  path?: string
  method?: string
  environment: string
  timestamp: string
}

export function reportError(err: Error, statusCode: number, req?: Request): ErrorReport {
  const environment = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development'
  const report: ErrorReport = {
    message: err.message,
    stack: err.stack,
    statusCode,
    path: req?.originalUrl,
    method: req?.method,
    environment,
    timestamp: new Date().toISOString(),
  }

  // If SENTRY_DSN is configured in environment, log structured event for Sentry transport
  if (process.env.SENTRY_DSN) {
    console.error(`[SENTRY ERROR REPORT - Env: ${environment}]`, JSON.stringify(report))
  } else {
    console.error(`[SERVER ERROR - Env: ${environment}] ${statusCode} - ${err.message}`)
  }

  return report
}
