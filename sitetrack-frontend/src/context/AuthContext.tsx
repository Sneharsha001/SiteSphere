import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { api, setToken, getToken } from '../lib/api'
import type { AuthUser, LoginCredentials, LoginResponse } from '../types'

// ── Context shape ─────────────────────────────────────────────────────────

interface AuthContextValue {
  /** Currently logged-in user, or null if not authenticated */
  user: AuthUser | null
  /** Raw JWT string, or null */
  token: string | null
  /** True while restoring session or during login */
  isLoading: boolean
  /** Attempt login — throws on failure so the form can show the error */
  login: (credentials: LoginCredentials) => Promise<void>
  /** Clear session and token */
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setTokenState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true) // true on mount while we restore

  // ── Restore session from localStorage on first mount ─────────────────
  useEffect(() => {
    const storedToken = getToken()
    const storedUser = localStorage.getItem('sitetrack_user')

    if (storedToken && storedUser) {
      try {
        const parsed: AuthUser = JSON.parse(storedUser)
        setTokenState(storedToken)
        setUser(parsed)
        setToken(storedToken) // sync into in-memory slot
      } catch {
        // Malformed storage — clear everything
        setToken(null)
        localStorage.removeItem('sitetrack_user')
      }
    }
    setIsLoading(false)
  }, [])

  // ── Login ─────────────────────────────────────────────────────────────
  const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    const response = await api.post<LoginResponse>('/auth/login', credentials)
    const { token: jwt, user: loggedInUser } = response.data

    // Persist
    setToken(jwt)
    localStorage.setItem('sitetrack_user', JSON.stringify(loggedInUser))

    // Update state
    setTokenState(jwt)
    setUser(loggedInUser)
  }, [])

  // ── Logout ────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    setToken(null)
    localStorage.removeItem('sitetrack_user')
    setTokenState(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// ── useAuth hook ──────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth() must be used inside <AuthProvider>')
  }
  return ctx
}
