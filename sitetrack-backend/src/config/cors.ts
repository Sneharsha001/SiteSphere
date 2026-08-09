import { CorsOptions } from 'cors'

/**
 * CORS options that allow requests from the FRONTEND_URL env variable.
 * Supports multiple origins via comma-separated values.
 * Falls back to localhost + production Render frontend.
 */

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

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) {
      return callback(null, true)
    }

    const allowed = getAllowedOrigins()
    if (
      allowed.includes(origin) ||
      /^https?:\/\/localhost(:\d+)?$/.test(origin)
    ) {
      callback(null, true)
    } else {
      callback(new Error(`CORS: origin '${origin}' is not allowed`))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}
