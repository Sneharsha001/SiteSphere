import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import Header from '../components/Header'
import type { AppUser, UserRole } from '../types'

// ── Helpers ───────────────────────────────────────────────────────────────

const roleConfig: Record<UserRole, { label: string; className: string }> = {
  admin: {
    label: 'Admin',
    className: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  },
  pm: {
    label: 'Project Manager',
    className: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  },
  site_engineer: {
    label: 'Site Engineer',
    className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
}

// ── New User Modal ────────────────────────────────────────────────────────

interface NewUserModalProps {
  onClose: () => void
  onCreated: (user: AppUser) => void
}

function NewUserModal({ onClose, onCreated }: NewUserModalProps) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: '' as UserRole | '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.password || !form.role) {
      setError('All fields are required.')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    try {
      setSubmitting(true)
      setError(null)
      const res = await api.post('/users', {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role,
      })
      if (res.data?.data) {
        onCreated(res.data.data)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to create user.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Create New User</h2>
            <p className="text-xs text-slate-400 mt-0.5">New user will be added to your organisation</p>
          </div>
          <button
            id="close-new-user-modal"
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form id="new-user-form" onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Full Name <span className="text-red-400">*</span>
            </label>
            <input
              id="new-user-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Arjun Sharma"
              className="w-full bg-slate-800 border border-white/15 rounded-lg px-3.5 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              id="new-user-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="arjun@example.com"
              className="w-full bg-slate-800 border border-white/15 rounded-lg px-3.5 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Password <span className="text-red-400">*</span>
            </label>
            <input
              id="new-user-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Min 8 characters"
              className="w-full bg-slate-800 border border-white/15 rounded-lg px-3.5 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Role <span className="text-red-400">*</span>
            </label>
            <select
              id="new-user-role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
              className="w-full bg-slate-800 border border-white/15 rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            >
              <option value="">Select role…</option>
              <option value="admin">Admin</option>
              <option value="pm">Project Manager</option>
              <option value="site_engineer">Site Engineer</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-sm font-medium text-white rounded-xl border border-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              id="submit-new-user-btn"
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-sm font-semibold text-white rounded-xl shadow-lg shadow-indigo-500/20 transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                  </svg>
                  Creating…
                </>
              ) : (
                'Create User'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── UsersPage ─────────────────────────────────────────────────────────────

export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get('/users')
      if (res.data?.data) {
        setUsers(res.data.data)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load users.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleToggleStatus = async (userId: string) => {
    try {
      setTogglingId(userId)
      const res = await api.patch(`/users/${userId}/status`)
      if (res.data?.data) {
        setUsers((prev) =>
          prev.map((u) => (u._id === userId ? { ...u, status: res.data.data.status } : u))
        )
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to toggle user status.')
    } finally {
      setTogglingId(null)
    }
  }

  const handleUserCreated = (user: AppUser) => {
    setUsers((prev) => [user, ...prev])
    setShowModal(false)
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Users</h1>
            <p className="text-slate-400 mt-1 text-sm">
              {loading ? 'Loading…' : `${users.length} user${users.length !== 1 ? 's' : ''} in your organisation`}
            </p>
          </div>
          <button
            id="new-user-btn"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-indigo-500/20 self-start sm:self-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New User
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <svg className="animate-spin w-8 h-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
            </svg>
            <span className="text-slate-400 text-sm">Loading users…</span>
          </div>
        ) : users.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-14 text-center">
            <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
              <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">No users yet</h2>
            <p className="text-slate-400 text-sm max-w-sm mx-auto mb-6">
              Add team members to your organisation.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Create First User
            </button>
          </div>
        ) : (
          /* Users table */
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 px-6 py-3 border-b border-white/10 bg-white/[0.03]">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Name / Email</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Role</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Actions</span>
            </div>

            {/* User rows */}
            {users.map((u) => {
              const role = roleConfig[u.role] ?? roleConfig.site_engineer
              const isSelf = u._id === currentUser?.id
              const isToggling = togglingId === u._id

              return (
                <div
                  key={u._id}
                  className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 items-center px-6 py-4 border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition-colors"
                >
                  {/* Name / Email */}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate flex items-center gap-2">
                      {u.name}
                      {isSelf && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                          You
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{u.email}</p>
                  </div>

                  {/* Role */}
                  <div>
                    <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full border ${role.className}`}>
                      {role.label}
                    </span>
                  </div>

                  {/* Status badge */}
                  <div>
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                        u.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-emerald-400' : 'bg-slate-500'}`}
                      />
                      {u.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Toggle button */}
                  <div>
                    <button
                      id={`toggle-status-${u._id}`}
                      onClick={() => handleToggleStatus(u._id)}
                      disabled={isSelf || isToggling}
                      title={
                        isSelf
                          ? 'You cannot deactivate your own account'
                          : u.status === 'active'
                          ? 'Deactivate user'
                          : 'Reactivate user'
                      }
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 focus:ring-offset-slate-900 ${
                        isSelf || isToggling ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                      } ${u.status === 'active' ? 'bg-emerald-500' : 'bg-slate-600'}`}
                      role="switch"
                      aria-checked={u.status === 'active'}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
                          u.status === 'active' ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {showModal && (
        <NewUserModal onClose={() => setShowModal(false)} onCreated={handleUserCreated} />
      )}
    </div>
  )
}
