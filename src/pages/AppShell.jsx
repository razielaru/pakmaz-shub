import { useStore } from '../store/useStore'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Dashboard from './Dashboard'
import PersonnelPage from './PersonnelPage'
import TrainingPage from './TrainingPage'
import EquipmentPage from './EquipmentPage'
import CleaningPage from './CleaningPage'
import TasksPage from './TasksPage'
import IncidentsPage from './IncidentsPage'
import QnAPage from './QnAPage'
import TimelinePage from './TimelinePage'
import CommandPage from './CommandPage'
import UnitManagePage from './UnitManagePage'
import ChatPage from './ChatPage'
import SederPage from './SederPage'
import ImportPage from './ImportPage'
import VideosPage from './VideosPage'

const BOTTOM_NAV = [
  { id: 'dashboard', label: 'ראשי',    icon: '🏠' },
  { id: 'equipment', label: 'ציוד',    icon: '📦' },
  { id: 'chat',      label: "צ'אט",    icon: '💬' },
  { id: 'qna',       label: 'שו"ת',    icon: '⚖️' },
  { id: 'personnel', label: 'כוח אדם', icon: '👥' },
]

const FULL_NAV = [
  { id: 'dashboard',  label: '🏠 ראשי',            admin: false },
  { id: 'personnel',  label: '👥 כוח אדם',          admin: false },
  { id: 'training',   label: '🎓 הכשרות',           admin: false },
  { id: 'equipment',  label: '📦 ציוד',              admin: false },
  { id: 'cleaning',   label: '🧹 ניקיונות',         admin: false },
  { id: 'tasks',      label: '✅ משימות',            admin: false },
  { id: 'incidents',  label: '🆘 חריגים',            admin: false },
  { id: 'qna',        label: '⚖️ שו"ת הלכתי',       admin: false },
  { id: 'timeline',   label: '📅 לוח שנה',           admin: false },
  { id: 'chat',       label: "💬 צ'אט יחידות",      admin: false },
  { id: 'command',    label: '⭐ פיקוד על',            admin: true  },
  { id: 'unitmanage', label: '⚙ ניהול',               admin: true  },
]

export default function AppShell() {
  const { currentUnit, isAdmin, isSenior, activePage, setPage, logout } = useStore()
  const [clock, setClock] = useState('')
  const [days, setDays] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [alerts, setAlerts] = useState([])
  const [alertDismissed, setAlertDismissed] = useState(new Set())
  const [newAlertText, setNewAlertText] = useState('')
  const [showAlertInput, setShowAlertInput] = useState(false)

  useEffect(() => {
    const tick = () => {
      setClock(new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      setDays(Math.max(0, Math.ceil((new Date('2026-04-02') - new Date()) / 86400000)))
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    loadAlerts()
    const sub = supabase.channel('alerts_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'broadcast_alerts' }, loadAlerts)
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [])

  async function loadAlerts() {
    const { data } = await supabase
      .from('broadcast_alerts').select('*')
      .eq('is_active', true).order('created_at', { ascending: false }).limit(5)
    setAlerts(data || [])
  }

  async function sendAlert() {
    if (!newAlertText.trim()) return
    await supabase.from('broadcast_alerts').insert({
      message: newAlertText.trim(), sent_by: currentUnit?.name, is_active: true
    })
    setNewAlertText(''); setShowAlertInput(false)
  }

  async function deleteAlert(id) {
    await supabase.from('broadcast_alerts').update({ is_active: false }).eq('id', id)
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  const canSeeAdmin = isAdmin || isSenior
  const visibleNav = FULL_NAV.filter(n => !n.admin || canSeeAdmin)
  const visibleAlerts = alerts.filter(a => !alertDismissed.has(a.id))

  const pages = {
    dashboard: <Dashboard />, personnel: <PersonnelPage />, training: <TrainingPage />,
    equipment: <EquipmentPage />, cleaning: <CleaningPage />, tasks: <TasksPage />,
    incidents: <IncidentsPage />, qna: <QnAPage />, timeline: <TimelinePage />,
    command: <CommandPage />, unitmanage: <UnitManagePage />,
    chat: <ChatPage />, seder: <SederPage />,
    import: <ImportPage />, videos: <VideosPage />,
  }

  function navTo(id) { setPage(id); setMenuOpen(false) }

  return (
    <div className="min-h-screen flex flex-col bg-bg0">

      {/* Top bar */}
      <header className="h-14 bg-bg1 border-b border-border1 flex items-center px-4 gap-3 sticky top-0 z-50">
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-lg">✡</span>
          <span className="bg-yellow-900/30 border border-yellow-600/40 text-gold text-xs font-black px-3 py-1 rounded-full max-w-[130px] truncate">
            {currentUnit?.name}
          </span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden lg:flex gap-0.5 mx-auto overflow-x-auto scrollbar-hide">
          {visibleNav.map(n => (
            <button key={n.id} onClick={() => navTo(n.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all
                ${activePage === n.id ? 'bg-yellow-900/30 text-gold' : 'text-text2 hover:text-text1 hover:bg-bg3'}`}>
              {n.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 lg:hidden" />

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="hidden md:flex items-center gap-1.5 bg-bg3 border border-border2 text-gold2 text-xs font-bold px-3 py-1 rounded-full">
            ⏳ {days} ימים
          </span>
          <span className="text-text3 text-xs font-mono hidden md:block">{clock}</span>

          {/* Broadcast button (admin/senior) */}
          {canSeeAdmin && (
            <button onClick={() => setShowAlertInput(!showAlertInput)} title="שלח מבזק"
              className={`w-8 h-8 rounded-lg border text-sm flex items-center justify-center transition-all
                ${showAlertInput ? 'bg-yellow-900/40 border-gold text-gold' : 'bg-bg3 border-border1 text-text2 hover:border-border2'}`}>
              📢
            </button>
          )}

          {/* Hamburger */}
          <button onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden w-8 h-8 rounded-lg bg-bg3 border border-border1 flex flex-col items-center justify-center gap-1">
            <span className={`w-4 h-0.5 bg-text2 transition-all ${menuOpen ? 'rotate-45 translate-y-1.5' : ''}`}/>
            <span className={`w-4 h-0.5 bg-text2 transition-all ${menuOpen ? 'opacity-0' : ''}`}/>
            <span className={`w-4 h-0.5 bg-text2 transition-all ${menuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}/>
          </button>

          <button onClick={logout}
            className="hidden sm:block text-xs text-text3 hover:text-text1 border border-border1 hover:border-border2 px-3 py-1 rounded-lg transition-all">
            ← החלף
          </button>
        </div>
      </header>

      {/* Alert input */}
      {showAlertInput && canSeeAdmin && (
        <div className="bg-yellow-900/20 border-b border-gold/30 px-4 py-2 flex gap-2 items-center z-40">
          <span className="text-gold text-sm flex-shrink-0">📢 מבזק:</span>
          <input className="flex-1 bg-bg3 border border-border2 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-gold"
            value={newAlertText} onChange={e => setNewAlertText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendAlert()}
            placeholder='לדוגמה: "שעת השריפה עודכנה ל-10:00"' />
          <button onClick={sendAlert} className="btn btn-sm">שלח</button>
          <button onClick={() => setShowAlertInput(false)} className="text-text3 hover:text-text1">✕</button>
        </div>
      )}

      {/* Broadcast banners */}
      {visibleAlerts.map(alert => (
        <div key={alert.id} className="bg-red-900/25 border-b border-red-500/40 px-4 py-2.5 flex items-center gap-3 z-40">
          <span className="text-red-400 text-base flex-shrink-0">🚨</span>
          <div className="flex-1 min-w-0">
            <span className="text-red-200 text-sm font-bold">{alert.message}</span>
            {alert.sent_by && <span className="text-red-400/70 text-xs mr-2">— {alert.sent_by}</span>}
          </div>
          {canSeeAdmin && (
            <button onClick={() => deleteAlert(alert.id)}
              className="text-red-400/60 hover:text-red-400 text-xs border border-red-500/20 rounded px-1.5 py-0.5 flex-shrink-0">🗑</button>
          )}
          <button onClick={() => setAlertDismissed(prev => new Set([...prev, alert.id]))}
            className="text-red-400/60 hover:text-red-300 text-xs flex-shrink-0">✕</button>
        </div>
      ))}

      {/* Mobile slide-in menu */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/70 lg:hidden" onClick={() => setMenuOpen(false)} />
          <div className="fixed top-0 left-0 bottom-0 z-50 w-72 bg-bg1 border-l border-border1 flex flex-col lg:hidden shadow-2xl">
            <div className="h-14 flex items-center px-4 border-b border-border1 gap-3">
              <span className="text-gold font-black">📋 תפריט</span>
              <div className="flex-1" />
              <button onClick={() => setMenuOpen(false)} className="text-text3 hover:text-text1 text-lg">✕</button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {visibleNav.map(n => (
                <button key={n.id} onClick={() => navTo(n.id)}
                  className={`w-full text-right px-4 py-3 rounded-xl text-sm font-bold transition-all
                    ${activePage === n.id ? 'bg-yellow-900/30 text-gold border border-gold/20' : 'text-text2 hover:text-text1 hover:bg-bg3'}`}>
                  {n.label}
                </button>
              ))}
            </nav>
            <div className="p-4 border-t border-border1 space-y-2">
              <div className="text-center text-gold2 font-black text-2xl">{days}</div>
              <div className="text-center text-text3 text-xs">ימים לפסח ⏳</div>
              <div className="text-center text-text3 text-xs font-mono">{clock}</div>
              <button onClick={logout} className="w-full btn btn-ghost text-sm mt-2">← החלף יחידה</button>
            </div>
          </div>
        </>
      )}

      {/* Page content */}
      <main className="flex-1 p-4 md:p-6 max-w-[1400px] mx-auto w-full pb-24 lg:pb-6">
        {pages[activePage] || <Dashboard />}
      </main>

      {/* Bottom Navigation — mobile only */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-bg1 border-t border-border1 flex items-stretch shadow-[0_-4px_24px_rgba(0,0,0,0.4)]">
        {BOTTOM_NAV.map(n => (
          <button key={n.id} onClick={() => navTo(n.id)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-all relative
              ${activePage === n.id ? 'text-gold' : 'text-text3'}`}>
            <span className={`text-xl ${activePage === n.id ? 'scale-110' : ''} transition-transform`}>{n.icon}</span>
            <span className="text-[10px] font-bold">{n.label}</span>
            {activePage === n.id && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gold rounded-full" />}
          </button>
        ))}
        <button onClick={() => setMenuOpen(true)}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 ${menuOpen ? 'text-gold' : 'text-text3'}`}>
          <span className="text-xl">☰</span>
          <span className="text-[10px] font-bold">עוד</span>
        </button>
      </nav>
    </div>
  )
}
