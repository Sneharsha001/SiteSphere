// ── Auth ──────────────────────────────────────────────────────────────────

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: User
}

// ── User ──────────────────────────────────────────────────────────────────

export interface User {
  id: number
  email: string
  full_name: string
  role: 'admin' | 'manager' | 'engineer' | 'viewer'
  created_at: string
}

// ── Project ───────────────────────────────────────────────────────────────

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed'

export interface Project {
  id: number
  name: string
  description: string
  status: ProjectStatus
  progress: number
  start_date: string
  end_date: string | null
  manager: User
  created_at: string
  updated_at: string
}

export interface CreateProjectPayload {
  name: string
  description: string
  start_date: string
  end_date?: string
}

// ── API Response wrappers ─────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  size: number
  pages: number
}

export interface ApiError {
  detail: string | { msg: string; type: string }[]
}
