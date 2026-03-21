// src/pages/ExcelExport.jsx — יצוא Excel מלא
import { useState } from 'react'
import { useReports } from '../hooks/useReports'
import { useAuth } from '../context/AuthContext'
import PageLayout from '../components/layout/PageLayout'
import Spinner from '../components/ui/Spinner'
import toast from 'react-hot-toast'

const HEBREW_COLS = {
  date: 'תאריך', base: 'מוצב', unit: 'יחידה', inspector: 'מבקר',
  e_status: 'עירוב', k_cert: 'כשרות', k_bishul: 'בישול ישראל',
  k_issues: 'תקלות כשרות', p_mix: 'ערבוב כלים',
  r_mezuzot_missing: 'מזוזות חסרות', s_clean: 'ביהכ"נ נקי',
  s_gemach: 'גמ"ח', s_havdala: 'ערכת הבדלה',
  soldier_has_lesson: 'שיעור תורה', soldier_want_lesson: 'רצון שיעור',
  hq_shabbat_violation: 'חילול שבת', hq_challot: 'חלות',
  reliability_score: 'ציון אמינות', free_text: 'הערות',
}

function escapeCSV(v) {
  if (v == null) return ''
  const s = String(v)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`
  return s
}

function exportCSV(reports, cols) {
  const header = cols.map(c => HEBREW_COLS[c] || c).join(',')
  const rows = reports.map(r => cols.map(c => escapeCSV(r[c])).join(','))
  const content = '\uFEFF' + [header, ...rows].join('\n') // BOM for Excel Hebrew
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `דוחות_רבנות_${new Date().toLocaleDateString('he-IL').replace(/\//g,'-')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function ExcelExport() {
  const { data: reports = [], isLoading } = useReports()
  const { user } = useAuth()
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedUnit, setSelectedUnit] = useState('')
  const [reportType, setReportType] = useState('full')

  const FULL_COLS = Object.keys(HEBREW_COLS)
  const INSPECTOR_COLS = ['date','base','inspector','reliability_score','e_status','k_cert','k_issues','free_text']
  const SUMMARY_COLS = ['date','base','unit','e_status','k_cert','r_mezuzot_missing','reliability_score']

  const filtered = reports.filter(r => {
    if (dateFrom && r.date < dateFrom) return false
    if (dateTo && r.date > dateTo) return false
    if (selectedUnit && r.unit !== selectedUnit) return false
    return true
  })

  const units = [...new Set(reports.map(r => r.unit).filter(Boolean))]

  function handleExport() {
    if (!filtered.length) { toast.error('אין נתונים לייצוא'); return }
    const cols = reportType === 'inspector' ? INSPECTOR_COLS : reportType === 'summary' ? SUMMARY_COLS : FULL_COLS
    exportCSV(filtered, cols)
    toast.success(`✅ יוצאו ${filtered.length} דוחות`)
  }

  return (
    <PageLayout title="📄 יצוא נתונים" subtitle="Excel / CSV">
      <div className="max-w-xl mx-auto space-y-6">

        {/* Filters */}
        <div className="card space-y-4">
          <h3 className="font-bold text-gray-700">🔧 סינון נתונים</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label text-xs">מתאריך</label><input type="date" className="input-field" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></div>
            <div><label className="label text-xs">עד תאריך</label><input type="date" className="input-field" value={dateTo} onChange={e => setDateTo(e.target.value)} /></div>
          </div>
          <div>
            <label className="label text-xs">יחידה</label>
            <select className="select-field" value={selectedUnit} onChange={e => setSelectedUnit(e.target.value)}>
              <option value="">כל היחידות</option>
              {units.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-sm text-idf-blue font-semibold">
            📊 {filtered.length} דוחות יוצאו
          </div>
        </div>

        {/* Report type */}
        <div className="card space-y-3">
          <h3 className="font-bold text-gray-700">📋 סוג דוח</h3>
          {[
            { id: 'full', label: '📄 דוח מלא', desc: `כל השדות (${FULL_COLS.length} עמודות)` },
            { id: 'summary', label: '📊 סיכום', desc: 'שדות עיקריים בלבד' },
            { id: 'inspector', label: '👤 דוח מבקרים', desc: 'ביצועי מבקרים + ציון אמינות' },
          ].map(t => (
            <label key={t.id} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${reportType === t.id ? 'border-idf-blue bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <input type="radio" name="reportType" value={t.id} checked={reportType === t.id} onChange={e => setReportType(e.target.value)} className="mt-0.5" />
              <div>
                <p className="font-bold text-sm">{t.label}</p>
                <p className="text-xs text-gray-500">{t.desc}</p>
              </div>
            </label>
          ))}
        </div>

        {isLoading ? <Spinner /> : (
          <button onClick={handleExport} className="btn-success w-full py-4 text-lg font-bold rounded-2xl flex items-center justify-center gap-2">
            📥 הורד קובץ CSV (Excel)
          </button>
        )}

        <p className="text-xs text-center text-gray-400">
          הקובץ נשמר ב-CSV עם תמיכה בעברית. פתח עם Excel ובחר קידוד UTF-8.
        </p>
      </div>
    </PageLayout>
  )
}
