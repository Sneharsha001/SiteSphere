import mongoose from 'mongoose'

/**
 * Connects to MongoDB Atlas using the MONGODB_URI environment variable.
 * Exits the process on failure so the server never runs in a broken state.
 */
export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI

  if (!uri) {
    console.error('❌  MONGODB_URI is not set in environment variables')
    process.exit(1)
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      family: 4, // Force IPv4 — fixes SRV resolution on some DNS configs
    })
    console.log(`✅  MongoDB connected: ${mongoose.connection.host}`)
  } catch (err) {
    console.error('❌  MongoDB connection error:', err)
    process.exit(1)
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️   MongoDB disconnected')
  })

  mongoose.connection.on('error', (err: Error) => {
    console.error('❌  MongoDB error:', err)
  })
}
