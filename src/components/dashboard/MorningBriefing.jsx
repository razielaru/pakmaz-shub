import { useMemo } from 'react'

export default function MorningBriefing({ reports, unit }) {
  const stats = useMemo(() => {
    const recent = reports.filter(r => {
      const d = new Date(r.date)
      const weekAgo = new Date(Date.now() - 7 * 86400000)
      return d >= weekAgo
    })
    const criticalBases = reports.filter(r => r.e_status === 'פסול' || r.k_cert === 'לא')
      .map(r => r.base).filter((b, i, a) => a.indexOf(b) === i)
    const totalDeficits = reports.reduce((acc, r) => acc + parseInt(r.r_mezuzot_missing || 0), 0)
    const avgScore = reports.length
      ? Math.round(reports.reduce((a, r) => a + (r.reliability_score || 80), 0) / reports.length)
      : 0
    return { recent: recent.length, criticalBases, totalDeficits, avgScore, total: reports.length }
  }, [reports])

  const today = new Date().toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'בוקר טוב' : hour < 17 ? 'צהריים טובים' : 'ערב טוב'

  return (
    <div className="card bg-gradient-to-l from-idf-blueDark to-idf-blue text-white mb-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-blue-300 text-sm">{today}</p>
          <h2 className="text-2xl font-extrabold mt-1">{greeting}! ✡️</h2>
          <p className="text-blue-200 text-sm mt-1">{unit} — לוח בקרה רבנות</p>
        </div>
        <div className="text-4xl">🌅</div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
        {[
          { label: 'דוחות השבוע', value: stats.recent, icon: '📋', color: 'bg-white/10' },
          { label: 'בסיסים קריטיים', value: stats.criticalBases.length, icon: '🚨', color: stats.criticalBases.length > 0 ? 'bg-red-500/30' : 'bg-white/10' },
          { label: 'מזוזות חסרות', value: stats.totalDeficits, icon: '📜', color: stats.totalDeficits > 0 ? 'bg-amber-500/20' : 'bg-white/10' },
          { label: 'ציון אמינות', value: `${stats.avgScore}%`, icon: '🎯', color: 'bg-white/10' },
        ].map((s, i) => (
          <div key={i} className={`${s.color} rounded-xl p-3 text-center`}>
            <p className="text-2xl mb-1">{s.icon}</p>
            <p className="text-2xl font-extrabold">{s.value}</p>
            <p className="text-xs text-blue-200 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {stats.criticalBases.length > 0 && (
        <div className="mt-4 bg-red-500/20 rounded-xl p-3">
          <p className="text-sm font-semibold text-red-200">🚨 בסיסים הדורשים טיפול דחוף:</p>
          <p className="text-white font-bold">{stats.criticalBases.join(' | ')}</p>
        </div>
      )}
    </div>
  )
}



