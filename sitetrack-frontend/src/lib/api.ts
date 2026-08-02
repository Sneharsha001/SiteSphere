import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api'

/**
 * Pre-configured Axios instance wired to the SiteTrack backend.
 * Token is attached automatically via request interceptor.
 * 401 responses auto-redirect to /login.
 */
export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── In-memory token (the authoritative reference) ─────────────────────────
// We keep the token in memory so it isn't accessible to XSS scripts that
// only read localStorage. localStorage is used only for persistence across
// page refreshes.

let inMemoryToken: string | null = null

export function setToken(token: string | null): void {
  inMemoryToken = token
  if (token) {
    localStorage.setItem('sitetrack_token', token)
  } else {
    localStorage.removeItem('sitetrack_token')
  }
}

export function getToken(): string | null {
  if (inMemoryToken) return inMemoryToken
  // Restore from localStorage on page reload
  const stored = localStorage.getItem('sitetrack_token')
  if (stored) {
    inMemoryToken = stored
  }
  return inMemoryToken
}

// ── Request interceptor: attach JWT ───────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response interceptor: handle 401 ─────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      setToken(null)
      // Navigate to login — AuthContext will handle the React redirect
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
