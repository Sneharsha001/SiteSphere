import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import Header from '../components/Header'
import type { Project, BuildingType } from '../types'

// ── Helpers ───────────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  on_hold: { label: 'On Hold', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  completed: { label: 'Completed', className: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
}

const buildingTypeLabels: Record<BuildingType, string> = {
  residential_house: 'Residential House',
  villa: 'Villa',
  apartment_residential: 'Apartment / Residential',
  college_institutional: 'College / Institutional',
  commercial_office: 'Commercial Office',
  other_building: 'Other Building',
}

const BUILDING_TYPES: BuildingType[] = [
  'residential_house',
  'villa',
  'apartment_residential',
  'college_institutional',
  'commercial_office',
  'other_building',
]

// ── New Project Modal ─────────────────────────────────────────────────────

interface NewProjectModalProps {
  onClose: () => void
  onCreated: (project: Project) => void
}

function NewProjectModal({ onClose, onCreated }: NewProjectModalProps) {
  const [form, setForm] = useState({
    name: '',
    location: '',
    startDate: '',
    buildingType: '' as BuildingType | '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.buildingType) {
      setError('Project name and building type are required.')
      return
    }
    try {
      setSubmitting(true)
      setError(null)
      const payload: any = {
        name: form.name.trim(),
        buildingType: form.buildingType,
      }
      if (form.location.trim()) payload.location = form.location.trim()
      if (form.startDate) payload.startDate = form.startDate

      const res = await api.post('/projects', payload)
      if (res.data?.data) {
        onCreated(res.data.data)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to create project.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">New Project</h2>
            <p className="text-xs text-slate-400 mt-0.5">Create a new building project in your organisation</p>
          </div>
          <button
            id="close-new-project-modal"
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form id="new-project-form" onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Project Name <span className="text-red-400">*</span>
            </label>
            <input
              id="new-project-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Skyline Apartments — Block A"
              className="w-full bg-slate-800 border border-white/15 rounded-lg px-3.5 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Location
            </label>
            <input
              id="new-project-location"
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="e.g. Hyderabad, Telangana"
              className="w-full bg-slate-800 border border-white/15 rounded-lg px-3.5 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            />
          </div>

          {/* Building Type */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Building Type <span className="text-red-400">*</span>
            </label>
            <select
              id="new-project-building-type"
              value={form.buildingType}
              onChange={(e) => setForm({ ...form, buildingType: e.target.value as BuildingType })}
              className="w-full bg-slate-800 border border-white/15 rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            >
              <option value="">Select building type…</option>
              {BUILDING_TYPES.map((t) => (
                <option key={t} value={t}>{buildingTypeLabels[t]}</option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Start Date
            </label>
            <input
              id="new-project-start-date"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="w-full bg-slate-800 border border-white/15 rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-sm font-medium text-white rounded-xl border border-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              id="submit-new-project-btn"
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-sm font-semibold text-white rounded-xl shadow-lg shadow-indigo-500/20 transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                  </svg>
                  Creating…
                </>
              ) : (
                'Create Project'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── ProjectsPage ──────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  const fetchProjects = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get('/projects')
      if (res.data?.data) {
        setProjects(res.data.data)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load projects.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const handleProjectCreated = (project: Project) => {
    setProjects((prev) => [project, ...prev])
    setShowModal(false)
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Projects</h1>
            <p className="text-slate-400 mt-1 text-sm">
              {loading ? 'Loading…' : `${projects.length} project${projects.length !== 1 ? 's' : ''} in your organisation`}
            </p>
          </div>
          <button
            id="new-project-btn"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Project
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-3">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.293 4.293a1 1 0 011.414 0l7 7a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7a1 1 0 010-1.414l7-7z" />
            </svg>
            {error}
          </div>
        )}

        {/* Loading spinner */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <svg className="animate-spin w-8 h-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
            </svg>
            <span className="text-slate-400 text-sm">Loading projects…</span>
          </div>
        ) : projects.length === 0 ? (
          /* Empty state */
          <div className="bg-white/5 border border-white/10 rounded-2xl p-14 text-center">
            <div className="w-16 h-16 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">No projects yet</h2>
            <p className="text-slate-400 text-sm max-w-sm mx-auto mb-6">
              Get started by creating your first building project.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors shadow-lg"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create First Project
            </button>
          </div>
        ) : (
          /* Projects list */
          <div className="grid gap-4">
            {projects.map((project) => {
              const status = statusConfig[project.status] ?? statusConfig.active
              return (
                <div
                  key={project._id}
                  className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/[0.07] hover:border-white/20 transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <h2 className="text-base font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                          {project.name}
                        </h2>
                        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border ${status.className}`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap mt-1">
                        {project.location && (
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {project.location}
                          </span>
                        )}
                        <span className="text-xs text-slate-500">
                          {buildingTypeLabels[project.buildingType] ?? project.buildingType}
                        </span>
                        {project.startDate && (
                          <span className="text-xs text-slate-500">
                            Started: {new Date(project.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] text-slate-500">
                        Created {new Date(project.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* New project modal */}
      {showModal && (
        <NewProjectModal
          onClose={() => setShowModal(false)}
          onCreated={handleProjectCreated}
        />
      )}
    </div>
  )
}
