import { Link } from 'react-router-dom'

const stats = [
  { label: 'Active Projects', value: '12', change: '+2 this week', color: 'indigo' },
  { label: 'On-Site Engineers', value: '48', change: '3 on leave', color: 'violet' },
  { label: 'Tasks Completed', value: '87%', change: 'Up from 79%', color: 'emerald' },
  { label: 'Pending Issues', value: '5', change: '2 critical', color: 'amber' },
]

const recentActivity = [
  { project: 'Highway Overpass — Phase 2', action: 'Progress updated to 65%', time: '2h ago', icon: '🏗️' },
  { project: 'Metro Rail Section B', action: 'New material delivery logged', time: '4h ago', icon: '🚇' },
  { project: 'Bridge Foundation', action: 'Inspection report submitted', time: '6h ago', icon: '🌉' },
  { project: 'Urban Drainage System', action: 'Milestone reached: Trench complete', time: '1d ago', icon: '🔧' },
]

export default function DashboardPage() {
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
            <Link to="/dashboard" className="text-white font-medium">Dashboard</Link>
            <Link to="/projects" className="hover:text-white transition-colors">Projects</Link>
            <Link to="/login" className="hover:text-white transition-colors">Logout</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 mt-1">Overview of all site progress and activities</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/8 transition-colors"
            >
              <p className="text-slate-400 text-sm font-medium">{stat.label}</p>
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
              <li key={item.project} className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors">
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
