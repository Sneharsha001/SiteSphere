import mongoose, { Document, Schema } from 'mongoose'

export interface IUser extends Document {
  orgId: mongoose.Types.ObjectId
  name: string
  email: string
  passwordHash: string
  role: 'admin' | 'pm' | 'site_engineer'
  status: 'active' | 'inactive'
}

const userSchema = new Schema<IUser>(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
    },
    name: {
      type: String,
      required: [true, 'User name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
    },
    role: {
      type: String,
      enum: ['admin', 'pm', 'site_engineer'],
      required: [true, 'Role is required'],
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
)

userSchema.index({ orgId: 1 })

export const User = mongoose.model<IUser>('User', userSchema)
