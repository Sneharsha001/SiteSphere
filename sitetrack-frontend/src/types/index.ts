// ── Auth ──────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'pm' | 'site_engineer'

export interface AuthUser {
  /** Mongo _id string returned by sanitizeUser as 'id' */
  id: string
  name: string
  email: string
  role: UserRole
  status: 'active' | 'inactive' | 'pending'
  orgId: string
  isEmailVerified: boolean
}

export interface LoginCredentials {
  email: string
  password: string
}

/**
 * Shape returned by POST /api/auth/login,
 * POST /api/auth/refresh, and GET /api/auth/me.
 */
export interface LoginResponse {
  success: boolean
  token: string
  user: AuthUser
}

// ── Managed users (for UsersPage) ─────────────────────────────────────────

export interface AppUser {
  _id: string
  name: string
  email: string
  role: UserRole
  status: 'active' | 'inactive' | 'pending'
  orgId: string
  createdAt: string
  updatedAt: string
}

// ── Project ───────────────────────────────────────────────────────────────

export type BuildingType =
  | 'residential_house'
  | 'villa'
  | 'apartment_residential'
  | 'college_institutional'
  | 'commercial_office'
  | 'other_building'

export type ProjectStatus = 'active' | 'on_hold' | 'completed'

export interface Project {
  _id: string
  name: string
  location?: string
  buildingType: BuildingType
  status: ProjectStatus
  startDate?: string
  orgId: string
  createdBy?: string
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
