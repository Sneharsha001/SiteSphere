import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const stats = [
  { label: 'Active Projects', value: '12', change: '+2 this week', icon: '🏗️' },
  { label: 'On-Site Engineers', value: '48', change: '3 on leave', icon: '👷' },
  { label: 'Tasks Completed', value: '87%', change: 'Up from 79%', icon: '✅' },
  { label: 'Pending Issues', value: '5', change: '2 critical', icon: '⚠️' },
]

const recentActivity = [
  { project: 'Highway Overpass — Phase 2', action: 'Progress updated to 65%', time: '2h ago', icon: '🏗️' },
  { project: 'Metro Rail Section B', action: 'New material delivery logged', time: '4h ago', icon: '🚇' },
  { project: 'Bridge Foundation', action: 'Inspection report submitted', time: '6h ago', icon: '🌉' },
  { project: 'Urban Drainage System', action: 'Milestone reached: Trench complete', time: '1d ago', icon: '🔧' },
]

const roleBadge: Record<string, { label: string; cls: string }> = {
  admin: { label: 'Admin', cls: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
  pm: { label: 'Project Manager', cls: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  site_engineer: { label: 'Site Engineer', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
}

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const badge = user ? (roleBadge[user.role] ?? roleBadge.admin) : null

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
            <Link to="/dashboard" className="text-white font-medium">Dashboard</Link>
            <Link to="/projects" className="hover:text-white transition-colors">Projects</Link>
            {(user?.role === 'site_engineer' || user?.role === 'admin') && (
              <>
                <Link to="/reports" className="hover:text-white transition-colors">My Reports</Link>
                <Link to="/reports/new" className="hover:text-white transition-colors">Submit DPR</Link>
              </>
            )}

            {/* User info + logout */}
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
                  className="flex items-center gap-1.5 text-slate-400 hover:text-red-400 transition-colors text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign out
                </button>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Welcome header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">
            Welcome back{user ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-slate-400 mt-1">Overview of all site progress and activities</p>
        </div>

        {/* Auth status banner */}
        {user && (
          <div className="mb-8 flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 w-fit">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 text-sm font-medium">
              Authenticated via JWT · Org ID: {user.orgId.slice(-6)}
            </span>
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/8 transition-colors"
            >
              <div className="flex items-start justify-between">
                <p className="text-slate-400 text-sm font-medium">{stat.label}</p>
                <span className="text-2xl">{stat.icon}</span>
              </div>
              <p className="text-4xl font-bold mt-2 text-white">{stat.value}</p>
              <p className="text-xs text-slate-500 mt-1">{stat.change}</p>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
          <ul className="space-y-3">
            {recentActivity.map((item) => (
              <li
                key={item.project}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors"
              >
                <span className="text-2xl leading-none mt-0.5">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{item.project}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.action}</p>
                </div>
                <span className="text-xs text-slate-500 shrink-0">{item.time}</span>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  )
}
