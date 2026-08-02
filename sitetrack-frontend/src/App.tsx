import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ProjectsPage from './pages/ProjectsPage'

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
      </Routes>
    </AuthProvider>
  )
}
