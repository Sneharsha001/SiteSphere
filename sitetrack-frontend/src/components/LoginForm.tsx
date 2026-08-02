import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import axios from 'axios'

// ── Schemas ───────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const forgotSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
})

type LoginFormData = z.infer<typeof loginSchema>
type ForgotFormData = z.infer<typeof forgotSchema>

interface LoginFormProps {
  onSuccess: () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────

function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.message ?? 'Something went wrong. Please try again.'
  }
  return 'An unexpected error occurred.'
}

// ── Component ─────────────────────────────────────────────────────────────

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const { login } = useAuth()
  const [showForgot, setShowForgot] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [forgotSuccess, setForgotSuccess] = useState(false)
  const [isLoginLoading, setIsLoginLoading] = useState(false)
  const [isForgotLoading, setIsForgotLoading] = useState(false)

  // ── Login form ──────────────────────────────────────────────────────
  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onLoginSubmit = async (data: LoginFormData) => {
    setIsLoginLoading(true)
    setServerError(null)
    try {
      await login(data)
      onSuccess()
    } catch (err) {
      setServerError(getErrorMessage(err))
    } finally {
      setIsLoginLoading(false)
    }
  }

  // ── Forgot password form ────────────────────────────────────────────
  const {
    register: registerForgot,
    handleSubmit: handleForgotSubmit,
    formState: { errors: forgotErrors },
  } = useForm<ForgotFormData>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  })

  const onForgotSubmit = async (data: ForgotFormData) => {
    setIsForgotLoading(true)
    setServerError(null)
    try {
      await api.post('/auth/forgot-password', data)
      setForgotSuccess(true)
    } catch (err) {
      setServerError(getErrorMessage(err))
    } finally {
      setIsForgotLoading(false)
    }
  }

  // ── Shared error display ────────────────────────────────────────────
  const ErrorBanner = ({ msg }: { msg: string }) => (
    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-2">
      <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
      </svg>
      {msg}
    </div>
  )

  const FieldError = ({ msg }: { msg: string }) => (
    <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
      <svg className="w-3 h-3 shrink-0" viewBox="0 0 12 12" fill="currentColor">
        <path d="M6 1a5 5 0 100 10A5 5 0 006 1zm-.5 2.75a.5.5 0 011 0v3a.5.5 0 01-1 0v-3zm.5 5.5a.625.625 0 110-1.25.625.625 0 010 1.25z" />
      </svg>
      {msg}
    </p>
  )

  const inputCls = (hasError: boolean) =>
    `w-full px-4 py-2.5 rounded-lg bg-white/5 border text-white placeholder-slate-500 text-sm
     focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors
     ${hasError ? 'border-red-500/70 bg-red-500/5' : 'border-white/10 hover:border-white/20'}`

  // ── Forgot password success state ───────────────────────────────────
  if (showForgot && forgotSuccess) {
    return (
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 mx-auto">
          <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="text-white font-semibold text-lg">Check your email</p>
          <p className="text-slate-400 text-sm mt-1">
            If that email is registered, you'll receive a reset link shortly.
          </p>
        </div>
        <button
          onClick={() => { setShowForgot(false); setForgotSuccess(false) }}
          className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors"
        >
          ← Back to sign in
        </button>
      </div>
    )
  }

  // ── Forgot password form ─────────────────────────────────────────────
  if (showForgot) {
    return (
      <form onSubmit={handleForgotSubmit(onForgotSubmit)} noValidate className="space-y-4">
        <div className="mb-2">
          <p className="text-white font-semibold text-lg">Reset your password</p>
          <p className="text-slate-400 text-sm mt-1">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        {serverError && <ErrorBanner msg={serverError} />}

        <div>
          <label htmlFor="forgot-email" className="block text-sm font-medium text-slate-300 mb-1.5">
            Email address
          </label>
          <input
            id="forgot-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...registerForgot('email')}
            className={inputCls(!!forgotErrors.email)}
          />
          {forgotErrors.email && <FieldError msg={forgotErrors.email.message!} />}
        </div>

        <button
          type="submit"
          disabled={isForgotLoading}
          className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50
            disabled:cursor-not-allowed text-white font-semibold text-sm transition-all
            shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 active:scale-[0.98]"
        >
          {isForgotLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
              </svg>
              Sending…
            </span>
          ) : 'Send reset link'}
        </button>

        <button
          type="button"
          onClick={() => { setShowForgot(false); setServerError(null) }}
          className="w-full text-slate-400 hover:text-white text-sm font-medium transition-colors"
        >
          ← Back to sign in
        </button>
      </form>
    )
  }

  // ── Login form ───────────────────────────────────────────────────────
  return (
    <form
      id="login-form"
      onSubmit={handleLoginSubmit(onLoginSubmit)}
      noValidate
      className="space-y-4"
    >
      {serverError && <ErrorBanner msg={serverError} />}

      {/* Email */}
      <div>
        <label htmlFor="login-email" className="block text-sm font-medium text-slate-300 mb-1.5">
          Email address
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          {...registerLogin('email')}
          className={inputCls(!!loginErrors.email)}
        />
        {loginErrors.email && <FieldError msg={loginErrors.email.message!} />}
      </div>

      {/* Password */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="login-password" className="block text-sm font-medium text-slate-300">
            Password
          </label>
          <button
            type="button"
            id="forgot-password-link"
            onClick={() => { setShowForgot(true); setServerError(null) }}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
          >
            Forgot password?
          </button>
        </div>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          {...registerLogin('password')}
          className={inputCls(!!loginErrors.password)}
        />
        {loginErrors.password && <FieldError msg={loginErrors.password.message!} />}
      </div>

      {/* Submit */}
      <button
        id="login-submit-btn"
        type="submit"
        disabled={isLoginLoading}
        className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50
          disabled:cursor-not-allowed text-white font-semibold text-sm transition-all
          shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 active:scale-[0.98] mt-2"
      >
        {isLoginLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
            </svg>
            Signing in…
          </span>
        ) : 'Sign in'}
      </button>
    </form>
  )
}
