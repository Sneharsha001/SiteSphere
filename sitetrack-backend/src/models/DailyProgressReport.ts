import mongoose, { Document, Schema } from 'mongoose'

export interface IDailyProgressReport extends Document {
  projectId: mongoose.Types.ObjectId
  engineerId: mongoose.Types.ObjectId
  date: Date
  workDone: string
  quantity?: string
  labourSkilled: number
  labourUnskilled: number
  labourOperators: number
  tomorrowPlan?: string
  issues?: string
  remarks?: string
  syncStatus: 'synced' | 'pending'
  createdAt: Date
  editedAt?: Date
}

const dailyProgressReportSchema = new Schema<IDailyProgressReport>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project ID is required'],
    },
    engineerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Engineer ID is required'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    workDone: {
      type: String,
      required: [true, 'Work done description is required'],
    },
    quantity: {
      type: String,
    },
    labourSkilled: {
      type: Number,
      default: 0,
      min: 0,
    },
    labourUnskilled: {
      type: Number,
      default: 0,
      min: 0,
    },
    labourOperators: {
      type: Number,
      default: 0,
      min: 0,
    },
    tomorrowPlan: {
      type: String,
    },
    issues: {
      type: String,
    },
    remarks: {
      type: String,
    },
    syncStatus: {
      type: String,
      enum: ['synced', 'pending'],
      default: 'synced',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    editedAt: {
      type: Date,
    },
  },
  {
    timestamps: false, // We're managing createdAt manually as requested, though Mongoose can do it
  }
)

dailyProgressReportSchema.index({ projectId: 1, date: 1 })
dailyProgressReportSchema.index({ engineerId: 1 })

export const DailyProgressReport = mongoose.model<IDailyProgressReport>('DailyProgressReport', dailyProgressReportSchema)
