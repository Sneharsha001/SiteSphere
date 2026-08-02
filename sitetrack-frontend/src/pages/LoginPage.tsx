import { useNavigate } from 'react-router-dom'
import LoginForm from '../components/LoginForm'

/**
 * /login — Login page showcasing Tailwind classes + React Hook Form + Zod
 */
export default function LoginPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex items-center justify-center p-4">
      {/* Glow orb decorations */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-indigo-600 rounded-full opacity-10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-violet-600 rounded-full opacity-10 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          {/* Logo + Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 mb-4 shadow-lg shadow-indigo-500/30">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">SiteTrack</h1>
            <p className="text-slate-400 mt-1 text-sm">Civil Engineering Progress Portal</p>
          </div>

          {/* Tailwind test badge — confirms Tailwind is rendering */}
          <div className="mb-6 flex justify-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Tailwind CSS v4 — Active ✓
            </span>
          </div>

          <LoginForm onSuccess={() => navigate('/dashboard')} />

          <p className="text-center text-slate-500 text-xs mt-6">
            Don't have an account?{' '}
            <button
              onClick={() => navigate('/dashboard')}
              className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
            >
              View Dashboard Demo
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
