import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ProjectsPage from './pages/ProjectsPage'
import SubmitReportPage from './pages/SubmitReportPage'
import MyReportsPage from './pages/MyReportsPage'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Public route — login page */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes — require authentication */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <ProjectsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute roles={['site_engineer', 'admin', 'pm']}>
              <MyReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/new"
          element={
            <ProtectedRoute
              roles={['site_engineer']}
              redirectTo="/dashboard"
              redirectMessage="This page is for Site Engineers only. DPR submission is not available for your role."
            >
              <SubmitReportPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  )
}

