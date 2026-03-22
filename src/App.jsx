// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { useAuth } from './context/AuthContext'
import { usePushAlerts } from './hooks/usePushAlerts'
import Spinner from './components/ui/Spinner'

const Login = lazy(() => import('./pages/Login'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const NewReport = lazy(() => import('./pages/NewReport'))
const DeficitTracker = lazy(() => import('./pages/DeficitTracker'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Admin = lazy(() => import('./pages/Admin'))
const RoutePlanner = lazy(() => import('./pages/RoutePlanner'))
const QnAPage = lazy(() => import('./pages/QnAPage'))
const ExcelExport = lazy(() => import('./pages/ExcelExport'))
const GpsAnomalies = lazy(() => import('./pages/GpsAnomalies'))
const TasksPage = lazy(() => import('./pages/Tasks'))

// ─── Realtime alerts — רק לפיקוד/אוגדה ───
function RealtimeAlerts() {
  const { user } = useAuth()
  usePushAlerts({ enabled: !!user, role: user?.role })
  return null
}

function ProtectedRoute({ children, minRole, managerOnly = false }) {
  const { user, loading, canAccess, hasManagerAccess } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen"><Spinner size="lg" /></div>
  if (!user) return <Navigate to="/login" replace />
  if (minRole && !canAccess(minRole)) return <Navigate to="/" replace />
  if (managerOnly && !hasManagerAccess) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen"><Spinner size="lg" /></div>

  return (
    <BrowserRouter>
      {/* Realtime alerts פועל בכל הדפים לאחר login */}
      {user && <RealtimeAlerts />}

      <Suspense fallback={<div className="flex items-center justify-center h-screen"><Spinner size="lg" /></div>}>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/report/new" element={<ProtectedRoute><NewReport /></ProtectedRoute>} />
          <Route path="/tasks" element={<ProtectedRoute minRole="gdud" managerOnly><TasksPage /></ProtectedRoute>} />
          <Route path="/deficits" element={<ProtectedRoute minRole="gdud" managerOnly><DeficitTracker /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute minRole="gdud" managerOnly><Analytics /></ProtectedRoute>} />
          <Route path="/halacha" element={<ProtectedRoute minRole="gdud" managerOnly><QnAPage /></ProtectedRoute>} />
          <Route path="/route-planner" element={<ProtectedRoute minRole="gdud" managerOnly><RoutePlanner /></ProtectedRoute>} />
          <Route path="/gps-anomalies" element={<ProtectedRoute minRole="gdud" managerOnly><GpsAnomalies /></ProtectedRoute>} />
          <Route path="/excel" element={<ProtectedRoute minRole="gdud" managerOnly><ExcelExport /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute minRole="pikud"><Admin /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
