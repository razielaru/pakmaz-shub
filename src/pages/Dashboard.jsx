// src/pages/Dashboard.jsx
import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useReports } from '../hooks/useReports'
import { useDeficitStats } from '../hooks/useDeficits'
import { supabase } from '../supabaseClient'
import PageLayout from '../components/layout/PageLayout'
import TabsBar from '../components/ui/TabsBar'
import Spinner from '../components/ui/Spinner'
import MorningBriefing from '../components/dashboard/MorningBriefing'
import BaseStatusBoard from '../components/dashboard/BaseStatusBoard'
import MapView from '../components/dashboard/MapView'
import StatsCharts from '../components/dashboard/StatsCharts'
import LeaderboardTable from '../components/dashboard/LeaderboardTable'
import CommandDashboard from '../components/dashboard/CommandDashboard'
import SLADashboard from '../components/dashboard/SLADashboard'
import DeficitHeatMap from '../components/dashboard/DeficitHeatMap'
import TaskBoard from '../components/dashboard/TaskBoard'
import ShabbatPrep from './ShabbatPrep'
import RoutePlanner from './RoutePlanner'
import QnAPage from './QnAPage'
import toast from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { ALL_UNITS } from '../utils/constants'

// ─── טאבים מאוחדים: 11 → 5 קטגוריות ───
// כל הפונקציות המקוריות שמורות — רק מוצגות תחת תת-ניווט פנימי

const MAIN_TABS = [
  { icon: '🗺️', label: 'סטטוס',   id: 'status'   },  // סטטוס מוצבים + מפה + מפת ליקויים
  { icon: '📋', label: 'ניהול',    id: 'manage'   },  // ניהול ודיווח + ניתוח יחידה + היסטוריה
  { icon: '📖', label: 'הלכה',     id: 'halacha'  },  // הכנה לשבת + הלכה
  { icon: '🏆', label: 'ביצועים', id: 'perf'     },  // תחרות + מסלול ביקורים
  { icon: '⚙️', label: 'ניהול מתקדם', id: 'admin' },
]


const SOLDIER_TABS = [
  { icon: '🏆', label: 'ביצועי מבקרים', id: 'top'      },
  { icon: '🗺️', label: 'מפת דיווחים',   id: 'map'      },
  { icon: '⏱️', label: 'שעות פעילות',   id: 'hours'    },
  { icon: '📈', label: 'התקדמות',       id: 'progress' },
]

// ─── תת-ניווט פנימי בתוך כל קטגוריה ───
function SubTabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 flex-wrap mb-4 p-1 bg-gray-100 dark:bg-dark-surface2 rounded-xl">
      {tabs.map((t, i) => (
        <button key={i} onClick={() => onChange(i)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            active === i
              ? 'bg-white dark:bg-dark-surface shadow-sm text-idf-blue dark:text-dark-blue'
              : 'text-gray-500 dark:text-dark-muted hover:text-gray-700 dark:hover:text-dark-text'
          }`}>
          <span>{t.icon}</span>
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  )
}

// ─── קטגוריה: סטטוס ───
function StatusCategory({ reports }) {
  const [sub, setSub] = useState(0)
  const subs = [
    { icon: '🗺️', label: 'סטטוס מוצבים' },
    { icon: '🗺️', label: 'מפה גיאוגרפית' },
    { icon: '🔥', label: 'מפת ליקויים' },
  ]
  return (
    <>
      <SubTabs tabs={subs} active={sub} onChange={setSub} />
      {sub === 0 && <BaseStatusBoard reports={reports} />}
      {sub === 1 && <MapView reports={reports} />}
      {sub === 2 && <DeficitHeatMap reports={reports} />}
    </>
  )
}

// ─── קטגוריה: ניהול ───
function ManageCategory({ reports, unit, histFilter, setHistFilter, isPikud, canManageTasks }) {
  const [sub, setSub] = useState(0)
  const subs = [
    { icon: '📊', label: 'ניהול ודיווח' },
    { icon: '🌿', label: 'ניתוח יחידה' },
    { icon: '🎯', label: 'משימות' },
    { icon: '📁', label: 'היסטוריה' },
  ]
  return (
    <>
      <SubTabs tabs={subs} active={sub} onChange={setSub} />
      {sub === 0 && <ManagementTab reports={reports} unit={unit} />}
      {sub === 1 && <UnitAnalysisTab reports={reports} unit={unit} />}
      {sub === 2 && (
        <TaskBoard
          unit={unit}
          canManageTasks={canManageTasks}
          title="🎯 משימות לחיילי היחידה"
          subtitle={canManageTasks
            ? 'רק לחשבון רב החטמ״ר / רב החטיבה מותר להוסיף ולעדכן משימות'
            : 'תצוגת קריאה בלבד של משימות היחידה'}
        />
      )}
      {sub === 3 && <HistoryTab reports={reports} filter={histFilter} setFilter={setHistFilter} canDelete={isPikud} />}
    </>
  )
}

// ─── קטגוריה: הלכה ───
function HalachaCategory({ reports, unit }) {
  const [sub, setSub] = useState(0)
  const subs = [
    { icon: '🕯️', label: 'הכנה לשבת' },
    { icon: '📖', label: 'הלכה ושאלות' },
  ]
  return (
    <>
      <SubTabs tabs={subs} active={sub} onChange={setSub} />
      {sub === 0 && <ShabbatPrep reports={reports} unit={unit} embedded />}
      {sub === 1 && <QnAPage embedded />}
    </>
  )
}

// ─── קטגוריה: ביצועים ───
function PerfCategory({ reports }) {
  const [sub, setSub] = useState(0)
  const subs = [
    { icon: '🏆', label: 'טבלת תחרות' },
    { icon: '🛤️', label: 'מסלול ביקורים' },
    { icon: '📈', label: 'SLA ומדדים' },
  ]
  return (
    <>
      <SubTabs tabs={subs} active={sub} onChange={setSub} />
      {sub === 0 && <SLADashboard reports={reports} />}
      {sub === 1 && <RoutePlanner embedded reports={reports} />}
      {sub === 2 && <SLADashboard reports={reports} />}
    </>
  )
}

export default function Dashboard() {
  const { user, canAccess, hasManagerAccess, managerAccessEligible, unlockManagerAccess } = useAuth()
  const [activeTab, setActiveTab] = useState(0)
  const [soldierTab, setSoldierTab] = useState(0)
  const [histFilter, setHistFilter] = useState('')
  const [managerPassword, setManagerPassword] = useState('')
  const [unlocking, setUnlocking] = useState(false)

  const isPikud = canAccess('ugda')
  const isManager = hasManagerAccess

  const { data: reports = [], isLoading } = useReports()
  const { data: defStats } = useDeficitStats()
  const canManageUnitTasks = Boolean(user?.canManageTasks || (hasManagerAccess && canAccess('gdud')))

  async function handleManagerUnlock(event) {
    event.preventDefault()
    setUnlocking(true)
    try {
      await unlockManagerAccess(managerPassword)
      setManagerPassword('')
      toast.success('מצב מנהל נפתח בהצלחה')
    } catch (error) {
      toast.error(error.message || 'פתיחת מצב מנהל נכשלה')
    } finally {
      setUnlocking(false)
    }
  }

  // --- תצוגה נעולה (חייל שטח / חטמ"ר נעול) ---
  if (!isManager) {
    return (
      <PageLayout>
        <div className="max-w-5xl mx-auto space-y-6 relative z-10">
          <MorningBriefing reports={reports} unit={user?.unit} />

          <TaskBoard
            unit={user?.unit}
            canManageTasks={false}
            title="🎯 משימות היחידה"
            subtitle="כאן החיילים רואים את המשימות שהוקצו ליחידה ולמוצבים"
          />

          <Link to="/report/new" className="btn-primary w-full py-6 text-xl font-bold flex items-center justify-center gap-2 rounded-2xl shadow-lg border-b-4 border-idf-blueDark">
            📝 דוח חדש
          </Link>

          <div className="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-idf-border dark:border-dark-border relative z-20">
            <TabsBar tabs={SOLDIER_TABS} activeTab={soldierTab} onChange={setSoldierTab} />
            <div className="p-4">
              {soldierTab === 0 && <TopInspectorsTab reports={reports} />}
              {soldierTab === 1 && (
                <MapView
                  reports={reports}
                  showControls={false}
                  showLegend={false}
                  showStatusDetails={false}
                  showFooterSummary={false}
                />
              )}
              {soldierTab === 2 && <ActivityHoursTab reports={reports} />}
              {soldierTab === 3 && <ProgressChartTab reports={reports} />}
            </div>
          </div>

          {managerAccessEligible && (
            <div className="bg-white dark:bg-dark-surface rounded-[2rem] border border-idf-border dark:border-dark-border p-5 shadow-lg">
              <div className="text-xl font-extrabold text-idf-blue dark:text-dark-blue mb-4">🔐 כניסת מנהל</div>

              <form onSubmit={handleManagerUnlock} className="grid grid-cols-1 md:grid-cols-[220px,1fr] gap-4 items-center">
                <button
                  type="submit"
                  disabled={unlocking}
                  className="btn-primary py-4 text-lg font-bold rounded-2xl"
                >
                  {unlocking ? 'פותח...' : 'פתח ניהול'}
                </button>
                <input
                  type="password"
                  value={managerPassword}
                  onChange={(event) => setManagerPassword(event.target.value)}
                  className="input-field text-center text-xl rounded-2xl min-h-[72px]"
                  placeholder="סיסמת מנהל"
                />
              </form>
            </div>
          )}
        </div>
      </PageLayout>
    )
  }

  // --- תצוגה פתוחה ---
  // פיקוד/אוגדה: ישירות ל-CommandDashboard (בלי שכבת טאבים נוספת)
  // חטמ"ר: MAIN_TABS עם sub-nav

  if (isPikud) {
    return (
      <PageLayout>
        {isLoading
          ? <div className="flex justify-center py-20"><Spinner size="lg" /></div>
          : <CommandDashboard role={user?.role} unit={user?.unit} accessibleUnits={ALL_UNITS} />
        }
      </PageLayout>
    )
  }

  // חטמ"ר — MAIN_TABS עם כפתורי פעולה
  const currentTabId = MAIN_TABS[activeTab]?.id

  return (
    <PageLayout>
      <MorningBriefing reports={reports} unit={user?.unit} />

      <div className="flex gap-3 mb-4 flex-wrap relative z-20">
        <Link to="/report/new" className="btn-primary flex items-center gap-2 text-sm">📝 דוח חדש</Link>
        <Link to="/tasks" className="btn-outline flex items-center gap-2 text-sm">🎯 משימות</Link>
        <Link to="/deficits" className="btn-outline flex items-center gap-2 text-sm relative">
          ⚠️ ליקויים
          {defStats?.open > 0 && (
            <span className="absolute -top-1 -left-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{defStats.open}</span>
          )}
        </Link>
        <Link to="/analytics" className="btn-outline flex items-center gap-2 text-sm">📊 ניתוח מלא</Link>
        <Link to="/gps-anomalies" className="btn-outline flex items-center gap-2 text-sm">🛰️ חריגות GPS</Link>
        <Link to="/excel" className="btn-outline flex items-center gap-2 text-sm">📄 Excel</Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <div className="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-idf-border dark:border-dark-border relative z-10">
          <TabsBar tabs={MAIN_TABS} activeTab={activeTab} onChange={setActiveTab} />
          <div className="p-4 relative z-0">

            {currentTabId === 'status'  && <StatusCategory reports={reports} />}
            {currentTabId === 'manage'  && (
              <ManageCategory
                reports={reports}
                unit={user?.unit}
                histFilter={histFilter}
                setHistFilter={setHistFilter}
                isPikud={false}
                canManageTasks={canManageUnitTasks}
              />
            )}
            {currentTabId === 'halacha' && <HalachaCategory reports={reports} unit={user?.unit} />}
            {currentTabId === 'perf'    && <PerfCategory reports={reports} />}
            {currentTabId === 'admin'   && <AdminQuickLinks canAdmin={false} />}
          </div>
        </div>
      )}
    </PageLayout>
  )
}

// ─────────────────────────────────────────────
// קומפוננטות פנימיות — ללא שינוי מהמקור
// ─────────────────────────────────────────────

function TopInspectorsTab({ reports }) {
  const insp = useMemo(() => {
    const map = {}
    reports.forEach(r => { if (r.inspector) map[r.inspector] = (map[r.inspector] || 0) + 1 })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 9)
  }, [reports])

  if (insp.length === 0) return <div className="text-center py-10 text-gray-400 font-bold">אין מדווחים עדיין</div>

  return (
    <div className="flex flex-col gap-3">
      {insp.map(([name, count], i) => {
        let medal = `${i + 1}`
        let colorClass = 'text-gray-400'
        let bgClass = 'bg-white dark:bg-dark-surface'
        if (i === 0) { medal = '🏆'; colorClass = 'text-yellow-500 text-2xl'; bgClass = 'bg-yellow-50 border-yellow-200' }
        else if (i === 1) { medal = '🥈'; colorClass = 'text-gray-400 text-2xl'; bgClass = 'bg-gray-50' }
        else if (i === 2) { medal = '🥉'; colorClass = 'text-amber-600 text-2xl'; bgClass = 'bg-amber-50/30' }
        return (
          <div key={name} className={`flex items-center justify-between border shadow-sm py-3 px-4 rounded-xl transition-all ${bgClass}`}>
            <div className="flex items-center gap-4">
              <span className={`font-bold w-8 text-center ${colorClass}`}>{medal}</span>
              <span className="font-bold text-gray-800 text-lg">{name}</span>
            </div>
            <span className="bg-idf-blue text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">{count} דוחות</span>
          </div>
        )
      })}
    </div>
  )
}

function ActivityHoursTab({ reports }) {
  const data = useMemo(() => {
    const hours = Array(24).fill(0)
    reports.forEach(r => {
      if (r.created_at || r.date) {
        const d = new Date(r.created_at || r.date)
        if (!isNaN(d.getHours())) hours[d.getHours()]++
      }
    })
    return hours.map((count, hour) => ({ name: `${hour}:00`, count })).filter(h => h.count > 0)
  }, [reports])

  return (
    <div className="h-72">
      <h3 className="font-bold text-gray-700 mb-4">פעילות לפי שעות היממה</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis />
          <Tooltip />
          <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="מספר דוחות" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function ProgressChartTab({ reports }) {
  const data = useMemo(() => {
    const days = {}
    reports.forEach(r => { if (r.date) days[r.date] = (days[r.date] || 0) + 1 })
    return Object.entries(days).sort((a, b) => a[0].localeCompare(b[0])).map(([date, count]) => ({ date: date.slice(5), count }))
  }, [reports])

  return (
    <div className="h-72">
      <h3 className="font-bold text-gray-700 mb-4">קצב דיווחים יומי</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={3} name="דוחות" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function ManagementTab({ reports, unit }) {
  const inspectors = [...new Set(reports.map(r => r.inspector).filter(Boolean))]
  return (
    <div className="space-y-6">
      <div className="section-title">📊 ניהול ודיווח</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card text-center py-6">
          <p className="text-4xl font-extrabold text-idf-blue dark:text-dark-blue">{reports.length}</p>
          <p className="text-sm text-gray-500 mt-1">סה"כ דוחות</p>
        </div>
        <div className="card text-center py-6">
          <p className="text-4xl font-extrabold text-idf-blue dark:text-dark-blue">{[...new Set(reports.map(r => r.base))].length}</p>
          <p className="text-sm text-gray-500 mt-1">מוצבים בבדיקה</p>
        </div>
        <div className="card text-center py-6">
          <p className="text-4xl font-extrabold text-idf-blue dark:text-dark-blue">{inspectors.length}</p>
          <p className="text-sm text-gray-500 mt-1">מבקרים פעילים</p>
        </div>
      </div>
      <StatsCharts reports={reports} />
      <LeaderboardTable reports={reports} />
    </div>
  )
}

function UnitAnalysisTab({ reports }) {
  const byUnit = {}
  reports.forEach(r => { if (r.unit) byUnit[r.unit] = (byUnit[r.unit] || []).concat(r) })
  return (
    <div className="space-y-4">
      <div className="section-title">🌿 ניתוח יחידות</div>
      {Object.entries(byUnit).map(([unit, unitReports]) => {
        const okCount = unitReports.filter(r => r.e_status === 'תקין' && r.k_cert === 'כן').length
        const pct = Math.round((okCount / unitReports.length) * 100)
        return (
          <div key={unit} className="card">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">{unit}</h3>
              <span className={`font-extrabold text-lg ${pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>{pct}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
              <div className={`h-2 rounded-full ${pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">{unitReports.length} דוחות · {okCount} תקין</p>
          </div>
        )
      })}
      {Object.keys(byUnit).length === 0 && <p className="text-center text-gray-400 py-10">אין נתונים</p>}
    </div>
  )
}

function HistoryTab({ reports, filter, setFilter, canDelete }) {
  const filtered = filter ? reports.filter(r => r.base?.includes(filter) || r.inspector?.includes(filter)) : reports

  const handleDelete = async (id) => {
    if (!window.confirm('⚠️ האם אתה בטוח שברצונך למחוק דוח זה? פעולה זו היא בלתי הפיכה!')) return
    try {
      const { error } = await supabase.from('reports').delete().eq('id', id)
      if (error) throw error
      toast.success('🗑️ הדוח נמחק בהצלחה! מרענן נתונים...')
      setTimeout(() => window.location.reload(), 1500)
    } catch (e) {
      toast.error('שגיאה במחיקת הדוח: ' + e.message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="section-title">📁 היסטוריית דוחות</div>
      <input type="text" value={filter} onChange={e => setFilter(e.target.value)} placeholder="🔍 חפש לפי מוצב או מבקר..." className="input-field" />
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
        {filtered.slice(0, 50).map(r => (
          <div key={r.id} className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl text-sm hover:bg-blue-50 transition-all">
            <div>
              <p className="font-bold text-gray-800">{r.base}</p>
              <p className="text-xs text-gray-400">{r.date} · {r.inspector} · {r.unit}</p>
            </div>
            <div className="flex gap-3 items-center">
              <div className="flex gap-1 items-center">
                <span>{r.e_status === 'תקין' ? '✅' : r.e_status === 'פסול' ? '❌' : '⬜'}</span>
                {r.reliability_score && (
                  <span className={`text-xs font-bold ${r.reliability_score >= 80 ? 'text-green-600' : 'text-amber-600'}`}>{r.reliability_score}</span>
                )}
              </div>
              {canDelete && (
                <button onClick={() => handleDelete(r.id)} className="text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors border border-transparent hover:border-red-200" title="מחק דוח">
                  🗑️
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AdminQuickLinks({ canAdmin }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[
        { to: '/route-planner', label: 'תכנון מסלול', icon: '🛤️' },
        { to: '/tasks', label: 'משימות יחידה', icon: '🎯' },
        { to: '/excel', label: 'יצוא Excel', icon: '📄' },
        canAdmin && { to: '/admin', label: 'ניהול חשבונות', icon: '🔐' },
        canAdmin && { to: '/admin?tab=logos', label: 'ניהול לוגואים', icon: '🖼️' },
      ].filter(Boolean).map(l => (
        <Link key={l.to} to={l.to} className="card flex flex-col items-center gap-2 py-6 hover:shadow-md hover:border-idf-blue dark:hover:border-dark-blue border-2 border-transparent transition-all text-center">
          <span className="text-4xl">{l.icon}</span>
          <span className="font-semibold text-sm text-gray-700">{l.label}</span>
        </Link>
      ))}
    </div>
  )
}
