import { v2 as cloudinary } from 'cloudinary'
import dotenv from 'dotenv'

dotenv.config()

if (process.env.CLOUDINARY_URL) {
  cloudinary.config({
    cloudinary_url: process.env.CLOUDINARY_URL,
    secure: true,
  })
} else if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  })
}

export default cloudinary

/**
 * Upload a file buffer directly to Cloudinary using upload_stream.
 * Returns the secure URL of the uploaded image.
 */
export async function uploadBufferToCloudinary(
  buffer: Buffer,
  folder: string = 'sitetrack/dpr_photos'
): Promise<string> {
  const isCloudinaryConfigured =
    Boolean(process.env.CLOUDINARY_URL) ||
    Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
    )

  if (!isCloudinaryConfigured) {
    console.warn(
      '⚠️  Cloudinary environment variables not configured. Returning fallback Cloudinary URL.'
    )
    const mockId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    return `https://res.cloudinary.com/demo/image/upload/v1722850000/${folder}/photo_${mockId}.jpg`
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) {
          return reject(error)
        }
        if (!result || !result.secure_url) {
          return reject(new Error('Cloudinary upload returned empty result'))
        }
        resolve(result.secure_url)
      }
    )

    uploadStream.end(buffer)
  })
}
