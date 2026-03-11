import { useState, useMemo } from 'react'
import { BASE_COORDINATES } from '../utils/constants'
import PageLayout from '../components/layout/PageLayout'
import { useAuth } from '../context/AuthContext'

function getShabbatStatus(reports, base) {
  const r = [...reports].filter(x => x.base === base).sort((a, b) => new Date(b.date) - new Date(a.date))[0]
  if (!r) return null
  return {
    eruv: r.e_status,
    kashrut: r.k_cert,
    mezuzot: r.r_mezuzot_missing,
    lastDate: r.date,
    inspector: r.inspector,
  }
}

export default function ShabbatPrep({ reports, unit, embedded }) {
  const { user } = useAuth()
  const activeUnit = unit || user?.unit
  const [showWhatsapp, setShowWhatsapp] = useState(false)

  const bases = useMemo(() => Object.keys(BASE_COORDINATES), [])
  const statusList = useMemo(() => bases.map(b => ({ base: b, status: getShabbatStatus(reports || [], b) })).filter(x => x.status), [bases, reports])

  const criticalBases = statusList.filter(x => x.status.eruv === 'פסול' || x.status.kashrut === 'לא')
  const okBases = statusList.filter(x => x.status.eruv === 'תקין' && x.status.kashrut === 'כן')

  function buildWhatsappMessage() {
    const now = new Date().toLocaleDateString('he-IL')
    let msg = `🕯️ *סיכום הכנה לשבת — ${activeUnit}*\n📅 ${now}\n\n`
    if (criticalBases.length > 0) {
      msg += `🚨 *דורשים טיפול דחוף:*\n`
      criticalBases.forEach(({ base, status }) => {
        const issues = []
        if (status.eruv === 'פסול') issues.push('עירוב פסול')
        if (status.kashrut === 'לא') issues.push('כשרות חסרה')
        msg += `• ${base}: ${issues.join(', ')}\n`
      })
      msg += '\n'
    }
    msg += `✅ *מוצבים תקינים (${okBases.length}):*\n`
    okBases.forEach(({ base }) => { msg += `• ${base}\n` })
    msg += `\n✡️ שבת שלום!`
    return encodeURIComponent(msg)
  }

  const content = (
    <div className="space-y-6">
      <div className="section-title">🕯️ הכנה לשבת</div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card border-2 border-green-200 bg-green-50 text-center">
          <p className="text-3xl font-extrabold text-green-700">{okBases.length}</p>
          <p className="text-sm text-green-600 mt-1">✅ מוצבים תקינים</p>
        </div>
        <div className={`card border-2 text-center ${criticalBases.length > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
          <p className={`text-3xl font-extrabold ${criticalBases.length > 0 ? 'text-red-700' : 'text-green-700'}`}>{criticalBases.length}</p>
          <p className={`text-sm mt-1 ${criticalBases.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {criticalBases.length > 0 ? '🚨 דורשים טיפול' : '✅ הכל תקין'}
          </p>
        </div>
      </div>

      {/* Critical */}
      {criticalBases.length > 0 && (
        <div className="card border-2 border-red-300 bg-red-50 space-y-3">
          <h3 className="font-bold text-red-800">🚨 דורשים טיפול לפני שבת</h3>
          {criticalBases.map(({ base, status }) => (
            <div key={base} className="bg-white rounded-xl p-3 border border-red-200">
              <p className="font-bold text-red-800">{base}</p>
              <div className="flex gap-2 mt-1 flex-wrap">
                {status.eruv === 'פסול' && <span className="status-fail">🔴 עירוב פסול</span>}
                {status.kashrut === 'לא' && <span className="status-fail">📋 כשרות חסרה</span>}
              </div>
              <p className="text-xs text-gray-400 mt-1">בדיקה אחרונה: {status.lastDate}</p>
            </div>
          ))}
        </div>
      )}

      {/* OK list */}
      <div className="card space-y-2">
        <h3 className="font-bold text-green-700 mb-2">✅ מוצבים מוכנים לשבת</h3>
        {okBases.map(({ base, status }) => (
          <div key={base} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0 text-sm">
            <span className="font-medium">{base}</span>
            <div className="flex gap-2">
              <span className="status-ok">עירוב ✓</span>
              <span className="status-ok">כשרות ✓</span>
            </div>
          </div>
        ))}
      </div>

      {/* WhatsApp */}
      <button
        onClick={() => setShowWhatsapp(true)}
        className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold flex items-center justify-center gap-2 transition-all"
      >
        📲 שלח סיכום ב-WhatsApp
      </button>

      {showWhatsapp && (
        <div className="card border-2 border-green-300 space-y-3">
          <h3 className="font-bold text-green-700">📲 שליחת הודעה</h3>
          <p className="text-sm text-gray-600">לחץ על הכפתור לשלוח את הסיכום ב-WhatsApp:</p>
          <a
            href={`https://wa.me/?text=${buildWhatsappMessage()}`}
            target="_blank"
            rel="noreferrer"
            className="btn-success w-full text-center block py-3 rounded-xl"
          >
            📱 פתח WhatsApp
          </a>
          <button onClick={() => setShowWhatsapp(false)} className="text-xs text-gray-400 hover:text-gray-600 w-full text-center">סגור</button>
        </div>
      )}
    </div>
  )

  if (embedded) return content
  return <PageLayout title="🕯️ הכנה לשבת">{content}</PageLayout>
}
