// src/components/dashboard/AIBrain.jsx
// מוח פיקודי — AI Decision Brief מבוסס Gemini
// מנתח את כל הדוחות ומוציא תמצית מפקד + המלצות

import { useState, useMemo } from 'react'

// ─── קריאה ל-API ────────────────────────────────────────
async function callGemini(prompt, mode = 'brief') {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode,
      systemPrompt: `אתה קצין רבנות בכיר במערכת רבנות פיקוד מרכז.
תפקידך לנתח דוחות ביקורת שטח ולהפיק תמצית מפקד קצרה וממוקדת בעברית.
השתמש בשפה צבאית-מקצועית. היה תמציתי וחד. הדגש סיכונים ופעולות נדרשות.`,
      messages: [{ role: 'user', content: prompt }]
    })
  })
  if (!res.ok) throw new Error('שגיאה בחיבור לשרת AI')
  const data = await res.json()
  return data.text
}

// ─── בניית פרומפט מהדוחות ────────────────────────────────
function buildBriefPrompt(reports, unit) {
  const total      = reports.length
  const recent     = reports.filter(r => {
    const d = new Date(r.created_at)
    return (Date.now() - d) < 7 * 24 * 60 * 60 * 1000
  })
  const suspicious = reports.filter(r => r.gps_suspicious || r.review_status === 'suspicious')
  const noEruv     = reports.filter(r => r.e_status === 'פסול')
  const noCert     = reports.filter(r => r.k_cert === 'לא')
  const lowScore   = reports.filter(r => (r.reliability_score || 100) < 60)

  const baseStats = {}
  reports.forEach(r => {
    if (!r.base) return
    if (!baseStats[r.base]) baseStats[r.base] = { count: 0, issues: 0, lastDate: null }
    baseStats[r.base].count++
    if (r.e_status === 'פסול' || r.k_cert === 'לא') baseStats[r.base].issues++
    const d = new Date(r.created_at)
    if (!baseStats[r.base].lastDate || d > baseStats[r.base].lastDate) {
      baseStats[r.base].lastDate = d
    }
  })

  // מוצבים שלא דווחו בשבועיים
  const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000
  const stale = Object.entries(baseStats)
    .filter(([, s]) => s.lastDate && s.lastDate < twoWeeksAgo)
    .map(([name]) => name)

  return `
נתוני יחידה: ${unit || 'לא ידוע'}
סה"כ דוחות: ${total} | דוחות השבוע: ${recent.length}
דוחות חשודים: ${suspicious.length} | ציון < 60: ${lowScore.length}
עירוב פסול: ${noEruv.length} מוצבים | ללא תעודת כשרות: ${noCert.length} מוצבים
מוצבים ללא דיווח 2+ שבועות: ${stale.length > 0 ? stale.join(', ') : 'אין'}

מוצבים עם הכי הרבה ליקויים:
${Object.entries(baseStats)
  .sort((a, b) => b[1].issues - a[1].issues)
  .slice(0, 5)
  .map(([name, s]) => `• ${name}: ${s.issues} ליקויים מתוך ${s.count} דוחות`)
  .join('\n')}

בהתבסס על הנתונים האלה, כתוב:
1. **תמצית מצב** — 3-4 משפטים על המצב הכולל
2. **סיכונים מיידיים** — עד 3 נקודות בולטות
3. **המלצות לפעולה** — עד 3 פעולות מסודרות לפי עדיפות
4. **מוצבים לביקורת דחופה** — עד 3 מוצבים עם הסבר קצר

פורמט: כותרות ב-markdown (##), רשימות עם •
`
}

function buildPriorityPrompt(reports) {
  const baseLastVisit = {}
  const baseIssues    = {}
  reports.forEach(r => {
    if (!r.base) return
    const d = new Date(r.created_at)
    if (!baseLastVisit[r.base] || d > baseLastVisit[r.base]) baseLastVisit[r.base] = d
    if (!baseIssues[r.base]) baseIssues[r.base] = 0
    if (r.e_status === 'פסול' || r.k_cert === 'לא' || parseInt(r.r_mezuzot_missing || 0) > 0) {
      baseIssues[r.base]++
    }
  })

  const ranked = Object.keys(baseLastVisit).map(base => ({
    base,
    daysSince: Math.floor((Date.now() - baseLastVisit[base]) / (1000 * 60 * 60 * 24)),
    issues:    baseIssues[base] || 0,
  })).sort((a, b) => (b.daysSince + b.issues * 3) - (a.daysSince + a.issues * 3))

  return `
רשימת מוצבים עם נתוני ביקורת:
${ranked.slice(0, 15).map(r =>
  `• ${r.base}: ${r.daysSince} ימים מאז ביקורת אחרונה, ${r.issues} ליקויים ידועים`
).join('\n')}

דרג את 7 המוצבים הדחופים ביותר לביקורת. לכל מוצב ציין:
- שם המוצב
- ציון דחיפות (1-10)
- סיבה קצרה (משפט אחד)

פורמט: כותרות ב-markdown, רשימה ממוספרת
`
}

// ─── פרסור Markdown פשוט ─────────────────────────────────
function MarkdownText({ text }) {
  if (!text) return null
  const lines = text.split('\n')
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith('## ')) {
          return <h3 key={i} className="font-bold text-idf-blue dark:text-dark-blue text-base mt-4 mb-1 border-r-4 border-idf-blue pr-2">{line.slice(3)}</h3>
        }
        if (line.startsWith('**') && line.endsWith('**')) {
          return <p key={i} className="font-bold text-gray-800 dark:text-dark-text">{line.slice(2, -2)}</p>
        }
        if (line.startsWith('• ') || line.startsWith('- ') || line.match(/^\d+\./)) {
          return <p key={i} className="flex gap-2 text-gray-700 dark:text-dark-text pr-2">
            <span className="shrink-0 text-idf-blue">▪</span>
            <span dangerouslySetInnerHTML={{ __html: line.replace(/^[•\-\d\.]\s*/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
          </p>
        }
        if (line.trim() === '') return <div key={i} className="h-1" />
        return <p key={i} className="text-gray-700 dark:text-dark-text" dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
      })}
    </div>
  )
}

// ─── קומפוננטה ראשית ──────────────────────────────────────
export default function AIBrain({ reports = [], unit }) {
  const [mode, setMode]       = useState(null) // null | 'brief' | 'priority' | 'risk'
  const [result, setResult]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [lastMode, setLastMode] = useState(null)

  const recentReports = useMemo(() =>
    reports.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 50),
    [reports]
  )

  async function run(selectedMode) {
    setMode(selectedMode)
    setLastMode(selectedMode)
    setLoading(true)
    setError(null)
    setResult('')
    try {
      let prompt = ''
      if (selectedMode === 'brief')    prompt = buildBriefPrompt(recentReports, unit)
      if (selectedMode === 'priority') prompt = buildPriorityPrompt(recentReports)
      if (selectedMode === 'risk')     prompt = buildBriefPrompt(recentReports, unit) + '\n\nהתמקד בעיקר בזיהוי דפוסי זיוף, ליקויים חוזרים ומוצבים בסיכון גבוה.'
      const text = await callGemini(prompt, 'brief')
      setResult(text)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const actions = [
    { id: 'brief',    icon: '📋', label: 'תמצית מפקד',        desc: 'סיכום מצב + סיכונים + המלצות' },
    { id: 'priority', icon: '🎯', label: 'סדר עדיפויות',       desc: 'דירוג מוצבים לביקורת דחופה' },
    { id: 'risk',     icon: '🚨', label: 'זיהוי סיכונים',      desc: 'דפוסי זיוף + ליקויים חוזרים' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-l from-idf-blueDark to-idf-blue text-white p-6 rounded-2xl">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">🧠</span>
          <div>
            <h2 className="text-2xl font-extrabold">מוח פיקודי</h2>
            <p className="text-blue-200 text-sm">AI Decision Brief — מבוסס {reports.length} דוחות</p>
          </div>
        </div>
      </div>

      {/* כפתורי פעולה */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {actions.map(a => (
          <button
            key={a.id}
            onClick={() => run(a.id)}
            disabled={loading}
            className={`p-4 rounded-xl border-2 text-right transition-all hover:shadow-md active:scale-98 disabled:opacity-60
              ${lastMode === a.id && result
                ? 'border-idf-blue bg-blue-50 dark:bg-dark-surface2 dark:border-dark-blue'
                : 'border-gray-200 bg-white dark:bg-dark-surface dark:border-dark-border hover:border-idf-blue'}`}
          >
            <div className="text-2xl mb-1">{a.icon}</div>
            <div className="font-bold text-gray-800 dark:text-dark-text text-sm">{a.label}</div>
            <div className="text-xs text-gray-500 dark:text-dark-muted mt-0.5">{a.desc}</div>
          </button>
        ))}
      </div>

      {/* תוצאה */}
      {loading && (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4 animate-pulse">🧠</div>
          <p className="text-gray-500 font-semibold">מנתח נתונים...</p>
          <p className="text-xs text-gray-400 mt-1">Gemini מעבד {recentReports.length} דוחות</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-xl p-4 text-red-700 dark:text-red-400 text-sm font-semibold">
          ❌ {error}
        </div>
      )}

      {result && !loading && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-gray-400 dark:text-dark-muted">
              {new Date().toLocaleTimeString('he-IL')} · Gemini 1.5 Flash
            </span>
            <button
              onClick={() => run(lastMode)}
              className="text-xs text-idf-blue dark:text-dark-blue hover:underline font-semibold"
            >
              🔄 רענן
            </button>
          </div>
          <MarkdownText text={result} />
        </div>
      )}

      {!loading && !result && !error && (
        <div className="card text-center py-12 border-2 border-dashed border-gray-200 dark:border-dark-border">
          <span className="text-5xl mb-3 block">🧠</span>
          <p className="text-gray-500 dark:text-dark-muted font-semibold">בחר פעולה כדי להפעיל את המוח הפיקודי</p>
          <p className="text-xs text-gray-400 dark:text-dark-muted mt-1">מנתח {reports.length} דוחות בזמן אמת</p>
        </div>
      )}
    </div>
  )
}
