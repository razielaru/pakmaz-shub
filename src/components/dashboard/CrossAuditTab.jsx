// src/components/dashboard/CrossAuditTab.jsx
// ביקורת צולבת — משווה שני מבקרים שבדקו את אותו מוצב
import { useMemo, useState } from 'react'

const FIELDS = [
  { key: 'e_status',           label: 'עירוב',            crit: true  },
  { key: 'k_cert',             label: 'תעודת כשרות',      crit: true  },
  { key: 'k_bishul',           label: 'בישול גויים',      crit: false },
  { key: 'r_mezuzot_missing',  label: 'מזוזות חסרות',     crit: true  },
  { key: 'p_mix',              label: 'ערבוב בשר/חלב',    crit: true  },
  { key: 's_clean',            label: 'ניקיון',            crit: false },
  { key: 'r_sg',               label: 'ס"ג',               crit: false },
]

// חישוב ציון השוואה: כמה שדות שונים בין שני הדוחות
function comparePair(r1, r2) {
  let diverge = 0; let critDiverge = 0
  const details = FIELDS.map(f => {
    const v1 = String(r1[f.key] ?? '—'); const v2 = String(r2[f.key] ?? '—')
    const diff = v1 !== v2
    if (diff) { diverge++; if (f.crit) critDiverge++ }
    return { ...f, v1, v2, diff }
  })
  const suspectInspector = (() => {
    // מי שמצא פחות ליקויים הוא החשוד
    const issues1 = details.filter(d => d.diff && (d.v1 === 'לא' || d.v1 === 'פסול' || parseInt(d.v1) > 0)).length
    const issues2 = details.filter(d => d.diff && (d.v2 === 'לא' || d.v2 === 'פסול' || parseInt(d.v2) > 0)).length
    if (diverge === 0) return null
    return issues1 < issues2 ? r1.inspector : r2.inspector
  })()
  return { diverge, critDiverge, details, suspectInspector }
}

export default function CrossAuditTab({ reports }) {
  const [minDays, setMinDays] = useState(30)
  const [sortBy, setSortBy]   = useState('critDiverge')

  // מציאת זוגות: אותו בסיס, מבקרים שונים, בטווח זמן
  const pairs = useMemo(() => {
    const byBase = {}
    reports.forEach(r => {
      if (!r.base || !r.inspector || !r.date) return
      ;(byBase[r.base] = byBase[r.base] || []).push(r)
    })

    const result = []
    Object.entries(byBase).forEach(([base, reps]) => {
      // ממיין לפי תאריך
      const sorted = [...reps].sort((a, b) => a.date.localeCompare(b.date))
      // בוחר זוגות של מבקרים שונים
      for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
          const r1 = sorted[i]; const r2 = sorted[j]
          if (r1.inspector === r2.inspector) continue
          const daysDiff = Math.abs(
            (new Date(r2.date) - new Date(r1.date)) / (1000 * 60 * 60 * 24)
          )
          if (daysDiff > minDays) continue
          const cmp = comparePair(r1, r2)
          result.push({ base, r1, r2, daysDiff: Math.round(daysDiff), ...cmp })
        }
      }
    })

    return result.sort((a, b) => b[sortBy] - a[sortBy])
  }, [reports, minDays, sortBy])

  const redPairs    = pairs.filter(p => p.critDiverge >= 2)
  const yellowPairs = pairs.filter(p => p.critDiverge === 1)
  const greenPairs  = pairs.filter(p => p.diverge === 0)

  return (
    <div className="space-y-5 animate-fade-in">

      {/* הסבר */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-xl flex items-start gap-3">
        <span className="text-2xl mt-0.5">🔬</span>
        <div>
          <h4 className="font-bold text-blue-900 dark:text-blue-300">ביקורת צולבת — גלאי אמינות אובייקטיבי</h4>
          <p className="text-sm text-blue-800 dark:text-blue-400 mt-1">
            מציג זוגות מבקרים שבדקו את <strong>אותו מוצב</strong> בטווח הזמן הנבחר.
            פערים גדולים בין מבקרים על אותו מוצב — מדד האמינות הכי חזק שיש.
          </p>
        </div>
      </div>

      {/* סיכום */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center border-red-200 bg-red-50 dark:bg-red-900/20">
          <p className="text-2xl font-extrabold text-red-600">{redPairs.length}</p>
          <p className="text-xs text-red-700 dark:text-red-400 font-semibold mt-0.5">🚨 פערים קריטיים</p>
        </div>
        <div className="card text-center border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
          <p className="text-2xl font-extrabold text-yellow-600">{yellowPairs.length}</p>
          <p className="text-xs text-yellow-700 dark:text-yellow-400 font-semibold mt-0.5">⚠️ פער אחד</p>
        </div>
        <div className="card text-center border-green-200 bg-green-50 dark:bg-green-900/20">
          <p className="text-2xl font-extrabold text-green-600">{greenPairs.length}</p>
          <p className="text-xs text-green-700 dark:text-green-400 font-semibold mt-0.5">✅ תואמים</p>
        </div>
      </div>

      {/* פקדי סינון */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 text-sm">
          <label className="label mb-0 whitespace-nowrap">טווח ימים מקסימלי:</label>
          <select value={minDays} onChange={e => setMinDays(Number(e.target.value))} className="select-field w-auto text-sm py-1">
            <option value={7}>שבוע</option>
            <option value={30}>חודש</option>
            <option value={90}>רבעון</option>
            <option value={365}>שנה</option>
          </select>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <label className="label mb-0 whitespace-nowrap">מיון לפי:</label>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="select-field w-auto text-sm py-1">
            <option value="critDiverge">פערים קריטיים</option>
            <option value="diverge">סך פערים</option>
            <option value="daysDiff">קרבת תאריכים</option>
          </select>
        </div>
      </div>

      {/* רשימת זוגות */}
      {pairs.length === 0 ? (
        <div className="card text-center py-12 text-gray-400 font-bold">
          אין זוגות ביקורת צולבת בטווח הזה
        </div>
      ) : (
        <div className="space-y-3">
          {pairs.map((p, idx) => (
            <PairCard key={idx} pair={p} />
          ))}
        </div>
      )}
    </div>
  )
}

function PairCard({ pair }) {
  const [open, setOpen] = useState(false)

  const bgClass = pair.critDiverge >= 2
    ? 'border-red-300 bg-red-50/50 dark:bg-red-900/10'
    : pair.critDiverge === 1
    ? 'border-yellow-300 bg-yellow-50/50 dark:bg-yellow-900/10'
    : 'border-green-200 bg-green-50/30 dark:bg-green-900/10'

  const badge = pair.critDiverge >= 2
    ? { text: '🚨 פערים קריטיים', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' }
    : pair.critDiverge === 1
    ? { text: '⚠️ פער אחד', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' }
    : { text: '✅ תואמים', cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' }

  return (
    <div className={`rounded-xl border-2 overflow-hidden transition-all ${bgClass}`}>
      {/* כותרת */}
      <button
        className="w-full flex items-center justify-between p-4 text-right hover:opacity-90 transition-opacity"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-extrabold text-gray-800 dark:text-dark-text text-base">{pair.base}</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.text}</span>
          {pair.suspectInspector && (
            <span className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full">
              🚩 חשוד: {pair.suspectInspector}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500 shrink-0">
          <span>{pair.r1.date} vs {pair.r2.date}</span>
          <span className="font-bold">{pair.daysDiff} ימים</span>
          <span className={`text-base transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
        </div>
      </button>

      {/* פרטים */}
      {open && (
        <div className="px-4 pb-4 animate-fade-in">
          {/* מבקרים */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-white dark:bg-dark-surface rounded-lg p-3 border border-gray-100 dark:border-dark-border text-center">
              <p className="text-xs text-gray-400 mb-1">מבקר א׳</p>
              <p className="font-bold text-gray-800 dark:text-dark-text">{pair.r1.inspector}</p>
              <p className="text-xs text-gray-400">{pair.r1.date}</p>
            </div>
            <div className="bg-white dark:bg-dark-surface rounded-lg p-3 border border-gray-100 dark:border-dark-border text-center">
              <p className="text-xs text-gray-400 mb-1">מבקר ב׳</p>
              <p className="font-bold text-gray-800 dark:text-dark-text">{pair.r2.inspector}</p>
              <p className="text-xs text-gray-400">{pair.r2.date}</p>
            </div>
          </div>

          {/* טבלת השוואה */}
          <table className="w-full text-sm text-right">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100 dark:border-dark-border">
                <th className="pb-1 font-semibold">שדה</th>
                <th className="pb-1 font-semibold text-center">{pair.r1.inspector}</th>
                <th className="pb-1 font-semibold text-center">{pair.r2.inspector}</th>
                <th className="pb-1 font-semibold text-center">פער</th>
              </tr>
            </thead>
            <tbody>
              {pair.details.map(d => (
                <tr key={d.key} className={`border-b border-gray-50 dark:border-dark-border ${d.diff ? (d.crit ? 'bg-red-50/60 dark:bg-red-900/10' : 'bg-yellow-50/60 dark:bg-yellow-900/10') : ''}`}>
                  <td className={`py-1.5 font-semibold text-xs ${d.crit ? 'text-gray-800 dark:text-dark-text' : 'text-gray-500 dark:text-dark-muted'}`}>
                    {d.crit && '⚡ '}{d.label}
                  </td>
                  <td className="py-1.5 text-center text-xs font-mono">{d.v1}</td>
                  <td className="py-1.5 text-center text-xs font-mono">{d.v2}</td>
                  <td className="py-1.5 text-center">
                    {d.diff
                      ? <span className={`text-xs font-bold ${d.crit ? 'text-red-600' : 'text-yellow-600'}`}>{d.crit ? '🚨' : '⚠️'}</span>
                      : <span className="text-green-500 text-xs">✓</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
