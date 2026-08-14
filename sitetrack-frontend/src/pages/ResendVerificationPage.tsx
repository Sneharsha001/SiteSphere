import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import axios from 'axios'

/**
 * /resend-verification
 *
 * Lets users who never received (or let expire) their verification email
 * request a fresh one without logging in.
 */
export default function ResendVerificationPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await api.post('/auth/resend-verification', { email })
      setSubmitted(true)
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? 'Failed to send verification email.')
      } else {
        setError('An unexpected error occurred.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex items-center justify-center p-4">
      <div className="relative w-full max-w-md">
        {/* Glow */}
        <div className="absolute top-10 left-10 w-64 h-64 bg-indigo-600 rounded-full opacity-10 blur-3xl pointer-events-none" />

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 mb-3 shadow-lg shadow-indigo-500/30">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">Resend Verification</h1>
            <p className="text-slate-400 text-sm mt-1">Enter your email to get a new verification link</p>
          </div>

          {submitted ? (
            <div className="text-center space-y-4">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm">
                If an unverified account exists for{' '}
                <span className="font-semibold text-white">{email}</span>, a new verification
                link has been sent to your inbox.
              </div>
              <Link
                to="/login"
                className="inline-block w-full py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-all text-center"
              >
                Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="resend-email" className="block text-sm font-medium text-slate-300 mb-1.5">
                  Email Address
                </label>
                <input
                  id="resend-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white
                    placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                id="resend-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500
                  disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm
                  transition-all shadow-lg shadow-indigo-500/20"
              >
                {loading ? 'Sending…' : 'Send Verification Email'}
              </button>

              <div className="text-center mt-4">
                <Link to="/login" className="text-sm text-slate-400 hover:text-white transition-colors">
                  ← Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
