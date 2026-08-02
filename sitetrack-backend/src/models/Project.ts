import mongoose, { Document, Schema } from 'mongoose'

// ── Types ─────────────────────────────────────────────────────────────────

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed'

export interface IProject extends Document {
  name: string
  description: string
  status: ProjectStatus
  progress: number
  startDate: Date
  endDate?: Date
  manager: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

// ── Schema ────────────────────────────────────────────────────────────────

const projectSchema = new Schema<IProject>(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },
    description: {
      type: String,
      default: '',
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    status: {
      type: String,
      enum: ['planning', 'active', 'on_hold', 'completed'],
      default: 'planning',
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
    },
    manager: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Project manager is required'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

// ── Indexes ───────────────────────────────────────────────────────────────
projectSchema.index({ status: 1 })
projectSchema.index({ manager: 1 })
projectSchema.index({ name: 'text', description: 'text' })

export const Project = mongoose.model<IProject>('Project', projectSchema)
