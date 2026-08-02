import mongoose, { Document, Schema } from 'mongoose'

export interface IProjectAssignment extends Document {
  projectId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  roleOnProject?: string
}

const projectAssignmentSchema = new Schema<IProjectAssignment>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project ID is required'],
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    roleOnProject: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
)

projectAssignmentSchema.index({ projectId: 1, userId: 1 }, { unique: true })

export const ProjectAssignment = mongoose.model<IProjectAssignment>('ProjectAssignment', projectAssignmentSchema)
