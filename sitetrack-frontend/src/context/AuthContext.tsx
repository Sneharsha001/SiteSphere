import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { api, setToken } from '../lib/api'
import type { AuthUser, LoginCredentials, LoginResponse } from '../types'

// ── Context shape ──────────────────────────────────────────────────────────

interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
  refreshSession: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// ── Provider ───────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setTokenState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  /**
   * Attempt to restore a session by calling /auth/refresh.
   * The HttpOnly cookie is sent automatically by the browser.
   * Returns true if a valid session was restored.
   */
  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const res = await api.post<LoginResponse>('/auth/refresh')
      const { token: jwt, user: refreshedUser } = res.data
      setToken(jwt)
      setTokenState(jwt)
      setUser(refreshedUser)
      return true
    } catch {
      setToken(null)
      setTokenState(null)
      setUser(null)
      return false
    }
  }, [])

  // Restore session on app mount via HttpOnly cookie → /auth/refresh
  useEffect(() => {
    refreshSession().finally(() => setIsLoading(false))
  }, [refreshSession])

  /**
   * Login: call POST /auth/login, store access token in memory.
   * Refresh token is set as HttpOnly cookie by the server.
   */
  const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    const response = await api.post<LoginResponse>('/auth/login', credentials)
    const { token: jwt, user: loggedInUser } = response.data

    setToken(jwt)
    setTokenState(jwt)
    setUser(loggedInUser)
  }, [])

  /**
   * Logout: tell the server to revoke the refresh token cookie, then
   * clear all in-memory auth state.
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Continue even if the server call fails
    } finally {
      setToken(null)
      setTokenState(null)
      setUser(null)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, refreshSession }}>
      {children}
    </AuthContext.Provider>
  )
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth() must be used inside <AuthProvider>')
  }
  return ctx
}
