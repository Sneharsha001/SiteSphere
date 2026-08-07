import { Link } from 'react-router-dom'

const projects = [
  { id: 1, name: 'Highway Overpass — Phase 2', status: 'active', progress: 65, manager: 'Arjun Sharma', location: 'Mumbai' },
  { id: 2, name: 'Metro Rail Section B', status: 'active', progress: 42, manager: 'Priya Nair', location: 'Bangalore' },
  { id: 3, name: 'Bridge Foundation Works', status: 'planning', progress: 8, manager: 'Rohan Mehta', location: 'Pune' },
  { id: 4, name: 'Urban Drainage System', status: 'completed', progress: 100, manager: 'Sneha Reddy', location: 'Chennai' },
  { id: 5, name: 'Commercial Complex — Basement', status: 'on_hold', progress: 31, manager: 'Vikram Patel', location: 'Delhi' },
]

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  planning: { label: 'Planning', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  completed: { label: 'Completed', className: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
  on_hold: { label: 'On Hold', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
}

export default function ProjectsPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Top nav */}
      <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span className="font-bold text-lg tracking-tight">SiteTrack</span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-slate-400">
            <Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
            <Link to="/projects" className="text-white font-medium">Projects</Link>
            <Link to="/reports" className="hover:text-white transition-colors">My Reports</Link>
            <Link to="/reports/new" className="hover:text-white transition-colors">Submit DPR</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Projects</h1>
            <p className="text-slate-400 mt-1">{projects.length} total projects</p>
          </div>
          <button
            id="new-project-btn"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Project
          </button>
        </div>

        <div className="grid gap-4">
          {projects.map((project) => {
            const status = statusConfig[project.status]
            return (
              <div
                key={project.id}
                className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/8 transition-all hover:border-white/20 group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-base font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                        {project.name}
                      </h2>
                      <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border ${status.className}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Manager: <span className="text-slate-300">{project.manager}</span>
                      &nbsp;·&nbsp;{project.location}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-2xl font-bold text-white">{project.progress}%</span>
                    <p className="text-xs text-slate-500">complete</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
