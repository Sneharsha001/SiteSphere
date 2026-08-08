import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { UserRole } from '../types'
import type { ReactNode } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
  /** If provided, only users with one of these roles can access this route */
  roles?: UserRole[]
  /**
   * If set, unauthorized users are redirected here instead of seeing a 403 page.
   * Pass `redirectMessage` to surface a friendly explanation at the destination.
   */
  redirectTo?: string
  /** Message forwarded via router state to the redirect destination */
  redirectMessage?: string
}

/**
 * Wraps a route to:
 * 1. Redirect unauthenticated users to /login (preserving the intended URL)
 * 2. Optionally block users whose role isn't in the `roles` allowlist (→ 403 page)
 *
 * Shows nothing while session is being restored from localStorage (avoids flash).
 */
export default function ProtectedRoute({ children, roles, redirectTo, redirectMessage }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  // While restoring session, render nothing to avoid flash of /login redirect
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg
            className="animate-spin w-8 h-8 text-indigo-400"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"
            />
          </svg>
          <p className="text-slate-400 text-sm">Restoring session…</p>
        </div>
      </div>
    )
  }

  // Not authenticated → redirect to login, preserving the intended destination
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Role check — redirect or 403 if role not permitted
  if (roles && !roles.includes(user.role)) {
    // If a specific redirect target is configured, use it and pass along a message
    if (redirectTo) {
      return (
        <Navigate
          to={redirectTo}
          state={{ accessDeniedMessage: redirectMessage ?? 'You do not have permission to view that page.' }}
          replace
        />
      )
    }

    // Default: inline 403 page
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-6xl font-bold text-slate-600 mb-4">403</p>
          <p className="text-white text-xl font-semibold">Access Denied</p>
          <p className="text-slate-400 mt-2 text-sm">
            Your role (<span className="text-indigo-400">{user.role}</span>) does not have
            permission to view this page.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
