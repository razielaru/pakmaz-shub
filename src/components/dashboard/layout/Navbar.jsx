import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import ConfirmModal from '../ui/ConfirmModal'

const NAV_ITEMS = [
  { path: '/', label: 'לוח בקרה', icon: '🏠', minRole: null },
  { path: '/report/new', label: 'דוח חדש', icon: '📝', minRole: null },
  { path: '/deficits', label: 'ליקויים', icon: '⚠️', minRole: null },
  { path: '/analytics', label: 'ניתוח', icon: '📊', minRole: 'gdud' },
  { path: '/admin', label: 'ניהול', icon: '⚙️', minRole: 'pikud' },
]

export default function Navbar() {
  const { user, logout, canAccess } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [logoutModal, setLogoutModal] = useState(false)

  function handleLogout() {
    logout()
    toast.success('יצאת מהמערכת בהצלחה')
    navigate('/login')
  }

  const visibleItems = NAV_ITEMS.filter(item => !item.minRole || canAccess(item.minRole))

  return (
    <>
      <nav className="bg-idf-blue shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 text-white font-bold text-base shrink-0">
              <span className="text-2xl">✡️</span>
              <span className="hidden sm:block">רבנות פיקוד מרכז</span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">
              {visibleItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    location.pathname === item.path
                      ? 'bg-white/20 text-white'
                      : 'text-blue-200 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>

            {/* User + logout */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-white text-xs font-semibold">{user?.unit}</span>
                <span className="text-blue-300 text-xs">{user?.role}</span>
              </div>
              <button
                onClick={() => setLogoutModal(true)}
                className="bg-white/10 hover:bg-white/20 text-white rounded-lg px-3 py-1.5 text-sm font-semibold transition-all"
              >
                יציאה
              </button>
              {/* Mobile menu button */}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden bg-white/10 text-white rounded-lg p-2"
              >
                {menuOpen ? '✕' : '☰'}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-idf-blueDark border-t border-blue-700 px-4 py-3 space-y-1 animate-fade-in">
            {visibleItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  location.pathname === item.path
                    ? 'bg-white/20 text-white'
                    : 'text-blue-200 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
            <div className="pt-2 border-t border-blue-700 text-center">
              <p className="text-blue-300 text-xs">{user?.unit} • {user?.role}</p>
            </div>
          </div>
        )}
      </nav>

      <ConfirmModal
        isOpen={logoutModal}
        title="יציאה מהמערכת"
        message="האם אתה בטוח שברצונך לצאת?"
        confirmLabel="יציאה"
        onConfirm={handleLogout}
        onCancel={() => setLogoutModal(false)}
      />
    </>
  )
}
