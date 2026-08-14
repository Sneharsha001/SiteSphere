/**
 * src/config/cors.ts
 *
 * CORS configuration.
 *
 * In development: allows any localhost origin (any port) for convenience.
 * In production:  only origins in the ALWAYS_ALLOWED list or FRONTEND_URL env var.
 *
 * The 'credentials: true' flag is required for HttpOnly cookies to be
 * sent/received cross-origin by the browser.
 */

import { CorsOptions } from 'cors'

const ALWAYS_ALLOWED = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://sitesphere-cbch.onrender.com', // production frontend
]

function getAllowedOrigins(): string[] {
  const env = process.env.FRONTEND_URL ?? ''
  const envOrigins = env
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return [...new Set([...ALWAYS_ALLOWED, ...envOrigins])]
}

const isDevelopment = process.env.NODE_ENV !== 'production'

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server health checks)
    if (!origin) {
      return callback(null, true)
    }

    const allowed = getAllowedOrigins()

    // In development only: allow any localhost port for hot-reload convenience.
    // In production this regex is intentionally disabled to prevent subdomain
    // or port-squatting attacks.
    const isAllowedOrigin =
      allowed.includes(origin) ||
      (isDevelopment && /^https?:\/\/localhost(:\d+)?$/.test(origin))

    if (isAllowedOrigin) {
      callback(null, true)
    } else {
      callback(new Error(`CORS: origin '${origin}' is not allowed`))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}
