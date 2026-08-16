import mongoose, { Document, Schema } from 'mongoose'

export interface IUser extends Document {
  orgId: mongoose.Types.ObjectId
  name: string
  email: string
  passwordHash: string
  role: 'admin' | 'pm' | 'site_engineer'
  status: 'active' | 'inactive' | 'pending'
  resetPasswordToken?: string   // hashed token stored in DB
  resetPasswordExpires?: Date   // expiry timestamp
  refreshTokenHash?: string     // hashed refresh token
  tokenVersion: number          // session invalidation version
  isEmailVerified: boolean
  emailVerificationToken?: string
  emailVerificationExpires?: Date
  failedLoginAttempts: number
  lockUntil?: Date
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
      enum: ['active', 'inactive', 'pending'],
      default: 'active',
    },
    resetPasswordToken: {
      type: String,
      default: undefined,
    },
    resetPasswordExpires: {
      type: Date,
      default: undefined,
    },
    refreshTokenHash: {
      type: String,
      default: undefined,
    },
    tokenVersion: {
      type: Number,
      default: 0,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      default: undefined,
    },
    emailVerificationExpires: {
      type: Date,
      default: undefined,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: undefined,
    },
  },

  {
    timestamps: true,
  }
)

userSchema.index({ orgId: 1 })
userSchema.index({ resetPasswordToken: 1 }, { sparse: true })
userSchema.index({ emailVerificationToken: 1 }, { sparse: true })

export const User = mongoose.model<IUser>('User', userSchema)

