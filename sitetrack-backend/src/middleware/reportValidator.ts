import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import mongoose from 'mongoose'
import { AppError } from './errorHandler'

export const createReportSchema = z.object({
  projectId: z
    .string({ message: 'Project ID is required' })
    .min(1, 'Project ID is required')
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: 'Invalid Project ID format',
    }),

  date: z
    .string({ message: 'Date is required' })
    .min(1, 'Date is required')
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid Date format (must be a valid date, e.g. YYYY-MM-DD)',
    }),

  workDone: z
    .string({ message: 'Work done description is required' })
    .trim()
    .min(1, 'Work done description is required'),

  quantity: z.string().optional().default(''),

  labourSkilled: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? 0 : Number(val)),
    z.number({ message: 'labourSkilled must be a number' }).min(0, 'labourSkilled cannot be negative')
  ),

  labourUnskilled: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? 0 : Number(val)),
    z.number({ message: 'labourUnskilled must be a number' }).min(0, 'labourUnskilled cannot be negative')
  ),

  labourOperators: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? 0 : Number(val)),
    z.number({ message: 'labourOperators must be a number' }).min(0, 'labourOperators cannot be negative')
  ),

  tomorrowPlan: z.string().optional().default(''),
  issues: z.string().optional().default(''),
  remarks: z.string().optional().default(''),
})

export type CreateReportInput = z.infer<typeof createReportSchema>

/**
 * Middleware to validate request body for DPR creation using Zod schema.
 */
export function validateCreateReport(req: Request, _res: Response, next: NextFunction): void {
  const result = createReportSchema.safeParse(req.body)

  if (!result.success) {
    const errorMessages = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
      .join('; ')

    next(new AppError(`Validation failed: ${errorMessages}`, 400))
    return
  }

  // Replace req.body with the parsed/coerced data
  req.body = result.data
  next()
}
