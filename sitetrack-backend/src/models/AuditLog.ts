import mongoose, { Document, Schema } from 'mongoose'

export interface IAuditLog extends Document {
  entity: string
  entityId: mongoose.Types.ObjectId
  action: string
  changedBy: mongoose.Types.ObjectId
  changedAt: Date
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    entity: {
      type: String,
      required: [true, 'Entity name is required'],
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Entity ID is required'],
    },
    action: {
      type: String,
      required: [true, 'Action description is required'],
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Changed by User ID is required'],
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
)

auditLogSchema.index({ entity: 1, entityId: 1 })
auditLogSchema.index({ changedBy: 1 })

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema)
