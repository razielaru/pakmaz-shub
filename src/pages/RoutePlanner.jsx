// src/pages/RoutePlanner.jsx — תכנון מסלול ביקורים לפי עדיפות
import { useMemo } from 'react'
import { useReports } from '../hooks/useReports'
import { useAuth } from '../context/AuthContext'
import { useBaseRegistry } from '../hooks/useBaseRegistry'
import PageLayout from '../components/layout/PageLayout'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'

function urgencyScore(baseName, reports) {
  const baseReports = reports
    .filter(r => r.base === baseName)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
  
  const last = baseReports[0]
  let score = 0

  if (!last) return { score: 100, reasons: ['לא בוקר מעולם'], color: 'error' }

  const daysSince = Math.floor((Date.now() - new Date(last.date)) / 86400000)

  // Time since last visit
  if (daysSince > 60)      score += 50
  else if (daysSince > 30) score += 30
  else if (daysSince > 14) score += 15

  const reasons = []
  if (daysSince > 14) reasons.push(`${daysSince} ימים ללא ביקור`)

  // Critical issues
  if (last.e_status === 'פסול')      { score += 40; reasons.push('עירוב פסול') }
  if (last.k_cert === 'לא')          { score += 35; reasons.push('כשרות חסרה') }
  if (last.p_mix === 'כן')           { score += 20; reasons.push('ערבוב כלים') }
  if ((last.r_mezuzot_missing||0)>=5){ score += 15; reasons.push(`${last.r_mezuzot_missing} מזוזות חסרות`) }
  if (last.k_issues === 'כן')        { score += 15; reasons.push('תקלות כשרות') }
  if ((last.reliability_score||80)<60){ score += 20; reasons.push('ציון אמינות נמוך') }

  const color = score >= 60 ? 'error' : score >= 30 ? 'warning' : 'success'
  return { score: Math.min(100, score), reasons, color, daysSince, last }
}

export default function RoutePlanner({ embedded = false }) {
  const { user } = useAuth()
  const { baseNames } = useBaseRegistry(user?.unit)
  // פיקוד/אוגדה רואים הכל — מסנן לפי יחידה כדי לראות רק המוצבים הרלוונטיים
  const unitFilter = (user?.role === 'pikud' || user?.role === 'ugda')
    ? { unit: user.unit }
    : {}
  const { data: reports = [], isLoading } = useReports(unitFilter)

  const basePriorities = useMemo(() => {
    const fromReports = [...new Set(reports.map(r => r.base).filter(Boolean))]
    const bases = fromReports.length > 0 ? fromReports : baseNames
    return bases
      .map(base => ({ base, ...urgencyScore(base, reports) }))
      .sort((a, b) => b.score - a.score)
  }, [baseNames, reports])

  const content = (
    <div className="space-y-4">
      <div className="section-title">🛤️ תכנון מסלול ביקורים</div>
      <p className="text-sm text-gray-500">המוצבים ממוינים לפי דחיפות — מהגבוה לנמוך</p>

      {isLoading ? (
        <div className="flex justify-center py-10"><Spinner/></div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="card text-center border-red-200 bg-red-50">
              <p className="text-2xl font-extrabold text-red-700">{basePriorities.filter(b=>b.score>=60).length}</p>
              <p className="text-xs text-red-600">🔴 דחוף</p>
            </div>
            <div className="card text-center border-amber-200 bg-amber-50">
              <p className="text-2xl font-extrabold text-amber-700">{basePriorities.filter(b=>b.score>=30&&b.score<60).length}</p>
              <p className="text-xs text-amber-600">🟡 בינוני</p>
            </div>
            <div className="card text-center border-green-200 bg-green-50">
              <p className="text-2xl font-extrabold text-green-700">{basePriorities.filter(b=>b.score<30).length}</p>
              <p className="text-xs text-green-600">🟢 תקין</p>
            </div>
          </div>

          <div className="space-y-2">
            {basePriorities.map((item, idx) => (
              <div key={item.base}
                className={`card border-2 flex items-start justify-between gap-4 flex-wrap transition-all hover:shadow-md ${
                  item.color==='error' ? 'border-red-200 bg-red-50/50'
                  : item.color==='warning' ? 'border-amber-200 bg-amber-50/50'
                  : 'border-green-200 bg-green-50/20'
                }`}>
                <div className="flex items-start gap-3">
                  <span className={`text-2xl font-black w-8 text-center ${item.color==='error'?'text-red-600':item.color==='warning'?'text-amber-600':'text-green-600'}`}>
                    {idx+1}
                  </span>
                  <div>
                    <p className="font-bold text-gray-800">{item.base}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.reasons.map((r,i) => (
                        <span key={i} className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          item.color==='error' ? 'bg-red-100 text-red-700'
                          : item.color==='warning' ? 'bg-amber-100 text-amber-700'
                          : 'bg-green-100 text-green-700'
                        }`}>{r}</span>
                      ))}
                    </div>
                    {item.last && (
                      <p className="text-xs text-gray-400 mt-1">בדיקה אחרונה: {item.last.date} · {item.last.inspector}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`text-2xl font-extrabold ${item.color==='error'?'text-red-600':item.color==='warning'?'text-amber-600':'text-green-600'}`}>
                    {item.score}
                  </div>
                  <Badge type={item.color==='error'?'error':item.color==='warning'?'warning':'success'} size="xs">
                    {item.color==='error'?'דחוף':item.color==='warning'?'בינוני':'תקין'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )

  if (embedded) return content
  return <PageLayout title="🛤️ תכנון מסלול">{content}</PageLayout>
}
