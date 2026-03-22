// src/components/layout/Navbar.jsx
import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import ConfirmModal from '../ui/ConfirmModal'

const NAV_ITEMS = [
  { path: '/',              label: 'בקרה',  icon: '🏠', minRole: null },
  { path: '/report/new',   label: 'דוח חדש', icon: '📝', minRole: null },
  { path: '/tasks',        label: 'משימות', icon: '🎯', minRole: null },
  { path: '/deficits',     label: 'ליקויים', icon: '⚠️', minRole: 'gdud' },
  { path: '/halacha',      label: 'הלכה',   icon: '📖', minRole: 'gdud' },
  { path: '/analytics',    label: 'ניתוח',  icon: '📊', minRole: 'gdud' },
  { path: '/route-planner',label: 'מסלול',  icon: '🛤️', minRole: 'gdud' },
  { path: '/gps-anomalies',label: 'חריגות GPS', icon: '🛰️', minRole: 'gdud' },
  { path: '/excel',        label: 'Excel',  icon: '📄', minRole: 'gdud' },
  { path: '/admin',        label: 'ניהול',  icon: '⚙️', minRole: 'pikud' },
]

// טאבים לפיקוד/אוגדה — מוצגים ב-Navbar במקום הלינקים הרגילים
const PIKUD_NAV_TABS = [
  { id: 'overview',   icon: '📊', label: 'מבט-על'  },
  { id: 'control',    icon: '🎯', label: 'בקרה'    },
  { id: 'map',        icon: '🗺️', label: 'מפה'     },
  { id: 'inspectors', icon: '🔍', label: 'מבקרים'  },
  { id: 'kashrut',    icon: '🥩', label: 'כשרות'   },
  { id: 'perf',       icon: '🏆', label: 'ביצועים' },
  { id: 'ai',         icon: '🤖', label: 'AI'      },
  { id: 'manage',     icon: '⚙️', label: 'ניהול'   },
]

// ─── Dark mode hook (singleton via localStorage + class on <html>) ───
function useDarkMode() {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false
    const saved = localStorage.getItem('darkMode')
    if (saved !== null) return saved === 'true'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('darkMode', String(dark))
  }, [dark])

  return [dark, setDark]
}

export default function Navbar() {
  const { user, logout, canAccess, hasManagerAccess, lockManagerAccess } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [logoutModal, setLogoutModal] = useState(false)
  const [dark, setDark] = useDarkMode()

  async function handleLogout() {
    await logout()
    toast.success('יצאת מהמערכת בהצלחה')
    navigate('/login')
  }

  const fullVisibleItems = NAV_ITEMS.filter(item => {
    if (!item.minRole) return true
    if (user?.role === 'inspector' || user?.role === 'soldier') return false
    return canAccess(item.minRole)
  })

  const visibleItems = hasManagerAccess
    ? fullVisibleItems
    : NAV_ITEMS.filter((item) => item.path === '/' || item.path === '/report/new' || item.path === '/tasks')

  const isPikudRole = canAccess('ugda') && hasManagerAccess // פיקוד/אוגדה — מציגים טאבים

  const roleLabel = user?.role === 'inspector' ? 'מבקר שטח'
    : user?.role === 'soldier' ? 'חייל'
    : user?.role === 'gdud'    ? 'רב גדודי'
    : user?.role === 'ugda'    ? 'רב אוגדתי'
    : user?.role === 'pikud'   ? 'רב פיקוד'
    : user?.role ?? ''

  return (
    <>
      <nav className="bg-idf-blue dark:bg-dark-surface shadow-lg sticky top-0 z-50 border-b border-idf-blueDark dark:border-dark-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 text-white font-bold shrink-0 hover:opacity-90 transition-opacity">
              <span className="text-xl">✡️</span>
              <span className="hidden sm:block text-sm font-bold tracking-wide">רבנות פקמ&quot;ז</span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-0.5 overflow-x-auto">
              {isPikudRole ? (
                // פיקוד/אוגדה — טאבים של CommandDashboard
                PIKUD_NAV_TABS.map(tab => {
                  const isActive = location.pathname === '/' &&
                    new URLSearchParams(location.search).get('tab') === tab.id
                  return (
                    <Link
                      key={tab.id}
                      to={`/?tab=${tab.id}`}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                        isActive
                          ? 'bg-white/25 text-white shadow-inner'
                          : 'text-blue-200 hover:bg-white/12 hover:text-white dark:text-blue-300'
                      }`}
                    >
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                    </Link>
                  )
                })
              ) : (
                // חטמ"ר/חייל — לינקים רגילים
                visibleItems.map(item => (
                  <Link key={item.path} to={item.path}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                      location.pathname === item.path
                        ? 'bg-white/25 text-white shadow-inner'
                        : 'text-blue-200 hover:bg-white/12 hover:text-white dark:text-blue-300'
                    }`}>
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))
              )}
            </div>

            {/* Right side: user info + dark toggle + logout */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex flex-col items-end leading-tight">
                <span className="text-white text-xs font-bold">{user?.unit}</span>
                <span className="text-blue-300 text-[11px]">{roleLabel}</span>
              </div>

              {/* Dark mode toggle */}
              <button
                onClick={() => setDark(d => !d)}
                title={dark ? 'מצב יום' : 'מצב לילה'}
                className="bg-white/10 hover:bg-white/20 text-white rounded-lg p-1.5 transition-all text-base leading-none"
              >
                {dark ? '☀️' : '🌙'}
              </button>

              {hasManagerAccess && (
                <Link
                  to="/reset-password"
                  className="bg-white/10 hover:bg-white/20 text-white rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all"
                >
                  סיסמה
                </Link>
              )}

              {hasManagerAccess && !canAccess('ugda') && (
                <button
                  onClick={async () => {
                    await lockManagerAccess()
                    toast.success('מצב מנהל ננעל')
                    navigate('/')
                  }}
                  className="bg-white/10 hover:bg-white/20 text-white rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all"
                >
                  נעל ניהול
                </button>
              )}

              <button onClick={() => setLogoutModal(true)}
                className="bg-white/10 hover:bg-white/20 text-white rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all">
                יציאה
              </button>

              <button onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden bg-white/10 text-white rounded-lg p-2 relative z-50">
                {menuOpen ? '✕' : '☰'}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-idf-blueDark dark:bg-dark-bg border-t border-blue-700 dark:border-dark-border px-4 py-3 space-y-1 animate-fade-in absolute w-full left-0 shadow-xl z-50">
            {isPikudRole ? (
              PIKUD_NAV_TABS.map(tab => (
                <Link key={tab.id} to={`/?tab=${tab.id}`} onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-blue-200 hover:bg-white/10 hover:text-white">
                  <span className="text-lg">{tab.icon}</span>
                  <span>{tab.label}</span>
                </Link>
              ))
            ) : (
              visibleItems.map(item => (
                <Link key={item.path} to={item.path} onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    location.pathname === item.path
                      ? 'bg-white/20 text-white'
                      : 'text-blue-200 hover:bg-white/10 hover:text-white'
                  }`}>
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))
            )}

            {hasManagerAccess && (
              <Link
                to="/reset-password"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-blue-200 hover:bg-white/10 hover:text-white"
              >
                <span className="text-lg">🔐</span>
                <span>שינוי סיסמה</span>
              </Link>
            )}

            {hasManagerAccess && !canAccess('ugda') && (
              <button
                type="button"
                onClick={async () => {
                  setMenuOpen(false)
                  await lockManagerAccess()
                  toast.success('מצב מנהל ננעל')
                  navigate('/')
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-blue-200 hover:bg-white/10 hover:text-white w-full"
              >
                <span className="text-lg">🔒</span>
                <span>נעל ניהול</span>
              </button>
            )}
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
