import multer, { FileFilterCallback } from 'multer'
import { Request, Response, NextFunction } from 'express'
import { AppError } from './errorHandler'

// Store files in memory so buffers can be uploaded to Cloudinary directly
const storage = multer.memoryStorage()

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
    cb(null, true)
  } else {
    cb(
      new AppError(
        `Invalid file type "${file.mimetype}". Only JPEG, PNG, and WebP images are allowed.`,
        400
      )
    )
  }
}

export const uploadPhotosMulter = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file limit
    files: 5, // max 5 files
  },
  fileFilter,
}).array('photos', 5)

/**
 * Middleware wrapper for handling Multer upload errors gracefully
 */
export function handlePhotoUpload(req: Request, res: Response, next: NextFunction): void {
  uploadPhotosMulter(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('File size limit exceeded. Maximum file size allowed is 5MB.', 400))
      }
      if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
        return next(new AppError('Too many files. Maximum 5 photos allowed per submission.', 400))
      }
      return next(new AppError(`Upload error: ${err.message}`, 400))
    } else if (err) {
      return next(err)
    }
    next()
  })
}
