import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useReports } from '../hooks/useReports'
import { useDeficitStats } from '../hooks/useDeficits'
import PageLayout from '../components/layout/PageLayout'
import TabsBar from '../components/ui/TabsBar'
import Spinner from '../components/ui/Spinner'
import MorningBriefing from '../components/dashboard/MorningBriefing'
import BaseStatusBoard from '../components/dashboard/BaseStatusBoard'
import MapView from '../components/dashboard/MapView'
import StatsCharts from '../components/dashboard/StatsCharts'
import LeaderboardTable from '../components/dashboard/LeaderboardTable'
import ShabbatPrep from './ShabbatPrep'
import Analytics from './Analytics'

const ADMIN_TABS = [
  { icon: '🗺️', label: 'סטטוס מוצבים' },
  { icon: '🕯️', label: 'הכנה לשבת' },
  { icon: '📖', label: 'הלכה' },
  { icon: '📊', label: 'ניהול ודיווח' },
  { icon: '🌿', label: 'ניתוח יחידה' },
  { icon: '📁', label: 'היסטוריית דוחות' },
  { icon: '🗺️', label: 'מפה' },
  { icon: '🏆', label: 'טבלת מובילים' },
  { icon: '⚙️', label: 'ניהול מתקדם' },
]

export default function Dashboard() {
  const { user, canAccess } = useAuth()
  const [activeTab, setActiveTab] = useState(0)
  const [histFilter, setHistFilter] = useState('')

  const isAdmin = canAccess('gdud')
  const { data: reports = [], isLoading } = useReports()
  const { data: defStats } = useDeficitStats()

  // Simple view for garin
  if (!isAdmin) {
    return (
      <PageLayout>
        <div className="max-w-lg mx-auto space-y-4">
          <MorningBriefing reports={reports} unit={user.unit} />

          <Link to="/report/new"
            className="btn-primary w-full py-4 text-lg font-bold flex items-center justify-center gap-2 rounded-2xl shadow-lg">
            📝 דוח פיקוד חדש
          </Link>

          <Link to="/deficits"
            className="w-full py-3 text-base font-bold flex items-center justify-center gap-2 rounded-xl border-2 border-amber-400 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-all">
            ⚠️ ליקויים פתוחים {defStats?.open > 0 && <span className="bg-red-500 text-white text-xs rounded-full px-2">{defStats.open}</span>}
          </Link>

          {reports.length > 0 && (
            <div className="card">
              <h3 className="section-title">📋 דוחות אחרונים</h3>
              <div className="space-y-2">
                {reports.slice(0, 5).map(r => (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 text-sm">
                    <div>
                      <p className="font-semibold">{r.base}</p>
                      <p className="text-xs text-gray-400">{r.date} · {r.inspector}</p>
                    </div>
                    <span className={`text-lg ${r.e_status === 'תקין' ? '✅' : r.e_status === 'פסול' ? '❌' : '⬜'}`}>
                      {r.e_status === 'תקין' ? '✅' : r.e_status === 'פסול' ? '❌' : '⬜'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </PageLayout>
    )
  }

  // Admin/senior view with tabs
  return (
    <PageLayout>
      <MorningBriefing reports={reports} unit={user.unit} />

      {/* Quick actions */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <Link to="/report/new" className="btn-primary flex items-center gap-2 text-sm">
          📝 דוח חדש
        </Link>
        <Link to="/deficits" className="btn-outline flex items-center gap-2 text-sm relative">
          ⚠️ ליקויים
          {defStats?.open > 0 && (
            <span className="absolute -top-1 -left-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {defStats.open}
            </span>
          )}
        </Link>
        <Link to="/analytics" className="btn-outline flex items-center gap-2 text-sm">📊 ניתוח מלא</Link>
        {canAccess('pikud') && (
          <Link to="/admin" className="btn-outline flex items-center gap-2 text-sm">⚙️ ניהול</Link>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-idf-border overflow-hidden">
          <TabsBar tabs={ADMIN_TABS} activeTab={activeTab} onChange={setActiveTab} />
          <div className="p-4">
            {activeTab === 0 && <BaseStatusBoard reports={reports} unit={user.unit} />}
            {activeTab === 1 && <ShabbatPrep reports={reports} unit={user.unit} embedded />}
            {activeTab === 2 && <HalachicAdvisorEmbed />}
            {activeTab === 3 && <ManagementTab reports={reports} unit={user.unit} />}
            {activeTab === 4 && <UnitAnalysisTab reports={reports} unit={user.unit} />}
            {activeTab === 5 && <HistoryTab reports={reports} filter={histFilter} setFilter={setHistFilter} />}
            {activeTab === 6 && <MapView reports={reports} />}
            {activeTab === 7 && <LeaderboardTable reports={reports} />}
            {activeTab === 8 && <AdminQuickLinks />}
          </div>
        </div>
      )}
    </PageLayout>
  )
}

function HalachicAdvisorEmbed() {
  return (
    <div className="text-center py-10 space-y-4">
      <p className="text-5xl">📖</p>
      <h3 className="text-xl font-bold text-idf-blue">יועץ הלכתי AI</h3>
      <p className="text-gray-500 text-sm">שאל שאלה הלכתית — מועבר לדף ייעודי</p>
      <Link to="/analytics?tab=halacha" className="btn-primary inline-flex items-center gap-2">
        📖 פתח יועץ הלכתי
      </Link>
    </div>
  )
}

function ManagementTab({ reports, unit }) {
  const inspectors = [...new Set(reports.map(r => r.inspector).filter(Boolean))]
  return (
    <div className="space-y-6">
      <div className="section-title">📊 ניהול ודיווח</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-extrabold text-idf-blue">{reports.length}</p>
          <p className="text-sm text-gray-500 mt-1">סה"כ דוחות</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-extrabold text-idf-blue">
            {[...new Set(reports.map(r => r.base))].length}
          </p>
          <p className="text-sm text-gray-500 mt-1">מוצבים בבדיקה</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-extrabold text-idf-blue">{inspectors.length}</p>
          <p className="text-sm text-gray-500 mt-1">מבקרים פעילים</p>
        </div>
      </div>
      <StatsCharts reports={reports} />
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
    </div>
  )
}

function HistoryTab({ reports, filter, setFilter }) {
  const filtered = filter ? reports.filter(r => r.base?.includes(filter) || r.inspector?.includes(filter)) : reports
  return (
    <div className="space-y-4">
      <div className="section-title">📁 היסטוריית דוחות</div>
      <input type="text" value={filter} onChange={e => setFilter(e.target.value)}
        placeholder="🔍 חפש לפי מוצב או מבקר..." className="input-field" />
      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {filtered.slice(0, 50).map(r => (
          <div key={r.id} className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl text-sm hover:bg-blue-50 transition-all">
            <div>
              <p className="font-bold text-gray-800">{r.base}</p>
              <p className="text-xs text-gray-400">{r.date} · {r.inspector} · {r.unit}</p>
            </div>
            <div className="flex gap-1 items-center">
              <span>{r.e_status === 'תקין' ? '✅' : r.e_status === 'פסול' ? '❌' : '⬜'}</span>
              {r.reliability_score && (
                <span className={`text-xs font-bold ${r.reliability_score >= 80 ? 'text-green-600' : 'text-amber-600'}`}>
                  {r.reliability_score}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AdminQuickLinks() {
  return (
    <div className="grid grid-cols-2 gap-4">
      {[
        { to: '/admin', label: 'ניהול היררכיה', icon: '🏛️' },
        { to: '/admin?tab=passwords', label: 'ניהול סיסמאות', icon: '🔑' },
        { to: '/admin?tab=email', label: 'הגדרות מייל', icon: '📧' },
        { to: '/admin?tab=logos', label: 'ניהול לוגואים', icon: '🖼️' },
      ].map(l => (
        <Link key={l.to} to={l.to}
          className="card flex flex-col items-center gap-2 py-6 hover:shadow-md hover:border-idf-blue border-2 border-transparent transition-all text-center">
          <span className="text-4xl">{l.icon}</span>
          <span className="font-semibold text-sm text-gray-700">{l.label}</span>
        </Link>
      ))}
    </div>
  )
}
