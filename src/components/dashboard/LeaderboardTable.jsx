import { useMemo } from 'react'
import Badge from '../ui/Badge'

export default function LeaderboardTable({ reports }) {
  const leaders = useMemo(() => {
    const byBase = {}
    reports.forEach(r => {
      if (!r.base) return
      if (!byBase[r.base]) byBase[r.base] = { base: r.base, count: 0, ok: 0, lastDate: r.date }
      byBase[r.base].count++
      if (r.e_status === 'תקין' && r.k_cert === 'כן') byBase[r.base].ok++
      if (r.date > byBase[r.base].lastDate) byBase[r.base].lastDate = r.date
    })
    return Object.values(byBase)
      .map(b => ({ ...b, score: Math.round((b.ok / b.count) * 100) }))
      .sort((a, b) => b.score - a.score)
  }, [reports])

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="card">
      <h3 className="section-title">🏆 טבלת מובילים</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-right py-2 px-3 text-gray-500 font-semibold">מקום</th>
              <th className="text-right py-2 px-3 text-gray-500 font-semibold">מוצב</th>
              <th className="text-right py-2 px-3 text-gray-500 font-semibold">ציון</th>
              <th className="text-right py-2 px-3 text-gray-500 font-semibold">דוחות</th>
              <th className="text-right py-2 px-3 text-gray-500 font-semibold">בדיקה אחרונה</th>
            </tr>
          </thead>
          <tbody>
            {leaders.map((l, i) => (
              <tr key={l.base} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-3 px-3">
                  <span className="text-xl">{medals[i] || `#${i + 1}`}</span>
                </td>
                <td className="py-3 px-3 font-semibold text-gray-800">{l.base}</td>
                <td className="py-3 px-3">
                  <Badge type={l.score >= 80 ? 'success' : l.score >= 60 ? 'warning' : 'error'}>
                    {l.score}%
                  </Badge>
                </td>
                <td className="py-3 px-3 text-gray-600">{l.count}</td>
                <td className="py-3 px-3 text-gray-500 text-xs">{l.lastDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
