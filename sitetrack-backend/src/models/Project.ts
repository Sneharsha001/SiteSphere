import mongoose, { Document, Schema } from 'mongoose'

// ── Building type enum (strictly buildings only — no infrastructure) ────────

export const BUILDING_TYPES = [
  'residential_house',
  'villa',
  'apartment_residential',
  'college_institutional',
  'commercial_office',
  'other_building',
] as const

export type BuildingType = (typeof BUILDING_TYPES)[number]

// ── Interface ──────────────────────────────────────────────────────────────

export interface IProject extends Document {
  orgId: mongoose.Types.ObjectId
  name: string
  location?: string
  startDate?: Date
  buildingType: BuildingType
  status: 'active' | 'on_hold' | 'completed'
  createdBy?: mongoose.Types.ObjectId
}

// ── Schema ─────────────────────────────────────────────────────────────────

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
    buildingType: {
      type: String,
      required: [true, 'buildingType is required'],
      enum: {
        values: BUILDING_TYPES,
        message:
          '"{VALUE}" is not a valid building type. Allowed values: ' +
          BUILDING_TYPES.join(', ') +
          '. Note: infrastructure types (bridges, roads, railways) are not supported.',
      },
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
projectSchema.index({ buildingType: 1 })

export const Project = mongoose.model<IProject>('Project', projectSchema)
