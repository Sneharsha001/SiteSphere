import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { getPendingReportsCount } from '../lib/db'

type UserRole = 'admin' | 'pm' | 'site_engineer'

const roleBadge: Record<UserRole, { label: string; cls: string }> = {
  admin: { label: 'Admin', cls: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
  pm: { label: 'Project Manager', cls: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  site_engineer: { label: 'Site Engineer', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
}

export default function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isOnline = useOnlineStatus()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    // Initial fetch of pending count
    getPendingReportsCount().then(setPendingCount).catch(console.error)

    // Listen to custom updates
    const handleUpdate = () => {
      getPendingReportsCount().then(setPendingCount).catch(console.error)
    }

    window.addEventListener('pending-reports-updated', handleUpdate)
    window.addEventListener('online', handleUpdate) // check when back online

    return () => {
      window.removeEventListener('pending-reports-updated', handleUpdate)
      window.removeEventListener('online', handleUpdate)
    }
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const badge = user ? (roleBadge[user.role as UserRole] ?? roleBadge.site_engineer) : null
  const currentPath = location.pathname

  return (
    <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="flex items-center gap-3">
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
            <span className="font-bold text-lg tracking-tight text-white">SiteTrack</span>
          </Link>
        </div>

        {/* Navigation & Controls — links are role-specific */}
        <nav className="flex items-center gap-6 text-sm text-slate-400">

          {/* ── Site Engineer: My Reports + Submit DPR ── */}
          {user?.role === 'site_engineer' && (
            <>
              <Link
                to="/reports"
                className={`transition-colors hover:text-white ${currentPath === '/reports' ? 'text-white font-medium' : ''}`}
              >
                My Reports
              </Link>
              <Link
                to="/reports/new"
                className={`transition-colors hover:text-white ${currentPath === '/reports/new' ? 'text-white font-medium' : ''}`}
              >
                Submit DPR
              </Link>
            </>
          )}

          {/* ── PM: Dashboard ── */}
          {user?.role === 'pm' && (
            <>
              <Link
                to="/dashboard"
                className={`transition-colors hover:text-white ${currentPath === '/dashboard' ? 'text-white font-medium' : ''}`}
              >
                Dashboard
              </Link>
            </>
          )}

          {/* ── Admin: Dashboard + Projects + Users ── */}
          {user?.role === 'admin' && (
            <>
              <Link
                to="/dashboard"
                className={`transition-colors hover:text-white ${currentPath === '/dashboard' ? 'text-white font-medium' : ''}`}
              >
                Dashboard
              </Link>
              <Link
                to="/projects"
                className={`transition-colors hover:text-white ${currentPath === '/projects' ? 'text-white font-medium' : ''}`}
              >
                Projects
              </Link>
              <Link
                to="/users"
                className={`transition-colors hover:text-white ${currentPath === '/users' ? 'text-white font-medium' : ''}`}
              >
                Users
              </Link>
            </>
          )}

          {/* Connection Status Badge */}
          <div className="flex items-center gap-2">
            {isOnline ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Online
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                Offline
              </span>
            )}

            {/* Pending Reports Badge */}
            {pendingCount > 0 && (
              <span
                id="pending-reports-badge"
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20 animate-pulse"
                title={`${pendingCount} reports saved locally waiting to sync`}
              >
                Pending: {pendingCount}
              </span>
            )}
          </div>

          {/* User profile & Logout */}
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
                id="logout-btn"
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-slate-400 hover:text-red-400 transition-colors text-sm font-medium cursor-pointer"
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
  )
}
