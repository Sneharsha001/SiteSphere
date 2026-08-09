import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import Header from '../components/Header'

// ── Zod Validation Schema ──────────────────────────────────────────────────
const dprSchema = z.object({
  workDone: z.string().trim().min(1, 'Work done description is required'),
  quantity: z.string().optional(),
  labourSkilled: z.number().min(0, 'Cannot be negative'),
  labourUnskilled: z.number().min(0, 'Cannot be negative'),
  labourOperators: z.number().min(0, 'Cannot be negative'),
  tomorrowPlan: z.string().optional(),
  issues: z.string().optional(),
  remarks: z.string().optional(),
})

type DprFormData = z.infer<typeof dprSchema>

interface ExistingPhoto {
  _id: string
  fileUrl: string
  timestamp: string
}

export default function EditReportPage() {
  useAuth()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // Report loading state
  const [loadingReport, setLoadingReport] = useState(true)
  const [reportError, setReportError] = useState<string | null>(null)
  
  // 24-hour window state
  const [windowExpired, setWindowExpired] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [reportDate, setReportDate] = useState('')

  // Photos state
  const [existingPhotos, setExistingPhotos] = useState<ExistingPhoto[]>([])
  const [newPhotos, setNewPhotos] = useState<File[]>([])
  const [newPhotoPreviews, setNewPhotoPreviews] = useState<string[]>([])
  const [photoError, setPhotoError] = useState<string | null>(null)

  // Submit state
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<DprFormData>({
    resolver: zodResolver(dprSchema),
  })

  // ── Fetch existing report details ─────────────────────────────────────────
  useEffect(() => {
    async function fetchReportDetails() {
      try {
        setLoadingReport(true)
        const res = await api.get(`/reports/${id}`)
        const report = res.data?.data
        if (report) {
          setProjectName(report.projectId?.name || 'Unknown Project')
          setReportDate(new Date(report.date).toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          }))
          
          // Check 24-hour edit window
          const createdAtMs = new Date(report.createdAt).getTime()
          const timeDiff = Date.now() - createdAtMs
          const windowMs = 24 * 60 * 60 * 1000
          if (timeDiff >= windowMs) {
            setWindowExpired(true)
          }

          // Prefill form fields
          setValue('workDone', report.workDone || '')
          setValue('quantity', report.quantity || '')
          setValue('labourSkilled', report.labourSkilled || 0)
          setValue('labourUnskilled', report.labourUnskilled || 0)
          setValue('labourOperators', report.labourOperators || 0)
          setValue('tomorrowPlan', report.tomorrowPlan || '')
          setValue('issues', report.issues || '')
          setValue('remarks', report.remarks || '')

          setExistingPhotos(report.photos || [])
        }
      } catch (err: any) {
        setReportError(err.response?.data?.message || 'Failed to load report details.')
      } finally {
        setLoadingReport(false)
      }
    }

    if (id) fetchReportDetails()
  }, [id, setValue])

  // ── Handle photo selection ───────────────────────────────────────────────
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null)
    const selectedFiles = Array.from(e.target.files || [])

    if (selectedFiles.length === 0) return

    // Reject non-image files
    const nonImages = selectedFiles.filter((file) => !file.type.startsWith('image/'))
    if (nonImages.length > 0) {
      setPhotoError('Invalid file type! Only image files (JPEG, PNG, WEBP, etc.) are allowed.')
      e.target.value = ''
      return
    }

    // Check limit of 5 photos total (existing + new)
    const totalCount = existingPhotos.length + newPhotos.length + selectedFiles.length
    if (totalCount > 5) {
      setPhotoError(`You can upload a maximum of 5 photos. (Already have ${existingPhotos.length} existing and ${newPhotos.length} new selected)`)
      e.target.value = ''
      return
    }

    const updatedNewPhotos = [...newPhotos, ...selectedFiles]
    const newPreviews = selectedFiles.map((file) => URL.createObjectURL(file))

    setNewPhotos(updatedNewPhotos)
    setNewPhotoPreviews((prev) => [...prev, ...newPreviews])
    e.target.value = ''
  }

  // ── Remove new photo preview ─────────────────────────────────────────────
  const handleRemoveNewPhoto = (index: number) => {
    URL.revokeObjectURL(newPhotoPreviews[index])
    setNewPhotos((prev) => prev.filter((_, i) => i !== index))
    setNewPhotoPreviews((prev) => prev.filter((_, i) => i !== index))
    setPhotoError(null)
  }

  // ── Handle form submission ───────────────────────────────────────────────
  const onSubmit = async (data: DprFormData) => {
    setSubmitError(null)
    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('workDone', data.workDone)
      if (data.quantity) formData.append('quantity', data.quantity)
      formData.append('labourSkilled', String(data.labourSkilled ?? 0))
      formData.append('labourUnskilled', String(data.labourUnskilled ?? 0))
      formData.append('labourOperators', String(data.labourOperators ?? 0))
      if (data.tomorrowPlan) formData.append('tomorrowPlan', data.tomorrowPlan)
      if (data.issues) formData.append('issues', data.issues)
      if (data.remarks) formData.append('remarks', data.remarks)

      newPhotos.forEach((file) => {
        formData.append('photos', file)
      })

      await api.patch(`/reports/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      setSubmitSuccess(true)

      // Clean up object URLs
      newPhotoPreviews.forEach((url) => URL.revokeObjectURL(url))

      // Redirect back to My Reports
      setTimeout(() => {
        navigate('/reports')
      }, 1200)
    } catch (err: any) {
      if (err.response?.status === 403) {
        setWindowExpired(true)
        setSubmitError('This report can no longer be edited directly (24-hour window passed). Contact an Admin if a change is needed.')
      } else {
        const msg = err.response?.data?.message || 'Failed to update report. Please try again.'
        setSubmitError(msg)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loadingReport) {
    return (
      <div className="min-h-screen bg-slate-900 text-white">
        <Header />
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <svg className="animate-spin w-8 h-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
          </svg>
          <span className="text-slate-400 text-sm">Loading report details...</span>
        </div>
      </div>
    )
  }

  if (reportError) {
    return (
      <div className="min-h-screen bg-slate-900 text-white">
        <Header />
        <main className="max-w-3xl mx-auto px-6 py-10">
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
            <h2 className="text-xl font-bold text-red-400 mb-2">Error Loading Report</h2>
            <p className="text-slate-300 mb-6">{reportError}</p>
            <Link to="/reports" className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium text-white rounded-xl transition-colors">
              Back to My Reports
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <Header />

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <Link to="/reports" className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold mb-3">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
            Back to My Reports
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Edit Daily Progress Report</h1>
          <p className="text-slate-400 text-sm mt-1">
            Updating report for <strong className="text-slate-200">{projectName}</strong> on {reportDate}.
          </p>
        </div>

        {/* ── WINDOW EXPIRED ERROR STATE ────────────────────────────────────── */}
        {windowExpired ? (
          <div className="bg-slate-800/40 border border-white/10 rounded-2xl p-8 text-center shadow-xl">
            <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Edit Window Closed</h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
              This report can no longer be edited directly (24-hour window passed). Contact an Admin if a change is needed.
            </p>
            <Link to="/reports" className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium text-white rounded-xl transition-colors">
              Return to My Reports
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 bg-slate-900 border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl">
            
            {submitSuccess && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold flex items-center gap-2">
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Report updated successfully! Redirecting...
              </div>
            )}

            {submitError && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold flex items-start gap-2">
                <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{submitError}</span>
              </div>
            )}

            {/* Work Done */}
            <div>
              <label htmlFor="workDone" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Work Done Description *</label>
              <textarea
                id="workDone"
                rows={4}
                {...register('workDone')}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="Describe work completed today..."
              />
              {errors.workDone && <span className="text-red-400 text-xs mt-1 block">{errors.workDone.message}</span>}
            </div>

            {/* Quantity */}
            <div>
              <label htmlFor="quantity" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Quantity Executed (Optional)</label>
              <input
                id="quantity"
                type="text"
                {...register('quantity')}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="e.g. 50 cubic meters concrete poured"
              />
            </div>

            {/* Workforce Deployed */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Workforce Deployed</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="labourSkilled" className="block text-xs text-slate-500 mb-1">Skilled Labour</label>
                  <input
                    id="labourSkilled"
                    type="number"
                    {...register('labourSkilled', { valueAsNumber: true })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  {errors.labourSkilled && <span className="text-red-400 text-xs mt-1 block">{errors.labourSkilled.message}</span>}
                </div>
                <div>
                  <label htmlFor="labourUnskilled" className="block text-xs text-slate-500 mb-1">Unskilled Labour</label>
                  <input
                    id="labourUnskilled"
                    type="number"
                    {...register('labourUnskilled', { valueAsNumber: true })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  {errors.labourUnskilled && <span className="text-red-400 text-xs mt-1 block">{errors.labourUnskilled.message}</span>}
                </div>
                <div>
                  <label htmlFor="labourOperators" className="block text-xs text-slate-500 mb-1">Machine Operators</label>
                  <input
                    id="labourOperators"
                    type="number"
                    {...register('labourOperators', { valueAsNumber: true })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  {errors.labourOperators && <span className="text-red-400 text-xs mt-1 block">{errors.labourOperators.message}</span>}
                </div>
              </div>
            </div>

            {/* Tomorrow's Plan */}
            <div>
              <label htmlFor="tomorrowPlan" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Tomorrow's Plan (Optional)</label>
              <textarea
                id="tomorrowPlan"
                rows={3}
                {...register('tomorrowPlan')}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="What is planned for tomorrow..."
              />
            </div>

            {/* Issues / Blockers */}
            <div>
              <label htmlFor="issues" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Issues / Blockers (Optional)</label>
              <textarea
                id="issues"
                rows={2}
                {...register('issues')}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="Any roadblocks, material shortages, or weather issues..."
              />
            </div>

            {/* Remarks */}
            <div>
              <label htmlFor="remarks" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">General Remarks (Optional)</label>
              <textarea
                id="remarks"
                rows={2}
                {...register('remarks')}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="Additional notes..."
              />
            </div>

            {/* Photo Gallery (Existing & New) */}
            <div className="border-t border-white/10 pt-6">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Site Photos</label>
              
              {/* Existing Photos (Read-Only) */}
              {existingPhotos.length > 0 && (
                <div className="mb-4">
                  <span className="block text-xs text-slate-500 mb-2">Already Uploaded Photos (Cannot be removed)</span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {existingPhotos.map((photo) => (
                      <div key={photo._id} className="relative rounded-lg overflow-hidden border border-white/10 aspect-square">
                        <img src={photo.fileUrl} alt="Existing update" className="w-full h-full object-cover opacity-70" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Photos Upload */}
              <div className="space-y-4">
                <span className="block text-xs text-slate-500">Upload New Photos (Optional, up to 5 total photos)</span>
                <input
                  id="photos"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
                
                {existingPhotos.length + newPhotos.length < 5 ? (
                  <label
                    htmlFor="photos"
                    className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 hover:border-indigo-500/50 rounded-xl py-6 cursor-pointer hover:bg-white/5 transition-all text-slate-400 hover:text-white"
                  >
                    <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs font-semibold">Select New Photos</span>
                    <span className="text-[10px] text-slate-500 mt-1">JPEG, PNG, WEBP allowed (Max 5 photos total)</span>
                  </label>
                ) : (
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-center text-xs text-slate-500">
                    Maximum photo upload limit (5) reached.
                  </div>
                )}

                {photoError && <span className="text-red-400 text-xs block">{photoError}</span>}

                {/* Previews of newly selected photos */}
                {newPhotoPreviews.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {newPhotoPreviews.map((preview, index) => (
                      <div key={index} className="relative rounded-lg overflow-hidden border border-white/10 aspect-square group bg-slate-800">
                        <img src={preview} alt="New upload preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveNewPhoto(index)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-colors shadow-lg opacity-0 group-hover:opacity-100"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Form Footer */}
            <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
              <Link
                to="/reports"
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium text-white rounded-xl transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-sm font-medium text-white rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
              >
                {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>

          </form>
        )}
      </main>
    </div>
  )
}
