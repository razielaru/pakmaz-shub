import { useBaseReports } from '../../hooks/useReports'
import Badge from '../ui/Badge'
import Spinner from '../ui/Spinner'

export default function BaseHistoryCard({ base, unit }) {
  const { data: reports, isLoading } = useBaseReports(base, unit)

  if (isLoading) return <div className="card flex justify-center py-6"><Spinner /></div>
  if (!reports?.length) {
    return (
      <div className="card text-center py-6 text-gray-400">
        <p className="text-3xl mb-2">📋</p>
        <p className="text-sm">אין בדיקות קודמות רשומות עבור <strong>{base}</strong></p>
      </div>
    )
  }

  const last = reports[0]
  const prev = reports[1]

  function renderChange(label, newVal, oldVal, goodVal) {
    if (!oldVal || newVal === oldVal) return null
    const improved = newVal === goodVal
    return (
      <p className="text-xs">
        {improved ? '✅' : '⬇️'} {label}: <strong>{oldVal}</strong> → <strong>{newVal}</strong>
      </p>
    )
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="section-title">📋 היסטוריית {base}</h3>
        <Badge type="info">{reports.length} בדיקות</Badge>
      </div>

      {/* Last report summary */}
      <div className="bg-blue-50 rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-sm text-idf-blue">בדיקה אחרונה</p>
          <p className="text-xs text-gray-500">{last.date} | {last.inspector}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {last.e_status && (
            <Badge type={last.e_status === 'תקין' ? 'success' : 'error'}>
              עירוב: {last.e_status}
            </Badge>
          )}
          {last.k_cert && (
            <Badge type={last.k_cert === 'כן' ? 'success' : 'error'}>
              כשרות: {last.k_cert === 'כן' ? 'בתוקף' : 'חסרה'}
            </Badge>
          )}
          {last.r_mezuzot_missing > 0 && (
            <Badge type="warning">📜 {last.r_mezuzot_missing} מזוזות חסרות</Badge>
          )}
        </div>
        {last.inspector_tip && (
          <p className="text-xs text-gray-600 bg-white rounded-lg p-2 border border-gray-100">
            💡 {last.inspector_tip}
          </p>
        )}
      </div>

      {/* Changes since last */}
      {prev && (
        <div className="text-sm text-gray-600 space-y-1">
          <p className="font-semibold text-xs text-gray-500 uppercase tracking-wide">שינויים מהבדיקה הקודמת</p>
          {renderChange('עירוב', last.e_status, prev.e_status, 'תקין')}
          {renderChange('כשרות', last.k_cert, prev.k_cert, 'כן')}
          {!renderChange('עירוב', last.e_status, prev.e_status, 'תקין') &&
           !renderChange('כשרות', last.k_cert, prev.k_cert, 'כן') && (
            <p className="text-xs text-gray-400">אין שינויים מהותיים</p>
          )}
        </div>
      )}

      {/* Mini history */}
      <div className="space-y-1">
        {reports.slice(0, 5).map((r, i) => (
          <div key={r.id || i} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-100 last:border-0">
            <span className="text-gray-500">{r.date}</span>
            <span className="text-gray-700 font-medium">{r.inspector}</span>
            <div className="flex gap-1">
              <span className={r.e_status === 'תקין' ? 'text-green-600' : 'text-red-500'}>
                {r.e_status === 'תקין' ? '✅' : '❌'}
              </span>
              {r.reliability_score && (
                <span className={`font-bold ${r.reliability_score >= 80 ? 'text-green-600' : r.reliability_score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
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
