import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { UserRole } from '../types'

const roleBadge: Record<string, { label: string; cls: string }> = {
  admin: { label: 'Admin', cls: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
  pm: { label: 'Project Manager', cls: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  site_engineer: { label: 'Site Engineer', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
}

export default function MyReportsPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const badge = user ? (roleBadge[user.role as UserRole] ?? roleBadge.site_engineer) : null

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Top nav */}
      <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <span className="font-bold text-lg tracking-tight">SiteTrack</span>
          </div>

          <nav className="flex items-center gap-6 text-sm text-slate-400">
            <Link to="/dashboard" className="hover:text-white transition-colors">
              Dashboard
            </Link>
            <Link to="/projects" className="hover:text-white transition-colors">
              Projects
            </Link>
            <Link to="/reports" className="text-white font-medium">
              My Reports
            </Link>
            <Link to="/reports/new" className="hover:text-white transition-colors">
              Submit DPR
            </Link>

            {user && (
              <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                <div className="text-right hidden sm:block">
                  <p className="text-white text-sm font-medium leading-none">{user.name}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{user.email}</p>
                </div>
                {badge && (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badge.cls}`}>
                    {badge.label}
                  </span>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-slate-400 hover:text-red-400 transition-colors text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Sign out
                </button>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">My Progress Reports</h1>
            <p className="text-slate-400 mt-1">View and manage your submitted daily progress reports.</p>
          </div>
          <Link
            id="new-dpr-link"
            to="/reports/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Submit New DPR
          </Link>
        </div>

        {/* Placeholder Content Card */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">My Reports List</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
            This route is ready to display all daily progress reports submitted by you.
          </p>
          <Link
            to="/reports/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
          >
            Submit Daily Progress Report
          </Link>
        </div>
      </main>
    </div>
  )
}
