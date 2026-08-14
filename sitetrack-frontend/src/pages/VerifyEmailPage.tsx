import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { api } from '../lib/api'
import axios from 'axios'

/**
 * /verify-email?token=<raw-token>
 *
 * Sent as a link in the verification email. Validates the token against
 * the backend and shows a success or error state.
 */
export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Verification link is missing a token. Please check your email link.')
      return
    }

    api
      .post('/auth/verify-email', { token })
      .then(() => {
        setStatus('success')
      })
      .catch((err) => {
        if (axios.isAxiosError(err)) {
          setMessage(err.response?.data?.message ?? 'Verification failed. The link may have expired.')
        } else {
          setMessage('An unexpected error occurred.')
        }
        setStatus('error')
      })
  }, [token])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex items-center justify-center p-4">
      <div className="relative w-full max-w-md">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl text-center space-y-5">

          {status === 'loading' && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 mx-auto">
                <svg className="animate-spin w-7 h-7 text-indigo-400" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                </svg>
              </div>
              <p className="text-white font-semibold text-lg">Verifying your email…</p>
              <p className="text-slate-400 text-sm">Please wait a moment.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 mx-auto">
                <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-white font-semibold text-lg">Email Verified!</p>
              <p className="text-slate-400 text-sm">
                Your email address has been verified. You can now sign in.
              </p>
              <Link
                to="/login"
                className="inline-block w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all"
              >
                Go to Login
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-600/20 border border-red-500/30 mx-auto">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-white font-semibold text-lg">Verification Failed</p>
              <p className="text-red-400 text-sm">
                {message || 'The link is invalid or has expired. Please request a new one.'}
              </p>
              <div className="flex flex-col gap-2 pt-2">
                <Link
                  to="/resend-verification"
                  className="inline-block w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all"
                >
                  Resend Verification Email
                </Link>
                <Link
                  to="/login"
                  className="inline-block w-full py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-all"
                >
                  Back to Login
                </Link>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
