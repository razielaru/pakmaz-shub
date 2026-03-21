// src/components/dashboard/BaseStatusBoard.jsx
import { useMemo, useState } from 'react'
import Badge from '../ui/Badge'
import BaseHistoryModal from './BaseHistoryModal'

function getBaseStatus(reports, baseName) {
  const baseReports = reports.filter(r => r.base === baseName).sort((a, b) => new Date(b.date) - new Date(a.date))
  const last = baseReports[0]
  if (!last) return { status: 'unknown', last: null }
  const daysSince = Math.floor((Date.now() - new Date(last.date)) / 86400000)
  let status = 'ok'
  if (last.e_status === 'פסול' || last.k_cert === 'לא') status = 'critical'
  else if (parseInt(last.r_mezuzot_missing || 0) >= 5 || last.p_mix === 'כן') status = 'warning'
  else if (daysSince > 30) status = 'stale'
  return { status, last, daysSince, count: baseReports.length }
}

const STATUS_CONFIG = {
  ok:       { color: 'bg-green-100 border-green-300', dot: 'bg-green-500',          label: 'תקין',    badgeType: 'success' },
  warning:  { color: 'bg-amber-100 border-amber-300', dot: 'bg-amber-500',           label: 'בעיה',    badgeType: 'warning' },
  critical: { color: 'bg-red-100   border-red-300',   dot: 'bg-red-500 animate-pulse',label: 'קריטי',  badgeType: 'error'   },
  stale:    { color: 'bg-gray-100  border-gray-300',  dot: 'bg-gray-400',            label: 'ישן',     badgeType: 'default' },
  unknown:  { color: 'bg-gray-50   border-gray-200',  dot: 'bg-gray-300',            label: 'לא ידוע', badgeType: 'default' },
}

export default function BaseStatusBoard({ reports, unit }) {
  const [historyBase, setHistoryBase] = useState(null)

  const bases = useMemo(() => {
    const seen = new Set()
    return reports
      .filter(r => { if (seen.has(r.base)) return false; seen.add(r.base); return true })
      .map(r => r.base)
  }, [reports])

  if (!bases.length) return (
    <div className="card text-center py-10 text-gray-400">
      <p className="text-4xl mb-3">🗺️</p>
      <p>אין מוצבים עם דוחות עדיין</p>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">🗺️ סטטוס מוצבים</h2>
        <div className="flex gap-2 text-xs">
          {Object.entries(STATUS_CONFIG).slice(0, 3).map(([k, v]) => (
            <span key={k} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${v.dot}`} />
              {v.label}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {bases.map(base => {
          const { status, last, daysSince, count } = getBaseStatus(reports, base)
          const cfg = STATUS_CONFIG[status]
          return (
            <div key={base} className={`rounded-xl border-2 p-4 transition-all hover:shadow-md ${cfg.color}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${cfg.dot} shrink-0 mt-0.5`} />
                  <h3 className="font-bold text-sm text-gray-800">{base}</h3>
                </div>
                <div className="flex items-center gap-1">
                  <Badge type={cfg.badgeType} size="xs">{cfg.label}</Badge>
                  {/* ─── כפתור היסטוריה ─── */}
                  {count > 1 && (
                    <button
                      onClick={() => setHistoryBase(base)}
                      title="גרף מגמה היסטורי"
                      className="text-xs bg-idf-blue/10 hover:bg-idf-blue/20 text-idf-blue font-bold px-1.5 py-0.5 rounded-lg transition-colors"
                    >
                      📈
                    </button>
                  )}
                </div>
              </div>

              {last ? (
                <div className="space-y-1 text-xs text-gray-600">
                  <p>📅 {last.date} · {daysSince} ימים · {count} ביקורות</p>
                  <p>👤 {last.inspector}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {last.e_status && (
                      <Badge type={last.e_status === 'תקין' ? 'success' : 'error'} size="xs">
                        עירוב: {last.e_status}
                      </Badge>
                    )}
                    {last.k_cert && (
                      <Badge type={last.k_cert === 'כן' ? 'success' : 'error'} size="xs">
                        כשרות: {last.k_cert === 'כן' ? '✓' : '✗'}
                      </Badge>
                    )}
                    {last.reliability_score && (
                      <Badge type={last.reliability_score >= 80 ? 'success' : last.reliability_score >= 60 ? 'warning' : 'error'} size="xs">
                        🎯 {last.reliability_score}
                      </Badge>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400 mt-2">אין בדיקות קודמות</p>
              )}
            </div>
          )
        })}
      </div>

      {/* מודאל היסטוריה */}
      {historyBase && (
        <BaseHistoryModal base={historyBase} onClose={() => setHistoryBase(null)} />
      )}
    </div>
  )
}
