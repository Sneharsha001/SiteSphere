import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'

export default function SignupPage() {
  const [form, setForm] = useState({
    organizationName: '',
    name: '',
    email: '',
    password: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.organizationName.trim() || !form.name.trim() || !form.email.trim() || !form.password) {
      setError('All fields are required.')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    try {
      setSubmitting(true)
      await api.post('/auth/register', {
        organizationName: form.organizationName.trim(),
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      })
      setSubmitted(true)
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Registration failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Pending confirmation screen ─────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          {/* Success icon */}
          <div className="w-20 h-20 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-white mb-3">Request Submitted</h1>
          <p id="pending-message" className="text-slate-300 text-base leading-relaxed mb-8">
            Your account request has been submitted.{' '}
            <span className="text-amber-400 font-medium">An Admin will review and approve it</span>{' '}
            before you can log in.
          </p>

          <div className="bg-slate-900/70 border border-white/10 rounded-xl p-4 text-left mb-8">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-2">What happens next</p>
            <ul className="space-y-2">
              {[
                'Your request is queued for Admin review',
                'Admin will approve your account and confirm your role',
                'You\'ll be able to log in once approved',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex-shrink-0 flex items-center justify-center text-xs font-semibold mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ul>
          </div>

          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Login
          </Link>
        </div>
      </div>
    )
  }

  // ── Registration form ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Create an Account</h1>
          <p className="text-slate-400 text-sm mt-1">Your request will be reviewed by an Admin before activation</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-8">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form id="signup-form" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Organisation Name <span className="text-red-400">*</span>
              </label>
              <input
                id="signup-org-name"
                type="text"
                value={form.organizationName}
                onChange={(e) => setForm({ ...form, organizationName: e.target.value })}
                placeholder="e.g. Skyline Constructions Pvt Ltd"
                className="w-full bg-slate-800 border border-white/15 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Your Full Name <span className="text-red-400">*</span>
              </label>
              <input
                id="signup-name"
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Arjun Sharma"
                className="w-full bg-slate-800 border border-white/15 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Work Email <span className="text-red-400">*</span>
              </label>
              <input
                id="signup-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="arjun@skylineconstructions.com"
                className="w-full bg-slate-800 border border-white/15 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Password <span className="text-red-400">*</span>
              </label>
              <input
                id="signup-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="e.g. MyPass@123"
                className="w-full bg-slate-800 border border-white/15 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
              <p className="text-xs text-slate-500 mt-1.5">Min 8 chars · uppercase · lowercase · number · special character</p>
            </div>

            <button
              id="signup-submit-btn"
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                  </svg>
                  Submitting Request…
                </>
              ) : (
                'Submit Account Request'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
