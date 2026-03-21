import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useDeficits, useCloseDeficit } from '../hooks/useDeficits'
import PageLayout from '../components/layout/PageLayout'
import Badge from '../components/ui/Badge'
import ConfirmModal from '../components/ui/ConfirmModal'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import toast from 'react-hot-toast'

const DEFICIT_TYPES = {
  eruv_fail: { label: 'עירוב פסול', icon: '🔴', severity: 'error' },
  kashrut_missing: { label: 'כשרות חסרה', icon: '📋', severity: 'error' },
  mezuzot: { label: 'מזוזות חסרות', icon: '📜', severity: 'warning' },
  mix_vessels: { label: 'ערבוב כלים', icon: '⚠️', severity: 'warning' },
  kashrut_issue: { label: 'תקלת כשרות', icon: '🔶', severity: 'warning' },
}

export default function DeficitTracker() {
  const { user, canAccess } = useAuth()
  const { data: deficits = [], isLoading } = useDeficits()
  const closeDeficit = useCloseDeficit()
  const [selected, setSelected] = useState(null)
  const [closeNotes, setCloseNotes] = useState('')
  const [filterUnit, setFilterUnit] = useState('')

  const filtered = filterUnit ? deficits.filter(d => d.unit === filterUnit) : deficits
  const units = [...new Set(deficits.map(d => d.unit))]

  async function handleClose() {
    try {
      await closeDeficit.mutateAsync({ id: selected.id, notes: closeNotes })
      toast.success('✅ ליקוי סומן כסגור!')
      setSelected(null)
      setCloseNotes('')
    } catch (e) {
      toast.error('שגיאה: ' + e.message)
    }
  }

  return (
    <PageLayout title="⚠️ מעקב ליקויים" subtitle="ליקויים פתוחים הדורשים טיפול">
      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <>
          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'ליקויים פתוחים', value: deficits.length, color: 'bg-red-50 border-red-200', text: 'text-red-700' },
              { label: 'קריטיים', value: deficits.filter(d => d.severity === 'critical').length, color: 'bg-red-100 border-red-300', text: 'text-red-800' },
              { label: 'אזהרות', value: deficits.filter(d => d.severity === 'warning').length, color: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
              { label: 'יחידות מושפעות', value: units.length, color: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
            ].map((s, i) => (
              <div key={i} className={`card border-2 ${s.color} text-center py-3`}>
                <p className={`text-3xl font-extrabold ${s.text}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Filter */}
          {canAccess('gdud') && units.length > 1 && (
            <div className="mb-4">
              <select value={filterUnit} onChange={e => setFilterUnit(e.target.value)} className="select-field max-w-xs">
                <option value="">כל היחידות</option>
                {units.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          )}

          {/* List */}
          {filtered.length === 0 ? (
            <EmptyState
              icon="✅"
              title="אין ליקויים פתוחים"
              description="נכון לעכשיו כל המוצבים שבטווח שלך מסומנים ללא ליקויים פתוחים."
            />
          ) : (
            <div className="space-y-3">
              {filtered.map(d => {
                const typeConfig = DEFICIT_TYPES[d.type] || { label: d.type, icon: '⚠️', severity: 'warning' }
                const daysSince = Math.floor((Date.now() - new Date(d.created_at)) / 86400000)
                return (
                  <div key={d.id} className={`card border-2 ${typeConfig.severity === 'error' ? 'border-red-200' : 'border-amber-200'} hover:shadow-md transition-all`}>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl mt-0.5">{typeConfig.icon}</span>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-gray-800">{typeConfig.label}</h3>
                            <Badge type={typeConfig.severity === 'error' ? 'error' : 'warning'}>קריטי</Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            📍 <strong>{d.base}</strong> · 🏢 {d.unit}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            נפתח: {new Date(d.created_at).toLocaleDateString('he-IL')} · לפני {daysSince} ימים
                          </p>
                          {d.description && (
                            <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2 mt-2">{d.description}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => setSelected(d)}
                        className="btn-success text-sm py-1.5 px-4 shrink-0"
                      >
                        ✅ סגור ליקוי
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Close modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md animate-slide-up">
            <h3 className="text-xl font-bold text-gray-800 mb-1">סגירת ליקוי</h3>
            <p className="text-sm text-gray-500 mb-4">{selected.base} — {DEFICIT_TYPES[selected.type]?.label}</p>
            <label className="label">הערות לסגירה</label>
            <textarea
              value={closeNotes}
              onChange={e => setCloseNotes(e.target.value)}
              className="input-field min-h-[80px] resize-none mb-4"
              placeholder="תאר כיצד הליקוי תוקן..."
            />
            <div className="flex gap-3">
              <button onClick={() => setSelected(null)} className="btn-outline flex-1">ביטול</button>
              <button onClick={handleClose} disabled={closeDeficit.isPending} className="btn-success flex-1">
                {closeDeficit.isPending ? '⏳ שומר...' : '✅ אשר סגירה'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  )
}
