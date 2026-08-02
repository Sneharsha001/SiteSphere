import mongoose, { Document, Schema } from 'mongoose'

export interface IOrganization extends Document {
  name: string
}

const organizationSchema = new Schema<IOrganization>(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
)

export const Organization = mongoose.model<IOrganization>('Organization', organizationSchema)
