import { useState, useMemo } from 'react'
import { useReports } from '../hooks/useReports'
import PageLayout from '../components/layout/PageLayout'
import TabsBar from '../components/ui/TabsBar'
import StatsCharts from '../components/dashboard/StatsCharts'
import LeaderboardTable from '../components/dashboard/LeaderboardTable'
import Spinner from '../components/ui/Spinner'
import Badge from '../components/ui/Badge'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

const TABS = [
  { icon: '🥩', label: 'כשרות' },
  { icon: '🔵', label: 'עירוב' },
  { icon: '📜', label: 'חוסרים' },
  { icon: '🎯', label: 'ביצועים' },
  { icon: '⚡', label: 'חריגויות' },
]

export default function Analytics() {
  const { data: reports = [], isLoading } = useReports()
  const [activeTab, setActiveTab] = useState(0)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const filtered = useMemo(() => {
    let r = reports
    if (dateFrom) r = r.filter(x => x.date >= dateFrom)
    if (dateTo) r = r.filter(x => x.date <= dateTo)
    return r
  }, [reports, dateFrom, dateTo])

  return (
    <PageLayout title="📊 ניתוח נתונים" subtitle={`${filtered.length} דוחות`}>
      {/* Filters - הוספנו relative z-20 כדי שחלון התאריכים יקפוץ מעל */}
      <div className="card mb-4 flex flex-wrap gap-3 items-center relative z-20">
        <div className="flex items-center gap-2 text-sm">
          <label className="text-gray-500">מ-</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-field text-sm py-1.5 w-36" />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <label className="text-gray-500">עד</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-field text-sm py-1.5 w-36" />
        </div>
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(''); setDateTo('') }} className="text-xs text-gray-400 hover:text-red-500">
            ✕ נקה
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        /* התיקון העיקרי: הסרת overflow-hidden והוספת relative z-10 */
        <div className="bg-white rounded-xl shadow-sm border border-idf-border relative z-10">
          <TabsBar tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
          <div className="p-4 relative z-0">
            {activeTab === 0 && <KashrutTab reports={filtered} />}
            {activeTab === 1 && <EruvTab reports={filtered} />}
            {activeTab === 2 && <DeficitsTab reports={filtered} />}
            {activeTab === 3 && <PerformanceTab reports={filtered} />}
            {activeTab === 4 && <AnomaliesTab reports={filtered} />}
          </div>
        </div>
      )}
    </PageLayout>
  )
}

function KashrutTab({ reports }) {
  const certOk = reports.filter(r => r.k_cert === 'כן').length
  const issues = reports.filter(r => r.k_issues === 'כן').length
  const certPct = reports.length ? Math.round((certOk / reports.length) * 100) : 0

  const byBase = {}
  reports.forEach(r => {
    if (!r.base) return
    if (!byBase[r.base]) byBase[r.base] = { base: r.base, ok: 0, total: 0 }
    byBase[r.base].total++
    if (r.k_cert === 'כן') byBase[r.base].ok++
  })
  const chartData = Object.values(byBase).map(b => ({ base: b.base, pct: Math.round((b.ok / b.total) * 100) }))
    .sort((a, b) => b.pct - a.pct)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="תעודות בתוקף" value={`${certPct}%`} sub={`${certOk}/${reports.length}`} type={certPct >= 80 ? 'success' : 'error'} />
        <StatCard label="תקלות כשרות" value={issues} sub="דוחות" type={issues > 0 ? 'warning' : 'success'} />
        <StatCard label="ערבוב כלים" value={reports.filter(r => r.p_mix === 'כן').length} sub="מקרים" type="warning" />
      </div>
      <div className="card">
        <h3 className="font-bold text-gray-700 mb-4">כשרות לפי מוצב</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="base" tick={{ fontSize: 10, fontFamily: 'Heebo' }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
            <Tooltip formatter={v => [`${v}%`, 'תעודות בתוקף']} />
            <Bar dataKey="pct" fill="#2e7d32" radius={[4, 4, 0, 0]} name="%" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function EruvTab({ reports }) {
  const eruvOk = reports.filter(r => r.e_status === 'תקין').length
  const eruvFail = reports.filter(r => r.e_status === 'פסול').length

  const timeline = {}
  reports.forEach(r => {
    const m = r.date?.slice(0, 7)
    if (!m) return
    if (!timeline[m]) timeline[m] = { month: m, תקין: 0, פסול: 0 }
    if (r.e_status === 'תקין') timeline[m].תקין++
    if (r.e_status === 'פסול') timeline[m].פסול++
  })
  const chartData = Object.values(timeline).sort((a, b) => a.month.localeCompare(b.month))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="עירוב תקין" value={eruvOk} sub="דוחות" type="success" />
        <StatCard label="עירוב פסול" value={eruvFail} sub="דוחות" type={eruvFail > 0 ? 'error' : 'success'} />
      </div>
      {eruvFail > 0 && (
        <div className="card border-2 border-red-200 bg-red-50">
          <h3 className="font-bold text-red-800 mb-2">🚨 מוצבים עם עירוב פסול:</h3>
          {[...new Set(reports.filter(r => r.e_status === 'פסול').map(r => r.base))].map(b => (
            <Badge key={b} type="error">{b}</Badge>
          ))}
        </div>
      )}
      <div className="card">
        <h3 className="font-bold text-gray-700 mb-4">עירוב לאורך זמן</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="תקין" stroke="#2e7d32" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="פסול" stroke="#c62828" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function DeficitsTab({ reports }) {
  const totalMezuzot = reports.reduce((s, r) => s + parseInt(r.r_mezuzot_missing || 0), 0)
  const torahMissing = reports.filter(r => r.r_torah_missing === 'כן').length

  const byBase = {}
  reports.forEach(r => {
    if (!r.base || !r.r_mezuzot_missing) return
    byBase[r.base] = (byBase[r.base] || 0) + parseInt(r.r_mezuzot_missing)
  })
  const chartData = Object.entries(byBase).map(([base, count]) => ({ base, count })).sort((a, b) => b.count - a.count)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="מזוזות חסרות סה״כ" value={totalMezuzot} type={totalMezuzot > 10 ? 'error' : 'warning'} />
        <StatCard label="ס״ת חסרים" value={torahMissing} sub="מוצבים" type={torahMissing > 0 ? 'warning' : 'success'} />
      </div>
      {chartData.length > 0 && (
        <div className="card">
          <h3 className="font-bold text-gray-700 mb-4">📜 מזוזות חסרות לפי מוצב</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="base" tick={{ fontSize: 10, fontFamily: 'Heebo' }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#c8971a" radius={[4, 4, 0, 0]} name="מזוזות" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

function PerformanceTab({ reports }) {
  const avgScore = reports.length
    ? Math.round(reports.reduce((a, r) => a + (r.reliability_score || 80), 0) / reports.length)
    : 0

  const byInspector = {}
  reports.forEach(r => {
    if (!r.inspector) return
    if (!byInspector[r.inspector]) byInspector[r.inspector] = { name: r.inspector, count: 0, totalScore: 0 }
    byInspector[r.inspector].count++
    byInspector[r.inspector].totalScore += (r.reliability_score || 80)
  })
  const inspData = Object.values(byInspector)
    .map(i => ({ ...i, avg: Math.round(i.totalScore / i.count) }))
    .sort((a, b) => b.avg - a.avg)

  return (
    <div className="space-y-6">
      <StatCard label="ציון אמינות ממוצע" value={`${avgScore}%`} type={avgScore >= 80 ? 'success' : 'warning'} />
      <LeaderboardTable reports={reports} />
      <div className="card">
        <h3 className="font-bold text-gray-700 mb-4">🎯 ביצועי מבקרים</h3>
        <div className="space-y-2">
          {inspData.slice(0, 10).map((insp, i) => (
            <div key={insp.name} className="flex items-center gap-3">
              <span className="text-sm w-4 text-gray-400">{i + 1}</span>
              <span className="text-sm font-semibold flex-1 truncate">{insp.name}</span>
              <span className="text-xs text-gray-400">{insp.count} דוחות</span>
              <div className="w-24 bg-gray-100 rounded-full h-2">
                <div className={`h-2 rounded-full ${insp.avg >= 80 ? 'bg-green-500' : insp.avg >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${insp.avg}%` }} />
              </div>
              <span className={`text-xs font-bold w-8 text-right ${insp.avg >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>{insp.avg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function AnomaliesTab({ reports }) {
  const lowScore = reports.filter(r => r.reliability_score < 60)
  const tooFast = reports.filter(r => r._elapsed_seconds < 120)
  const noGps = reports.filter(r => !r.gps_lat)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="ציון נמוך" value={lowScore.length} type={lowScore.length > 0 ? 'error' : 'success'} />
        <StatCard label="מילוי מהיר מדי" value={tooFast.length} type={tooFast.length > 0 ? 'warning' : 'success'} />
        <StatCard label="ללא GPS" value={noGps.length} type={noGps.length > 0 ? 'warning' : 'success'} />
      </div>

      {lowScore.length > 0 && (
        <div className="card space-y-2">
          <h3 className="font-bold text-red-700">⚡ דוחות עם ציון אמינות נמוך</h3>
          {lowScore.slice(0, 10).map(r => (
            <div key={r.id} className="flex justify-between items-center text-sm py-1.5 border-b border-gray-50">
              <span>{r.base} · {r.inspector}</span>
              <Badge type="error">{r.reliability_score}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, sub, type = 'default' }) {
  const colors = {
    success: 'bg-green-50 border-green-200 text-green-700',
    error: 'bg-red-50 border-red-200 text-red-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    default: 'bg-blue-50 border-blue-200 text-blue-700',
  }
  return (
    <div className={`card border-2 ${colors[type]} text-center py-4`}>
      <p className="text-3xl font-extrabold">{value}</p>
      {sub && <p className="text-xs opacity-70 mt-0.5">{sub}</p>}
      <p className="text-xs font-semibold mt-1 opacity-80">{label}</p>
    </div>
  )
}
