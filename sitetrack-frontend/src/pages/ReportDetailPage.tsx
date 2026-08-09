import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import Header from '../components/Header'
import type { ReportPhoto } from '../types'

// ── Audit Log type ────────────────────────────────────────────────────────

interface AuditEntry {
  _id: string
  action: string
  changedBy: { _id: string; name: string; email: string; role: string }
  changedAt: string
  changes: Record<string, { before?: any; after?: any } | any>
}

// ── Types ─────────────────────────────────────────────────────────────────

interface ReportDetail {
  _id: string
  date: string
  createdAt: string
  workDone: string
  quantity?: string
  labourSkilled: number
  labourUnskilled: number
  labourOperators: number
  tomorrowPlan?: string
  issues?: string
  remarks?: string
  syncStatus: 'synced' | 'pending'
  projectId: {
    _id: string
    name: string
    buildingType?: string
    location?: string
  }
  engineerId: {
    _id: string
    name: string
    email: string
  }
  photos: ReportPhoto[]
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function buildingTypeLabel(bt?: string): string {
  if (!bt) return ''
  const map: Record<string, string> = {
    residential_house: 'Residential House',
    villa: 'Villa',
    apartment_residential: 'Apartment',
    college_institutional: 'Institutional',
    commercial_office: 'Commercial Office',
    other_building: 'Other',
  }
  return map[bt] ?? bt
}

// ── Field block sub-component ─────────────────────────────────────────────

interface FieldBlockProps {
  label: string
  children: React.ReactNode
  fullWidth?: boolean
  highlight?: 'issue' | 'none'
}

function FieldBlock({ label, children, fullWidth, highlight }: FieldBlockProps) {
  const base =
    'bg-white/5 border rounded-xl p-5' +
    (fullWidth ? ' md:col-span-2' : '') +
    (highlight === 'issue'
      ? ' border-amber-500/30 bg-amber-500/5'
      : ' border-white/10')
  return (
    <div className={base}>
      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
        {label}
      </h4>
      {children}
    </div>
  )
}

// ── Skeleton loader ────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Back + header */}
      <div className="h-7 bg-white/10 rounded w-32" />
      <div className="space-y-2">
        <div className="h-8 bg-white/10 rounded w-2/3" />
        <div className="h-4 bg-white/10 rounded w-1/3" />
      </div>
      {/* Meta pills */}
      <div className="flex gap-3">
        <div className="h-7 bg-white/10 rounded-full w-28" />
        <div className="h-7 bg-white/10 rounded-full w-24" />
        <div className="h-7 bg-white/10 rounded-full w-20" />
      </div>
      {/* Fields grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-2">
            <div className="h-3 bg-white/10 rounded w-1/3" />
            <div className="h-4 bg-white/10 rounded w-full" />
            <div className="h-4 bg-white/10 rounded w-4/5" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [report, setReport] = useState<ReportDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Audit log state (Admin only)
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([])
  const [auditLoading, setAuditLoading] = useState(false)

  // Admin Override Edit state
  const [showAdminEdit, setShowAdminEdit] = useState(false)
  const [adminEditFields, setAdminEditFields] = useState<Record<string, any>>({})
  const [adminEditError, setAdminEditError] = useState<string | null>(null)
  const [adminEditSuccess, setAdminEditSuccess] = useState(false)
  const [adminEditSubmitting, setAdminEditSubmitting] = useState(false)

  // Lightbox state — reused directly from MyReportsPage pattern
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null)
  const [zoomIndex, setZoomIndex] = useState<number>(0)

  // ── Fetch report detail ──────────────────────────────────────────────────
  const fetchReport = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/reports/${id}`)
      setReport(res.data?.data ?? null)
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to load report. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  // Fetch audit logs (Admin only)
  const fetchAuditLogs = useCallback(async () => {
    if (!id || user?.role !== 'admin') return
    setAuditLoading(true)
    try {
      const res = await api.get(`/reports/${id}/audit`)
      setAuditLogs(res.data?.data ?? [])
    } catch {
      // silently ignore
    } finally {
      setAuditLoading(false)
    }
  }, [id, user?.role])

  useEffect(() => {
    fetchAuditLogs()
  }, [fetchAuditLogs])

  // Admin Override Edit handlers
  const handleAdminEditOpen = () => {
    if (!report) return
    setAdminEditFields({
      workDone: report.workDone,
      quantity: report.quantity || '',
      labourSkilled: report.labourSkilled,
      labourUnskilled: report.labourUnskilled,
      labourOperators: report.labourOperators,
      tomorrowPlan: report.tomorrowPlan || '',
      issues: report.issues || '',
      remarks: report.remarks || '',
    })
    setAdminEditError(null)
    setAdminEditSuccess(false)
    setShowAdminEdit(true)
  }

  const handleAdminEditSubmit = async () => {
    if (!id) return
    setAdminEditSubmitting(true)
    setAdminEditError(null)
    try {
      await api.patch(`/reports/${id}/admin-edit`, adminEditFields)
      setAdminEditSuccess(true)
      // Refresh report + audit logs
      await fetchReport()
      await fetchAuditLogs()
      setTimeout(() => setShowAdminEdit(false), 1500)
    } catch (err: any) {
      setAdminEditError(err.response?.data?.message || 'Failed to save admin override edit.')
    } finally {
      setAdminEditSubmitting(false)
    }
  }

  // ── Keyboard navigation for lightbox ────────────────────────────────────
  useEffect(() => {
    if (!zoomImageUrl) return
    const photos = report?.photos ?? []
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoomImageUrl(null)
      if (e.key === 'ArrowRight' && photos.length > 1) {
        const next = (zoomIndex + 1) % photos.length
        setZoomIndex(next)
        setZoomImageUrl(photos[next].fileUrl)
      }
      if (e.key === 'ArrowLeft' && photos.length > 1) {
        const prev = (zoomIndex - 1 + photos.length) % photos.length
        setZoomIndex(prev)
        setZoomImageUrl(photos[prev].fileUrl)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [zoomImageUrl, zoomIndex, report?.photos])

  const openLightbox = (url: string, idx: number) => {
    setZoomImageUrl(url)
    setZoomIndex(idx)
  }

  // ── Back destination: pm/admin → dashboard; others → /reports ───────────
  const backTo = user?.role === 'pm' || user?.role === 'admin' ? '/dashboard' : '/reports'

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

        {/* Back navigation */}
        <Link
          to={backTo}
          id="back-to-dashboard-btn"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-6 group"
        >
          <svg
            className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to {user?.role === 'pm' || user?.role === 'admin' ? 'Dashboard' : 'My Reports'}
        </Link>

        {/* Loading state */}
        {loading && <DetailSkeleton />}

        {/* Error state */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-semibold">{error}</p>
              <button
                onClick={fetchReport}
                className="mt-3 text-sm text-indigo-400 hover:text-indigo-300 underline cursor-pointer transition-colors"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Report content */}
        {!loading && !error && report && (
          <article>
            {/* ── Page header ───────────────────────────────────────────── */}
            <div className="mb-8">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-1">
                    {typeof report.projectId === 'object'
                      ? report.projectId.name
                      : 'Daily Progress Report'}
                  </h1>
                  <p className="text-slate-400 text-sm">
                    {formatDate(report.date)}
                  </p>
                </div>
                {/* Read-only badge */}
                <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 text-xs font-medium">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Read-only
                </span>
              </div>

              {/* Meta pills row */}
              <div className="flex flex-wrap gap-2 mt-4">
                {/* Engineer */}
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs font-medium">
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {typeof report.engineerId === 'object'
                    ? report.engineerId.name
                    : 'Engineer'}
                </span>
                {/* Building type */}
                {typeof report.projectId === 'object' && report.projectId.buildingType && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
                    {buildingTypeLabel(report.projectId.buildingType)}
                  </span>
                )}
                {/* Location */}
                {typeof report.projectId === 'object' && report.projectId.location && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400 text-xs">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    {report.projectId.location}
                  </span>
                )}
                {/* Issues flag */}
                {report.issues && report.issues.trim() && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
                    ⚠ Issues logged
                  </span>
                )}
                {/* Photo count */}
                {report.photos && report.photos.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-medium">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {report.photos.length} {report.photos.length === 1 ? 'photo' : 'photos'}
                  </span>
                )}
              </div>
            </div>

            {/* ── Field grid ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">

              {/* Work Done — full width */}
              <FieldBlock label="Work Done" fullWidth>
                <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {report.workDone}
                </p>
              </FieldBlock>

              {/* Quantity */}
              <FieldBlock label="Quantity Executed">
                <p className="text-sm text-slate-200">
                  {report.quantity || (
                    <span className="text-slate-500 italic">Not logged</span>
                  )}
                </p>
              </FieldBlock>

              {/* Workforce Deployed */}
              <FieldBlock label="Workforce Deployed">
                <div className="grid grid-cols-3 gap-3 text-center mt-1">
                  {[
                    { count: report.labourSkilled, label: 'Skilled' },
                    { count: report.labourUnskilled, label: 'Unskilled' },
                    { count: report.labourOperators, label: 'Operators' },
                  ].map(({ count, label }) => (
                    <div
                      key={label}
                      className="bg-slate-800/60 rounded-xl p-3 border border-white/5"
                    >
                      <span className="block text-2xl font-bold text-white tabular-nums">
                        {count}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </FieldBlock>

              {/* Tomorrow's Plan */}
              <FieldBlock label="Tomorrow's Plan">
                <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {report.tomorrowPlan || (
                    <span className="text-slate-500 italic">Not logged</span>
                  )}
                </p>
              </FieldBlock>

              {/* Issues / Blockers */}
              <FieldBlock
                label="Issues / Blockers"
                highlight={report.issues ? 'issue' : 'none'}
              >
                {report.issues && report.issues.trim() ? (
                  <p className="text-sm text-amber-200 leading-relaxed whitespace-pre-wrap">
                    {report.issues}
                  </p>
                ) : (
                  <p className="text-sm text-emerald-400 flex items-center gap-1.5">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    No issues reported
                  </p>
                )}
              </FieldBlock>

              {/* Remarks — full width */}
              <FieldBlock label="General Remarks" fullWidth>
                <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {report.remarks || (
                    <span className="text-slate-500 italic">No remarks logged</span>
                  )}
                </p>
              </FieldBlock>
            </div>

            {/* ── Photo gallery ──────────────────────────────────────────── */}
            {report.photos && report.photos.length > 0 ? (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h2 className="text-base font-semibold text-white">
                    Site Photos
                  </h2>
                  <span className="text-xs text-slate-500">
                    {report.photos.length} {report.photos.length === 1 ? 'photo' : 'photos'} ·
                    click to enlarge · arrow keys to navigate
                  </span>
                </div>

                {/* Grid — same pattern as MyReportsPage */}
                <div
                  id="report-photo-gallery"
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
                >
                  {report.photos.map((photo, idx) => (
                    <button
                      key={photo._id}
                      id={`photo-thumb-${idx}`}
                      onClick={() => openLightbox(photo.fileUrl, idx)}
                      className="relative group rounded-xl overflow-hidden border border-white/10 bg-slate-800 aspect-square cursor-pointer hover:border-violet-500/50 transition-all focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                      aria-label={`View photo ${idx + 1} of ${report.photos.length}`}
                    >
                      <img
                        src={photo.fileUrl}
                        alt={`Site photo ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-900/90 text-xs font-medium text-white rounded-lg border border-white/10 shadow-xl">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                          </svg>
                          Zoom
                        </span>
                      </div>
                      {/* Index badge */}
                      <span className="absolute bottom-1.5 right-1.5 text-[10px] text-white/70 bg-slate-900/70 rounded px-1 font-mono">
                        {idx + 1}/{report.photos.length}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ) : (
              <div className="flex items-center gap-3 py-5 px-5 rounded-xl bg-white/5 border border-white/10 text-slate-500 text-sm">
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                No photos attached to this report
              </div>
            )}

            {/* ── ADMIN-ONLY: Audit Log + Admin Override Edit ────────────── */}
            {user?.role === 'admin' && (
              <section className="border-t border-white/10 pt-8" id="audit-section">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <h2 className="text-base font-semibold text-white">Audit History</h2>
                    <span className="text-xs text-slate-500 font-normal">Admin only</span>
                  </div>
                  <button
                    id="admin-override-edit-btn"
                    onClick={handleAdminEditOpen}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600/15 hover:bg-amber-600/25 border border-amber-500/30 hover:border-amber-400/50 text-amber-300 text-xs font-semibold transition-all"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Admin Override Edit
                  </button>
                </div>

                {auditLoading ? (
                  <div className="flex items-center gap-2 py-6 text-slate-400 text-sm">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                    </svg>
                    Loading audit history...
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="py-6 px-5 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-400">
                    No edits have been made to this report.
                  </div>
                ) : (
                  <ol className="relative border-l border-white/10 space-y-0 ml-2">
                    {auditLogs.map((entry, idx) => (
                      <li key={entry._id} className="mb-6 ml-5">
                        {/* Timeline dot */}
                        <span className={`absolute -left-[9px] w-4 h-4 rounded-full border-2 ${
                          entry.action === 'admin_edit_after_window'
                            ? 'bg-amber-500 border-amber-400'
                            : 'bg-indigo-500 border-indigo-400'
                        }`} />

                        {/* Entry card */}
                        <div className={`p-4 rounded-xl border text-sm ${
                          entry.action === 'admin_edit_after_window'
                            ? 'bg-amber-500/5 border-amber-500/20'
                            : 'bg-white/5 border-white/10'
                        }`}>
                          <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                            <div>
                              <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider mr-2 ${
                                entry.action === 'admin_edit_after_window'
                                  ? 'bg-amber-500/15 text-amber-300'
                                  : 'bg-indigo-500/15 text-indigo-300'
                              }`}>
                                {entry.action === 'admin_edit_after_window' ? '⚠ Admin Override' : '✎ Engineer Edit'}
                              </span>
                              <span className="text-slate-300 font-medium">{entry.changedBy.name}</span>
                              <span className="text-slate-500 ml-1">({entry.changedBy.email})</span>
                            </div>
                            <time className="text-xs text-slate-500 shrink-0">
                              {new Date(entry.changedAt).toLocaleString('en-IN', {
                                day: '2-digit', month: 'short', year: 'numeric',
                                hour: '2-digit', minute: '2-digit',
                              })}
                            </time>
                          </div>

                          {/* Changes list */}
                          <div className="space-y-1.5">
                            {Object.entries(entry.changes).map(([field, change]) => {
                              if (field === 'photos') return (
                                <div key={field} className="text-xs text-slate-400">
                                  <span className="font-semibold text-slate-300">Photos:</span>{' '}
                                  {(change as any).added?.length ?? 0} new photo(s) added
                                </div>
                              )
                              const c = change as { before?: any; after?: any }
                              return (
                                <div key={field} className="text-xs">
                                  <span className="font-semibold text-slate-300 capitalize">{field.replace(/([A-Z])/g, ' $1')}:</span>{' '}
                                  {c.before !== undefined && (
                                    <span className="text-red-400 line-through mr-1">{String(c.before || '—')}</span>
                                  )}
                                  <span className="text-emerald-400">{String(c.after ?? '—')}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            )}

            {/* ── Footer actions — read-only, back button only ───────────── */}
            <div className="mt-10 pt-6 border-t border-white/10 flex items-center justify-between">
              <button
                onClick={() => navigate(backTo)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-sm font-medium text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to {user?.role === 'pm' || user?.role === 'admin' ? 'Dashboard' : 'My Reports'}
              </button>
              {/* Deliberately no edit/delete/comment buttons — read-only view */}
            </div>
          </article>
        )}
      </main>

      {/* ── ADMIN OVERRIDE EDIT MODAL ────────────────────────────────────── */}
      {showAdminEdit && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl w-full max-w-2xl shadow-2xl">

            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-amber-500/20 flex items-center justify-between bg-amber-500/5 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h2 className="text-base font-bold text-amber-300">Admin Override Edit</h2>
                <span className="text-[10px] text-amber-400/60 font-medium">Bypasses 24-hour window</span>
              </div>
              <button onClick={() => setShowAdminEdit(false)} className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Warning Banner */}
            <div className="mx-6 mt-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300/80 text-xs">
              ⚠ This is an administrator override. Every change made here will be recorded in the audit log with your identity.
            </div>

            {/* Form fields */}
            <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {adminEditSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-semibold flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved successfully. Audit entry created.
                </div>
              )}
              {adminEditError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                  {adminEditError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Work Done *</label>
                <textarea rows={3} value={adminEditFields.workDone || ''} onChange={e => setAdminEditFields(f => ({...f, workDone: e.target.value}))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Quantity</label>
                <input type="text" value={adminEditFields.quantity || ''} onChange={e => setAdminEditFields(f => ({...f, quantity: e.target.value}))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(['labourSkilled', 'labourUnskilled', 'labourOperators'] as const).map((f) => (
                  <div key={f}>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{f.replace('labour', '').replace(/([A-Z])/g, ' $1').trim()}</label>
                    <input type="number" min={0} value={adminEditFields[f] ?? 0} onChange={e => setAdminEditFields(prev => ({...prev, [f]: Number(e.target.value)}))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors" />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Tomorrow's Plan</label>
                <textarea rows={2} value={adminEditFields.tomorrowPlan || ''} onChange={e => setAdminEditFields(f => ({...f, tomorrowPlan: e.target.value}))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Issues / Blockers</label>
                <textarea rows={2} value={adminEditFields.issues || ''} onChange={e => setAdminEditFields(f => ({...f, issues: e.target.value}))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Remarks</label>
                <textarea rows={2} value={adminEditFields.remarks || ''} onChange={e => setAdminEditFields(f => ({...f, remarks: e.target.value}))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors" />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3">
              <button onClick={() => setShowAdminEdit(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-white rounded-xl transition-colors">
                Cancel
              </button>
              <button
                id="admin-edit-save-btn"
                onClick={handleAdminEditSubmit}
                disabled={adminEditSubmitting || adminEditSuccess}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-sm font-semibold text-white rounded-xl transition-colors">
                {adminEditSubmitting ? 'Saving Override...' : 'Save Admin Override'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LIGHTBOX OVERLAY — reused from MyReportsPage pattern ────────────── */}
      {zoomImageUrl && (
        <div
          id="photo-lightbox"
          onClick={() => setZoomImageUrl(null)}
          className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4 cursor-zoom-out"
        >
          {/* Main image */}
          <img
            src={zoomImageUrl}
            alt="Enlarged site progress photo"
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl cursor-default"
          />

          {/* Close button */}
          <button
            id="lightbox-close-btn"
            onClick={() => setZoomImageUrl(null)}
            aria-label="Close lightbox"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-slate-900/80 border border-white/10 text-white flex items-center justify-center hover:bg-slate-800 transition-colors z-10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Prev / Next arrows (only when more than 1 photo) */}
          {report && report.photos && report.photos.length > 1 && (
            <>
              <button
                id="lightbox-prev-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  const prev = (zoomIndex - 1 + (report.photos?.length ?? 1)) % (report.photos?.length ?? 1)
                  setZoomIndex(prev)
                  setZoomImageUrl(report.photos![prev].fileUrl)
                }}
                aria-label="Previous photo"
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/80 border border-white/10 text-white flex items-center justify-center hover:bg-slate-800 transition-colors z-10"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                id="lightbox-next-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  const next = (zoomIndex + 1) % (report.photos?.length ?? 1)
                  setZoomIndex(next)
                  setZoomImageUrl(report.photos![next].fileUrl)
                }}
                aria-label="Next photo"
                className="absolute right-16 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/80 border border-white/10 text-white flex items-center justify-center hover:bg-slate-800 transition-colors z-10"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              {/* Counter */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-slate-900/80 rounded-full text-xs text-slate-300 border border-white/10">
                {zoomIndex + 1} / {report.photos.length}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
