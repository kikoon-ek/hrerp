import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useAuthStore } from './stores/authStore'
import { useEffect } from 'react'

// 컴포넌트 import
import Login from './components/auth/Login'
import AdminLayout from './components/layout/AdminLayout'
import UserLayout from './components/layout/UserLayout'
import LoadingSpinner from './components/ui/LoadingSpinner'

// 관리자 페이지 컴포넌트 import
import AdminDashboard from './pages/admin/Dashboard'
import EmployeeManagement from './pages/admin/EmployeeManagement'
import DepartmentManagement from './pages/admin/DepartmentManagement'
import AuditLogs from './pages/admin/AuditLogs'

// Phase 2 컴포넌트
import EvaluationCriteria from './pages/admin/EvaluationCriteria'
import BonusPolicy from './pages/admin/BonusPolicy'

// Phase 3 컴포넌트
import AttendanceManagement from './pages/admin/AttendanceManagement'
import AnnualLeaveManagement from './pages/admin/AnnualLeaveManagement'
import LeaveRequestManagement from './pages/admin/LeaveRequestManagement'
import AttendanceUser from './pages/user/AttendanceUser'
import AnnualLeaveUser from './pages/user/AnnualLeaveUser'

// Phase 4 컴포넌import PayrollManagement from './pages/admin/PayrollManagement';
import PayrollUser from './pages/user/PayrollUser';

// Phase 7 컴포넌트
import DashboardReports from './pages/admin/DashboardReports';

// 사용자 페이지 컴포넌트 import
import UserDashboard from './pages/user/Dashboard'
import MyProfile from './pages/user/MyProfile'

import './App.css'

// React Query 클라이언트 설정
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5분
    },
  },
})

// 보호된 라우트 컴포넌트
function ProtectedRoute({ children, requiredRole = null }) {
  const { user, isAuthenticated, isLoading } = useAuthStore()

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}

// 공개 라우트 컴포넌트 (로그인된 사용자는 대시보드로 리다이렉트)
function PublicRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore()

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

function App() {
  const { initializeAuth, user } = useAuthStore()

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* 공개 라우트 */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />

            {/* 관리자 라우트 */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminLayout>
                    <Routes>
                      <Route path="dashboard" element={<AdminDashboard />} />
                      <Route path="employees" element={<EmployeeManagement />} />
                      <Route path="departments" element={<DepartmentManagement />} />
                      <Route path="evaluation-criteria" element={<EvaluationCriteria />} />
                      <Route path="bonus-policy" element={<BonusPolicy />} />
                      <Route path="attendance" element={<AttendanceManagement />} />
                      <Route path="annual-leave" element={<AnnualLeaveManagement />} />
                      <Route path="leave-requests" element={<LeaveRequestManagement />} />
                      <Route path="payroll" element={<PayrollManagement />} />
                      <Route path="dashboard-reports" element={<DashboardReports />} />
                      <Route path="audit-logs" element={<AuditLogs />} />
                      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
                    </Routes>
                  </AdminLayout>
                </ProtectedRoute>
              }
            />

            {/* 일반 사용자 라우트 */}
            <Route
              path="/user/*"
              element={
                <ProtectedRoute requiredRole="user">
                  <UserLayout>
                    <Routes>
                      <Route path="dashboard" element={<UserDashboard />} />
                      <Route path="profile" element={<MyProfile />} />
                      <Route path="attendance" element={<AttendanceUser />} />
                      <Route path="annual-leave" element={<AnnualLeaveUser />} />
                      <Route path="payroll" element={<PayrollUser />} />
                      <Route path="*" element={<Navigate to="/user/dashboard" replace />} />
                    </Routes>
                  </UserLayout>
                </ProtectedRoute>
              }
            />

            {/* 대시보드 리다이렉트 (역할에 따라) */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  {user?.role === 'admin' ? (
                    <Navigate to="/admin/dashboard" replace />
                  ) : (
                    <Navigate to="/user/dashboard" replace />
                  )}
                </ProtectedRoute>
              }
            />

            {/* 권한 없음 페이지 */}
            <Route
              path="/unauthorized"
              element={
                <div className="min-h-screen flex items-center justify-center">
                  <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">접근 권한이 없습니다</h1>
                    <p className="text-gray-600 mb-4">이 페이지에 접근할 권한이 없습니다.</p>
                    <button
                      onClick={() => window.history.back()}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      이전 페이지로 돌아가기
                    </button>
                  </div>
                </div>
              }
            />

            {/* 기본 라우트 */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </Router>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

export default App

