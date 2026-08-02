import mongoose, { Document, Schema } from 'mongoose'

export interface IReportPhoto extends Document {
  reportId: mongoose.Types.ObjectId
  fileUrl: string
  timestamp?: Date
  gpsLat?: number
  gpsLng?: number
}

const reportPhotoSchema = new Schema<IReportPhoto>(
  {
    reportId: {
      type: Schema.Types.ObjectId,
      ref: 'DailyProgressReport',
      required: [true, 'Report ID is required'],
    },
    fileUrl: {
      type: String,
      required: [true, 'File URL is required'],
    },
    timestamp: {
      type: Date,
    },
    gpsLat: {
      type: Number,
    },
    gpsLng: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
)

reportPhotoSchema.index({ reportId: 1 })

export const ReportPhoto = mongoose.model<IReportPhoto>('ReportPhoto', reportPhotoSchema)
