// ── Auth ──────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'pm' | 'site_engineer'

export interface AuthUser {
  _id: string
  name: string
  email: string
  role: UserRole
  status: 'active' | 'inactive'
  orgId: string
}

export interface LoginCredentials {
  email: string
  password: string
}

/** Shape returned by POST /api/auth/login */
export interface LoginResponse {
  success: boolean
  token: string
  user: AuthUser
}

// ── Project ───────────────────────────────────────────────────────────────

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed'

export interface Project {
  _id: string
  name: string
  description: string
  status: ProjectStatus
  progress: number
  startDate: string
  endDate?: string
  orgId: string
  createdAt: string
  updatedAt: string
}

// ── API Response wrappers ─────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true
  data: T
}

export interface ApiError {
  success: false
  message: string
  status: number
}
