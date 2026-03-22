import { useMemo } from 'react'
import Badge from '../ui/Badge'

const BASE_ALIAS_MAP = {
  'עופרה': 'עפרה',
  'מוצב עטרת': 'עטרת',
  'מוצב 408': '408',
  'מפגד 636': '636',
  'מוצב 636': '636',
  'מגב איוש': 'מג"ב איוש',
  'בית-אל': 'בית אל',
}

function normalizeBaseName(base) {
  const cleaned = (base || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  return BASE_ALIAS_MAP[cleaned] || cleaned
}

export default function LeaderboardTable({ reports }) {
  const leaders = useMemo(() => {
    const byBase = {}
    reports.forEach(r => {
      const normalizedBase = normalizeBaseName(r.base)
      if (!normalizedBase) return
      if (!byBase[normalizedBase]) {
        byBase[normalizedBase] = {
          base: normalizedBase,
          count: 0,
          ok: 0,
          lastDate: r.date,
        }
      }
      byBase[normalizedBase].count++
      if (r.e_status === 'תקין' && r.k_cert === 'כן') byBase[normalizedBase].ok++
      if (r.date > byBase[normalizedBase].lastDate) byBase[normalizedBase].lastDate = r.date
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
