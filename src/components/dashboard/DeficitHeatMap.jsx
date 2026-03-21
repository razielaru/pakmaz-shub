// src/components/dashboard/DeficitHeatMap.jsx — מפת חום ליקויים
import { useMemo } from 'react'

const DEFICIT_TYPES = [
  { key: 'e_status', label: 'עירוב', check: r => r.e_status === 'פסול', severity: 'critical' },
  { key: 'k_cert',   label: 'כשרות', check: r => r.k_cert === 'לא', severity: 'critical' },
  { key: 'p_mix',    label: 'ערבוב כלים', check: r => r.p_mix === 'כן', severity: 'warning' },
  { key: 'mezuzot',  label: 'מזוזות', check: r => (r.r_mezuzot_missing||0) >= 5, severity: 'warning' },
  { key: 'k_issues', label: 'תקלות כשרות', check: r => r.k_issues === 'כן', severity: 'info' },
  { key: 's_board',  label: 'לוח רבנות', check: r => r.s_board === 'לא', severity: 'info' },
  { key: 's_clean',  label: 'ביהכ"נ לא נקי', check: r => r.s_clean === 'לא', severity: 'info' },
  { key: 's_gemach', label: 'חסר גמ"ח', check: r => r.s_gemach === 'לא', severity: 'info' },
]

export default function DeficitHeatMap({ reports }) {
  const heatData = useMemo(() => {
    const bases = [...new Set(reports.map(r => r.base).filter(Boolean))]
    return bases.map(base => {
      const baseReps = reports.filter(r => r.base === base)
        .sort((a,b)=>new Date(b.date)-new Date(a.date))
      const last = baseReps[0]
      if (!last) return null
      const deficits = DEFICIT_TYPES.map(d => ({
        ...d,
        found: d.check(last)
      }))
      const criticalCount = deficits.filter(d=>d.found && d.severity==='critical').length
      const warnCount = deficits.filter(d=>d.found && d.severity==='warning').length
      const totalScore = criticalCount * 3 + warnCount
      return { base, last, deficits, criticalCount, warnCount, totalScore }
    }).filter(Boolean).sort((a,b)=>b.totalScore-a.totalScore)
  }, [reports])

  if (!heatData.length) return (
    <div className="text-center py-10 text-gray-400">
      <p className="text-4xl mb-2">🔥</p>
      <p>אין נתונים למפת חום</p>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="section-title">🔥 מפת חום ליקויים</div>
      
      {/* Legend */}
      <div className="flex gap-4 text-xs flex-wrap">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500 inline-block"></span>קריטי</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400 inline-block"></span>אזהרה</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-300 inline-block"></span>מידע</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-200 inline-block"></span>תקין</span>
      </div>

      {/* Heat grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-right px-3 py-2 font-semibold text-gray-600 border border-gray-200 sticky right-0 bg-gray-50 z-10">מוצב</th>
              {DEFICIT_TYPES.map(d => (
                <th key={d.key} className="px-2 py-2 font-semibold text-gray-600 border border-gray-200 whitespace-nowrap min-w-[70px]">{d.label}</th>
              ))}
              <th className="px-2 py-2 font-semibold text-gray-600 border border-gray-200">ציון</th>
            </tr>
          </thead>
          <tbody>
            {heatData.map(row => (
              <tr key={row.base} className="hover:bg-gray-50/50">
                <td className="px-3 py-2 font-bold text-gray-800 border border-gray-200 sticky right-0 bg-white whitespace-nowrap">{row.base}</td>
                {row.deficits.map(d => (
                  <td key={d.key} className={`text-center border border-gray-200 py-2 ${
                    d.found
                      ? d.severity==='critical' ? 'bg-red-100'
                        : d.severity==='warning' ? 'bg-amber-100'
                        : 'bg-blue-50'
                      : 'bg-green-50'
                  }`}>
                    {d.found
                      ? d.severity==='critical' ? '🔴'
                        : d.severity==='warning' ? '🟡'
                        : '🔵'
                      : '✅'
                    }
                  </td>
                ))}
                <td className={`text-center font-extrabold border border-gray-200 ${
                  row.totalScore >= 3 ? 'text-red-700 bg-red-50'
                  : row.totalScore >= 1 ? 'text-amber-700 bg-amber-50'
                  : 'text-green-700 bg-green-50'
                }`}>{row.totalScore === 0 ? '✅' : row.totalScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
