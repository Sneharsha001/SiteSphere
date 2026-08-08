import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import Header from '../components/Header'
import type { DashboardDpr, DashboardKpis } from '../types'

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function truncate(text: string, maxLen = 120): string {
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text
}

function buildingTypeLabel(bt?: string): string {
  if (!bt) return ''
  const map: Record<string, string> = {
    residential_house: 'Residential',
    villa: 'Villa',
    apartment_residential: 'Apartment',
    college_institutional: 'Institutional',
    commercial_office: 'Commercial',
    other_building: 'Other',
  }
  return map[bt] ?? bt
}

// ── Skeleton card ─────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="animate-pulse bg-white/5 border border-white/10 rounded-2xl p-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-white/10 shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-4 bg-white/10 rounded w-3/4" />
          <div className="h-3 bg-white/10 rounded w-1/2" />
          <div className="h-3 bg-white/10 rounded w-full mt-3" />
          <div className="h-3 bg-white/10 rounded w-5/6" />
        </div>
        <div className="h-6 w-16 bg-white/10 rounded-full shrink-0" />
      </div>
    </div>
  )
}

// ── KPI stat card ─────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string
  value: number | string
  icon: React.ReactNode
  accent: string
  loading: boolean
}

function KpiCard({ label, value, icon, accent, loading }: KpiCardProps) {
  return (
    <div
      className={`relative overflow-hidden bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/8 transition-all hover:border-white/20`}
    >
      {/* Glow */}
      <div
        className={`absolute -top-4 -right-4 w-20 h-20 rounded-full blur-2xl opacity-20 ${accent}`}
      />
      <div className="flex items-start justify-between relative">
        <div>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">{label}</p>
          {loading ? (
            <div className="h-9 w-16 bg-white/10 rounded animate-pulse" />
          ) : (
            <p className="text-4xl font-bold text-white tabular-nums">{value}</p>
          )}
        </div>
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent} bg-opacity-20`}
        >
          {icon}
        </div>
      </div>
    </div>
  )
}

// ── Feed card ──────────────────────────────────────────────────────────────

interface FeedCardProps {
  report: DashboardDpr
  onClick: () => void
}

function FeedCard({ report, onClick }: FeedCardProps) {
  const projectName =
    typeof report.projectId === 'object' ? report.projectId.name : 'Unknown Project'
  const engineerName =
    typeof report.engineerId === 'object' ? report.engineerId.name : 'Unknown'
  const buildingType =
    typeof report.projectId === 'object'
      ? buildingTypeLabel(report.projectId.buildingType)
      : ''
  const hasIssues = Boolean(report.issues && report.issues.trim().length > 0)
  const photoCount = report.photos?.length ?? 0

  return (
    <button
      id={`feed-card-${report._id}`}
      onClick={onClick}
      className="w-full text-left group bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/8 hover:border-indigo-500/40 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
    >
      <div className="flex items-start gap-4">
        {/* Date pillar */}
        <div className="shrink-0 w-11 h-11 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex flex-col items-center justify-center">
          <span className="text-indigo-300 text-xs font-bold leading-none">
            {new Date(report.date).toLocaleDateString('en-IN', { day: '2-digit' })}
          </span>
          <span className="text-indigo-400 text-[10px] uppercase font-semibold leading-none mt-0.5">
            {new Date(report.date).toLocaleDateString('en-IN', { month: 'short' })}
          </span>
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors truncate">
              {projectName}
            </h3>
            {buildingType && (
              <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-700/60 text-slate-400 border border-white/10">
                {buildingType}
              </span>
            )}
            {hasIssues && (
              <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                ⚠ Issue
              </span>
            )}
          </div>

          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
            <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {engineerName}
            <span className="text-slate-600">·</span>
            {formatDate(report.date)}
          </p>

          <p className="text-xs text-slate-300 mt-2 leading-relaxed line-clamp-2">
            {truncate(report.workDone)}
          </p>
        </div>

        {/* Right badges */}
        <div className="shrink-0 flex flex-col items-end gap-2">
          {photoCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {photoCount}
            </span>
          )}
          <svg
            className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  // Read access-denied message from router state (redirected from ProtectedRoute)
  const [accessDeniedMsg, setAccessDeniedMsg] = useState<string | null>(
    (location.state as { accessDeniedMessage?: string } | null)?.accessDeniedMessage ?? null
  )

  // ── Feed state ──────────────────────────────────────────────────────────
  const [feed, setFeed] = useState<DashboardDpr[]>([])
  const [feedLoading, setFeedLoading] = useState(true)
  const [feedError, setFeedError] = useState<string | null>(null)

  // ── KPI state ───────────────────────────────────────────────────────────
  const [kpis, setKpis] = useState<DashboardKpis | null>(null)
  const [kpiLoading, setKpiLoading] = useState(true)

  // ── Filter state ────────────────────────────────────────────────────────
  // Projects list for dropdown (fetched once)
  const [projects, setProjects] = useState<{ _id: string; name: string }[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Debounce ref for date inputs
  const dateDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Fetch projects for dropdown ─────────────────────────────────────────
  useEffect(() => {
    api
      .get('/projects')
      .then((res) => {
        if (res.data?.data) setProjects(res.data.data)
      })
      .catch(console.error)
  }, [])

  // ── Fetch feed ──────────────────────────────────────────────────────────
  const fetchFeed = useCallback(
    async (projectId: string, start: string, end: string) => {
      setFeedLoading(true)
      setFeedError(null)
      try {
        const params: Record<string, string> = {}
        if (projectId) params.projectId = projectId
        if (start) params.startDate = start
        if (end) params.endDate = end

        const res = await api.get('/dashboard/feed', { params })
        setFeed(res.data?.data ?? [])
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to load reports. Please try again.'
        setFeedError(msg)
      } finally {
        setFeedLoading(false)
      }
    },
    []
  )

  // ── Fetch KPIs ──────────────────────────────────────────────────────────
  const fetchKpis = useCallback(async () => {
    setKpiLoading(true)
    try {
      const res = await api.get('/dashboard/kpis')
      setKpis(res.data?.data ?? null)
    } catch {
      // Non-critical — silently fail
    } finally {
      setKpiLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchFeed('', '', '')
    fetchKpis()
  }, [fetchFeed, fetchKpis])

  // ── Handlers: filters ───────────────────────────────────────────────────

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setSelectedProjectId(val)
    fetchFeed(val, startDate, endDate)
  }

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setStartDate(val)
    // Debounce so we don't fire for every keystroke
    if (dateDebounceRef.current) clearTimeout(dateDebounceRef.current)
    dateDebounceRef.current = setTimeout(() => fetchFeed(selectedProjectId, val, endDate), 400)
  }

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setEndDate(val)
    if (dateDebounceRef.current) clearTimeout(dateDebounceRef.current)
    dateDebounceRef.current = setTimeout(() => fetchFeed(selectedProjectId, startDate, val), 400)
  }

  const handleClearFilters = () => {
    setSelectedProjectId('')
    setStartDate('')
    setEndDate('')
    fetchFeed('', '', '')
  }

  const hasActiveFilters = Boolean(selectedProjectId || startDate || endDate)

  // ── KPI config ──────────────────────────────────────────────────────────
  const kpiCards = [
    {
      label: 'Reports This Week',
      value: kpis?.reportsThisWeek ?? 0,
      accent: 'bg-indigo-500',
      icon: (
        <svg className="w-5 h-5 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      label: 'Reports This Month',
      value: kpis?.reportsThisMonth ?? 0,
      accent: 'bg-violet-500',
      icon: (
        <svg className="w-5 h-5 text-violet-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      label: 'Open Issues (7d)',
      value: kpis?.openIssues ?? 0,
      accent: 'bg-amber-500',
      icon: (
        <svg className="w-5 h-5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      ),
    },
    {
      label: 'Active Projects',
      value: kpis?.activeProjects ?? 0,
      accent: 'bg-emerald-500',
      icon: (
        <svg className="w-5 h-5 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
  ]

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Access-denied redirect banner */}
        {accessDeniedMsg && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300"
          >
            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <span className="text-sm flex-1">{accessDeniedMsg}</span>
            <button
              aria-label="Dismiss alert"
              onClick={() => setAccessDeniedMsg(null)}
              className="text-amber-400 hover:text-amber-200 transition-colors cursor-pointer shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Page header */}
        <div className="mb-8">
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">
                Dashboard
              </h1>
              <p className="text-slate-400 mt-1 text-sm">
                {user?.role === 'admin'
                  ? 'All daily progress reports across your organisation'
                  : 'Progress reports from your assigned projects'}
              </p>
            </div>
            {/* Read-only badge — PM/Admin are observers only */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 text-xs font-medium">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Read-only view
            </span>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {kpiCards.map((card) => (
            <KpiCard
              key={card.label}
              label={card.label}
              value={card.value}
              icon={card.icon}
              accent={card.accent}
              loading={kpiLoading}
            />
          ))}
        </div>

        {/* Filter bar */}
        <div
          id="dashboard-filter-bar"
          className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6"
        >
          <div className="flex flex-wrap items-end gap-4">
            {/* Project filter */}
            <div className="flex-1 min-w-[180px]">
              <label
                htmlFor="filter-project"
                className="block text-xs font-medium text-slate-400 mb-1.5"
              >
                Project
              </label>
              <select
                id="filter-project"
                value={selectedProjectId}
                onChange={handleProjectChange}
                className="w-full bg-slate-800 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-colors cursor-pointer"
              >
                <option value="">All projects</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Start date */}
            <div className="flex-1 min-w-[150px]">
              <label
                htmlFor="filter-start-date"
                className="block text-xs font-medium text-slate-400 mb-1.5"
              >
                From date
              </label>
              <input
                id="filter-start-date"
                type="date"
                value={startDate}
                onChange={handleStartDateChange}
                max={endDate || undefined}
                className="w-full bg-slate-800 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-colors cursor-pointer [color-scheme:dark]"
              />
            </div>

            {/* End date */}
            <div className="flex-1 min-w-[150px]">
              <label
                htmlFor="filter-end-date"
                className="block text-xs font-medium text-slate-400 mb-1.5"
              >
                To date
              </label>
              <input
                id="filter-end-date"
                type="date"
                value={endDate}
                onChange={handleEndDateChange}
                min={startDate || undefined}
                className="w-full bg-slate-800 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-colors cursor-pointer [color-scheme:dark]"
              />
            </div>

            {/* Clear button */}
            {hasActiveFilters && (
              <button
                id="clear-filters-btn"
                onClick={handleClearFilters}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg transition-all cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear
              </button>
            )}
          </div>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/5">
              {selectedProjectId && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
                  </svg>
                  {projects.find((p) => p._id === selectedProjectId)?.name ?? 'Project'}
                </span>
              )}
              {startDate && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  From: {formatDate(startDate)}
                </span>
              )}
              {endDate && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  To: {formatDate(endDate)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Feed section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Daily Progress Reports
            </h2>
            {!feedLoading && (
              <span className="text-xs text-slate-500">
                {feed.length} {feed.length === 1 ? 'report' : 'reports'}
                {hasActiveFilters ? ' (filtered)' : ''}
              </span>
            )}
          </div>

          {/* Error state */}
          {feedError && (
            <div
              role="alert"
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm mb-4"
            >
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {feedError}
              <button
                onClick={() => fetchFeed(selectedProjectId, startDate, endDate)}
                className="ml-auto shrink-0 text-red-400 hover:text-red-200 underline cursor-pointer text-xs"
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading skeletons */}
          {feedLoading && (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!feedLoading && !feedError && feed.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-slate-300 font-medium text-sm">No reports found</p>
              <p className="text-slate-600 text-xs mt-1">
                {hasActiveFilters
                  ? 'Try adjusting or clearing your filters'
                  : 'No daily progress reports have been submitted yet'}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="mt-4 text-xs text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer underline"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}

          {/* Feed list */}
          {!feedLoading && !feedError && feed.length > 0 && (
            <div id="dashboard-feed-list" className="space-y-3">
              {feed.map((report) => (
                <FeedCard
                  key={report._id}
                  report={report}
                  onClick={() => {
                    // Prompt 3 will build the detail view — navigate to /reports/:id
                    navigate(`/reports/${report._id}`)
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
