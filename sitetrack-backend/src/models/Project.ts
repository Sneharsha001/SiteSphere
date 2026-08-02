import mongoose, { Document, Schema } from 'mongoose'

export interface IProject extends Document {
  orgId: mongoose.Types.ObjectId
  name: string
  location?: string
  startDate?: Date
  status: 'active' | 'on_hold' | 'completed'
  createdBy?: mongoose.Types.ObjectId
}

const projectSchema = new Schema<IProject>(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
    },
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    startDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['active', 'on_hold', 'completed'],
      default: 'active',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
)

projectSchema.index({ orgId: 1 })
projectSchema.index({ status: 1 })

export const Project = mongoose.model<IProject>('Project', projectSchema)
