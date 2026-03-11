import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import NewReport from './pages/NewReport'
import DeficitTracker from './pages/DeficitTracker'
import Analytics from './pages/Analytics'
import Admin from './pages/Admin'
import Spinner from './components/ui/Spinner'

function ProtectedRoute({ children, minRole }) {
  const { user, loading, canAccess } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen"><Spinner size="lg" /></div>
  if (!user) return <Navigate to="/login" replace />
  if (minRole && !canAccess(minRole)) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) return <div className="flex items-center justify-center h-screen"><Spinner size="lg" /></div>

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/report/new" element={
          <ProtectedRoute>
            <NewReport />
          </ProtectedRoute>
        } />
        <Route path="/deficits" element={
          <ProtectedRoute>
            <DeficitTracker />
          </ProtectedRoute>
        } />
        <Route path="/analytics" element={
          <ProtectedRoute minRole="gdud">
            <Analytics />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute minRole="pikud">
            <Admin />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
