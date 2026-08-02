import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import LoginForm from '../components/LoginForm'
import { useAuth } from '../context/AuthContext'

/**
 * /login — Authentication page.
 * Redirects authenticated users to /dashboard immediately.
 * After successful login, redirects to the originally intended URL (state.from)
 * or falls back to /dashboard.
 */
export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isLoading } = useAuth()

  // If already authenticated, skip the login page
  useEffect(() => {
    if (!isLoading && user) {
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard'
      navigate(from, { replace: true })
    }
  }, [user, isLoading, navigate, location.state])

  const handleSuccess = () => {
    const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard'
    navigate(from, { replace: true })
  }

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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">SiteTrack</h1>
            <p className="text-slate-400 mt-1 text-sm">Civil Engineering Progress Portal</p>
          </div>

          <LoginForm onSuccess={handleSuccess} />

          <p className="text-center text-slate-600 text-xs mt-6">
            Secure access · JWT authentication
          </p>
        </div>
      </div>
    </div>
  )
}
