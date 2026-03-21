// src/components/dashboard/SLADashboard.jsx — תחרות יחידות + מדליות
import { useMemo } from 'react'

function calculateUnitScore(reports) {
  if (!reports.length) return 0
  let total = 0
  for (const r of reports) {
    let score = 100
    if (r.e_status === 'פסול') score -= 40
    if (r.k_cert === 'לא')     score -= 30
    if (r.p_mix === 'כן')      score -= 15
    if ((r.r_mezuzot_missing||0) >= 5) score -= 10
    if (r.k_issues === 'כן')   score -= 10
    total += Math.max(0, score)
  }
  return Math.round(total / reports.length)
}

function getUnitBadge(score) {
  if (score >= 90) return { medal: '🥇', label: 'מצוין', color: 'text-yellow-600 bg-yellow-50 border-yellow-300' }
  if (score >= 75) return { medal: '🥈', label: 'טוב', color: 'text-gray-500 bg-gray-50 border-gray-300' }
  if (score >= 60) return { medal: '🥉', label: 'סביר', color: 'text-amber-600 bg-amber-50 border-amber-300' }
  return { medal: '⚠️', label: 'דורש שיפור', color: 'text-red-600 bg-red-50 border-red-300' }
}

export default function SLADashboard({ reports }) {
  const unitScores = useMemo(() => {
    const byUnit = {}
    reports.forEach(r => {
      if (!r.unit) return
      if (!byUnit[r.unit]) byUnit[r.unit] = []
      byUnit[r.unit].push(r)
    })
    return Object.entries(byUnit)
      .map(([unit, reps]) => ({
        unit,
        score: calculateUnitScore(reps),
        count: reps.length,
        lastDate: reps.sort((a,b)=>new Date(b.date)-new Date(a.date))[0]?.date,
      }))
      .sort((a, b) => b.score - a.score)
  }, [reports])

  if (!unitScores.length) return (
    <div className="text-center py-10 text-gray-400">
      <p className="text-4xl mb-2">🏆</p>
      <p>אין נתונים לתחרות עדיין</p>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="section-title">🏆 טבלת תחרות יחידות</div>
      <p className="text-xs text-gray-400">ציון מבוסס על: עירוב (40), כשרות (30), ערבוב כלים (15), מזוזות (10), תקלות (10)</p>
      <div className="space-y-2">
        {unitScores.map((item, idx) => {
          const badge = getUnitBadge(item.score)
          return (
            <div key={item.unit} className={`card border-2 ${badge.color} flex items-center gap-4 p-4`}>
              <div className="text-3xl w-10 text-center">
                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : <span className="text-lg font-black text-gray-400">#{idx+1}</span>}
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-800">{item.unit}</p>
                <p className="text-xs text-gray-400">{item.count} דוחות · בדיקה אחרונה: {item.lastDate||'—'}</p>
              </div>
              {/* Score bar */}
              <div className="w-32 hidden sm:block">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">ציון</span>
                  <span className="font-bold">{item.score}</span>
                </div>
                <div className="bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${item.score>=90?'bg-yellow-500':item.score>=75?'bg-green-500':item.score>=60?'bg-amber-500':'bg-red-500'}`}
                    style={{ width: `${item.score}%` }}
                  />
                </div>
              </div>
              <div className={`text-2xl font-extrabold ${item.score>=90?'text-yellow-600':item.score>=75?'text-green-600':item.score>=60?'text-amber-600':'text-red-600'}`}>
                {item.score}
              </div>
              <div className="hidden sm:block">
                <span className={`text-xs px-2 py-1 rounded-full font-bold border ${badge.color}`}>{badge.label}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
