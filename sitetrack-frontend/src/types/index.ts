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

// ── Daily Progress Report (Dashboard) ─────────────────────────────────────

export interface ReportPhoto {
  _id: string
  fileUrl: string
  timestamp: string
}

export interface DashboardDpr {
  _id: string
  date: string
  createdAt: string
  workDone: string
  quantity?: string
  labourSkilled: number
  labourUnskilled: number
  labourOperators: number
  tomorrowPlan?: string
  issues?: string
  remarks?: string
  syncStatus: 'synced' | 'pending'
  projectId: {
    _id: string
    name: string
    buildingType?: string
    location?: string
  }
  engineerId: {
    _id: string
    name: string
    email: string
  }
  photos: ReportPhoto[]
}

export interface DashboardKpis {
  reportsThisWeek: number
  reportsThisMonth: number
  openIssues: number
  activeProjects: number
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
