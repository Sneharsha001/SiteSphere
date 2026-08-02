import { CorsOptions } from 'cors'

/**
 * CORS options that allow requests from the FRONTEND_URL env variable.
 * Falls back to http://localhost:5173 for local development.
 */
export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigin = process.env.FRONTEND_URL ?? 'http://localhost:5173'

    // Allow requests with no origin (e.g. curl, Postman, server-to-server)
    if (!origin) {
      return callback(null, true)
    }

    if (origin === allowedOrigin) {
      callback(null, true)
    } else {
      callback(new Error(`CORS: origin '${origin}' is not allowed`))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}
