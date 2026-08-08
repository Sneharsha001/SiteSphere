import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Header from '../components/Header'

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

export default function DashboardPage() {
  const { user } = useAuth()
  const location = useLocation()

  // Read the access-denied message passed via router state (from ProtectedRoute redirects)
  const [accessDeniedMsg, setAccessDeniedMsg] = useState<string | null>(
    (location.state as { accessDeniedMessage?: string } | null)?.accessDeniedMessage ?? null
  )

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <Header />


      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Access-denied redirect banner */}
        {accessDeniedMsg && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300"
          >
            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <span className="text-sm flex-1">{accessDeniedMsg}</span>
            <button
              aria-label="Dismiss"
              onClick={() => setAccessDeniedMsg(null)}
              className="text-amber-400 hover:text-amber-200 transition-colors cursor-pointer shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

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
