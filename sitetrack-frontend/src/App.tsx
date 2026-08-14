import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import ResendVerificationPage from './pages/ResendVerificationPage'
import DashboardPage from './pages/DashboardPage'
import ProjectsPage from './pages/ProjectsPage'
import UsersPage from './pages/UsersPage'
import SubmitReportPage from './pages/SubmitReportPage'
import MyReportsPage from './pages/MyReportsPage'
import ReportDetailPage from './pages/ReportDetailPage'
import EditReportPage from './pages/EditReportPage'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Public routes — authentication */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/resend-verification" element={<ResendVerificationPage />} />

        {/* Protected routes — require authentication */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute
              roles={['pm', 'admin']}
              redirectTo="/reports"
              redirectMessage="The dashboard is for Project Managers and Admins only. You've been redirected to your reports."
            >
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
           path="/projects"
           element={
             <ProtectedRoute
               roles={['admin']}
               redirectTo="/dashboard"
               redirectMessage="Project management is restricted to Administrators."
             >
               <ProjectsPage />
             </ProtectedRoute>
           }
         />
         <Route
           path="/users"
           element={
             <ProtectedRoute
               roles={['admin']}
               redirectTo="/dashboard"
               redirectMessage="User management is restricted to Administrators."
             >
               <UsersPage />
             </ProtectedRoute>
           }
         />
         <Route
           path="/reports"
           element={
             <ProtectedRoute
               roles={['site_engineer']}
               redirectTo="/dashboard"
               redirectMessage="Personal report list is restricted to Site Engineers."
             >
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
        <Route
          path="/reports/:id/edit"
          element={
            <ProtectedRoute
              roles={['site_engineer']}
              redirectTo="/dashboard"
              redirectMessage="This page is for Site Engineers only."
            >
              <EditReportPage />
            </ProtectedRoute>
          }
        />
        {/* Report detail view — PM/Admin read-only */}
        <Route
          path="/reports/:id"
          element={
            <ProtectedRoute
              roles={['pm', 'admin']}
              redirectTo="/reports"
              redirectMessage="The report detail view is only available to Project Managers and Admins."
            >
              <ReportDetailPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  )
}

