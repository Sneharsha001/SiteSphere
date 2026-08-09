import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import type { Project } from '../types'
import Header from '../components/Header'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

interface ReportPhoto {
  _id: string
  fileUrl: string
  timestamp: string
}

interface Report {
  _id: string
  date: string
  projectId: {
    _id: string
    name: string
    buildingType?: string
    location?: string
  }
  workDone: string
  quantity?: string
  labourSkilled: number
  labourUnskilled: number
  labourOperators: number
  tomorrowPlan?: string
  issues?: string
  remarks?: string
  photos: ReportPhoto[]
  createdAt: string
}

export default function MyReportsPage() {
  useAuth()
  const isOnline = useOnlineStatus()

  // Data states
  const [reports, setReports] = useState<Report[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOfflineError, setIsOfflineError] = useState(false)

  // Filter states
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  // Detail view state
  const [activeReportId, setActiveReportId] = useState<string | null>(null)
  const [detailedReport, setDetailedReport] = useState<Report | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Lightbox state for image zoom
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null)

  // ── Fetch Reports & Projects ──────────────────────────────────────────────
  const fetchData = async () => {
    // Don't attempt fetch if offline — avoids confusing network error
    if (!navigator.onLine) {
      setIsOfflineError(true)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      setIsOfflineError(false)

      // Fetch projects to populate project filter dropdown
      const projRes = await api.get('/projects')
      if (projRes.data && projRes.data.data) {
        setProjects(projRes.data.data)
      }

      // Fetch reports
      const repRes = await api.get('/reports')
      if (repRes.data && repRes.data.data) {
        setReports(repRes.data.data)
      }
    } catch (err: any) {
      // Distinguish network failure from a real server error
      const isNetworkErr = !err.response || err.code === 'ERR_NETWORK' || err.message === 'Network Error'
      if (isNetworkErr) {
        setIsOfflineError(true)
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to load progress reports.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Re-fetch when connectivity is restored
  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (isOnline && isOfflineError) {
      fetchData()
    }
  }, [isOnline])

  // ── Fetch single report detail ───────────────────────────────────────────
  const handleOpenDetail = async (reportId: string) => {
    setActiveReportId(reportId)
    setDetailedReport(null)
    setLoadingDetail(true)
    try {
      const res = await api.get(`/reports/${reportId}`)
      if (res.data && res.data.data) {
        setDetailedReport(res.data.data)
      }
    } catch (err: any) {
      console.error('Failed to load report details', err)
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleCloseDetail = () => {
    setActiveReportId(null)
    setDetailedReport(null)
  }

  // ── Filter logic (client-side) ───────────────────────────────────────────
  const filteredReports = reports.filter((rep) => {
    // Project filter
    if (selectedProjectId && rep.projectId?._id !== selectedProjectId) {
      return false
    }

    // Date filters (normalized to Date objects / strings for comparison)
    if (startDate || endDate) {
      const reportDateStr = new Date(rep.date).toISOString().split('T')[0]
      if (startDate && reportDateStr < startDate) {
        return false
      }
      if (endDate && reportDateStr > endDate) {
        return false
      }
    }

    return true
  })

  // Format date helper
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <Header />


      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">My Daily Progress Reports</h1>
            <p className="text-slate-400 mt-1 text-sm">
              List of all daily progress updates submitted for assigned projects.
            </p>
          </div>
          <Link
            id="submit-dpr-btn"
            to="/reports/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-indigo-500/20 self-start sm:self-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Submit Daily Report
          </Link>
        </div>

        {/* Offline banner — shown when device has no connectivity */}
        {isOfflineError && (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M6.343 6.343a9 9 0 000 12.728M9.172 9.172a5 5 0 000 7.072M12 12h.01" />
            </svg>
            <div>
              <p className="text-amber-300 text-sm font-semibold">You're offline</p>
              <p className="text-amber-400/70 text-xs mt-0.5">
                Report list can't be loaded without a connection. Any reports you submit now will be saved locally and synced automatically when you reconnect.
              </p>
            </div>
          </div>
        )}

        {/* Global server error message */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
            {error}
          </div>
        )}

        {/* Filters Toolbar */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Project Filter */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Filter by Project
            </label>
            <select
              id="project-filter"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full bg-slate-800 border border-white/15 rounded-lg px-3.5 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            >
              <option value="">All Projects</option>
              {projects.map((proj) => (
                <option key={proj._id} value={proj._id}>
                  {proj.name}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              From Date
            </label>
            <input
              id="start-date-filter"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-800 border border-white/15 rounded-lg px-3.5 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              To Date
            </label>
            <input
              id="end-date-filter"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-800 border border-white/15 rounded-lg px-3.5 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <svg className="animate-spin w-8 h-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
            </svg>
            <span className="text-slate-400 text-sm">Loading reports...</span>
          </div>
        ) : filteredReports.length === 0 ? (
          /* Empty State */
          <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">No reports yet — submit your first one</h2>
            <p className="text-slate-400 text-sm max-w-sm mx-auto mb-6">
              You haven't submitted any daily progress reports matching the selected filters.
            </p>
            <Link
              to="/reports/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors shadow-lg"
            >
              Submit Daily Progress Report
            </Link>
          </div>
        ) : (
          /* Reports Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReports.map((report) => {
              const photoCount = report.photos?.length || 0
              const truncatedWork =
                report.workDone.length > 100
                  ? `${report.workDone.substring(0, 100)}...`
                  : report.workDone

              return (
                <div
                  key={report._id}
                  onClick={() => handleOpenDetail(report._id)}
                  className="bg-white/5 border border-white/10 hover:border-indigo-500/40 rounded-xl p-5 hover:bg-white/8 transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <span className="text-xs font-semibold text-indigo-400">
                        {formatDate(report.date)}
                      </span>
                      {photoCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          📷 {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
                        </span>
                      )}
                    </div>

                    {/* Project Name */}
                    <h3 className="text-base font-semibold text-white mb-2 truncate group-hover:text-indigo-300 transition-colors">
                      {report.projectId?.name || 'Unknown Project'}
                    </h3>

                    {/* Work done snippet */}
                    <p className="text-sm text-slate-400 leading-relaxed line-clamp-3">
                      {truncatedWork}
                    </p>
                  </div>

                  {/* Quantity and Footer */}
                  <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {report.quantity ? `Qty: ${report.quantity}` : 'No quantity logged'}
                    </span>
                    <span className="text-indigo-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-0.5 font-medium">
                      View full report
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* ── DETAIL MODAL OVERLAY ───────────────────────────────────────────── */}
      {activeReportId && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto flex flex-col shadow-2xl">
            
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur z-10">
              <div className="min-w-0 pr-2">
                <span className="text-[11px] sm:text-xs text-indigo-400 font-semibold uppercase tracking-wider block">
                  {detailedReport ? formatDate(detailedReport.date) : 'Loading...'}
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-white leading-tight truncate">
                  {detailedReport ? detailedReport.projectId?.name : 'Report Details'}
                </h2>
              </div>
              <button
                onClick={handleCloseDetail}
                className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors shrink-0"
                aria-label="Close details"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 flex-1">
              {loadingDetail ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <svg className="animate-spin w-8 h-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                  </svg>
                  <span className="text-slate-400 text-sm">Fetching report detail...</span>
                </div>
              ) : detailedReport ? (
                <>
                  {/* Grid details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    {/* Work done */}
                    <div className="md:col-span-2 bg-white/5 border border-white/10 rounded-xl p-4 sm:p-5">
                      <h4 className="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Work Done Description</h4>
                      <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{detailedReport.workDone}</p>
                    </div>

                    {/* Quantity Executed */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-5">
                      <h4 className="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Quantity Executed</h4>
                      <p className="text-sm text-slate-200">{detailedReport.quantity || 'None logged'}</p>
                    </div>

                    {/* Workforce Deployed */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-5">
                      <h4 className="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 sm:mb-3">Workforce Deployed</h4>
                      <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                        <div className="bg-slate-800/50 rounded-lg p-2 sm:p-2.5 border border-white/5">
                          <span className="block text-base sm:text-lg font-bold text-white">{detailedReport.labourSkilled}</span>
                          <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium uppercase tracking-wide">Skilled</span>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-2 sm:p-2.5 border border-white/5">
                          <span className="block text-base sm:text-lg font-bold text-white">{detailedReport.labourUnskilled}</span>
                          <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium uppercase tracking-wide">Unskilled</span>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-2 sm:p-2.5 border border-white/5">
                          <span className="block text-base sm:text-lg font-bold text-white">{detailedReport.labourOperators}</span>
                          <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium uppercase tracking-wide">Operators</span>
                        </div>
                      </div>
                    </div>

                    {/* Tomorrow's Plan */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-5">
                      <h4 className="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Tomorrow's Plan</h4>
                      <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{detailedReport.tomorrowPlan || 'None logged'}</p>
                    </div>

                    {/* Issues / Blockers */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-5">
                      <h4 className="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Issues / Blockers</h4>
                      {detailedReport.issues ? (
                        <p className="text-sm text-red-300 leading-relaxed whitespace-pre-wrap bg-red-950/20 border border-red-900/30 rounded-lg p-3">{detailedReport.issues}</p>
                      ) : (
                        <p className="text-sm text-slate-400 italic">No issues logged</p>
                      )}
                    </div>

                    {/* Remarks */}
                    <div className="md:col-span-2 bg-white/5 border border-white/10 rounded-xl p-4 sm:p-5">
                      <h4 className="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">General Remarks</h4>
                      <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{detailedReport.remarks || 'No remarks logged'}</p>
                    </div>
                  </div>

                  {/* Image Gallery */}
                  {detailedReport.photos && detailedReport.photos.length > 0 && (
                    <div className="border-t border-white/10 pt-5 sm:pt-6">
                      <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <span>📷 Site Photos</span>
                        <span className="text-xs font-normal text-slate-400">({detailedReport.photos.length} photos)</span>
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                        {detailedReport.photos.map((photo) => (
                          <div
                            key={photo._id}
                            onClick={() => setZoomImageUrl(photo.fileUrl)}
                            className="relative group rounded-xl overflow-hidden border border-white/10 bg-slate-800 aspect-square cursor-pointer hover:border-indigo-500/50 transition-colors"
                          >
                            <img
                              src={photo.fileUrl}
                              alt="Site update"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="px-3 py-1.5 bg-slate-900/90 text-xs font-medium text-white rounded-lg border border-white/10 shadow-xl flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                </svg>
                                Zoom
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-10 text-slate-400">Failed to load report data.</div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t border-white/10 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900">
              <div className="flex-1 text-left">
                {detailedReport && (Date.now() - new Date(detailedReport.createdAt).getTime() >= 24 * 60 * 60 * 1000) && (
                  <span className="text-slate-500 text-xs italic block">
                    This report can no longer be edited directly (24-hour window passed). Contact an Admin if a change is needed.
                  </span>
                )}
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                {detailedReport && (Date.now() - new Date(detailedReport.createdAt).getTime() < 24 * 60 * 60 * 1000) && (
                  <Link
                    id="edit-dpr-btn"
                    to={`/reports/${detailedReport._id}/edit`}
                    className="w-full sm:w-auto px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white rounded-xl transition-colors shadow-lg shadow-indigo-500/20 text-center min-h-[44px] flex items-center justify-center"
                  >
                    Edit Report
                  </Link>
                )}
                <button
                  onClick={handleCloseDetail}
                  className="w-full sm:w-auto px-5 py-3 bg-white/5 hover:bg-white/10 text-sm font-medium text-white rounded-xl transition-colors border border-white/10 min-h-[44px] flex items-center justify-center"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── LIGHTBOX OVERLAY ───────────────────────────────────────────────── */}
      {zoomImageUrl && (
        <div
          onClick={() => setZoomImageUrl(null)}
          className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4 cursor-zoom-out"
        >
          <img
            src={zoomImageUrl}
            alt="Enlarged site progress view"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
          <button
            onClick={() => setZoomImageUrl(null)}
            className="absolute top-4 right-4 w-11 h-11 rounded-full bg-slate-900/80 border border-white/10 text-white flex items-center justify-center hover:bg-slate-800 transition-colors z-10"
            aria-label="Close image lightbox"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
