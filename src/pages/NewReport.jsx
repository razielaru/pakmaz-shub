import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useInsertReport } from '../hooks/useReports'
import { supabase } from '../supabaseClient'
import { BASE_COORDINATES } from '../utils/constants'
import { calculateReliabilityScore } from '../utils/reliabilityScore'
import { sendEmailAlert } from '../utils/alerts'
import PageLayout from '../components/layout/PageLayout'
import TabsBar from '../components/ui/TabsBar'
import ContinuityQuestions from '../components/report/ContinuityQuestions'
import BaseHistoryCard from '../components/report/BaseHistoryCard'
import Tab1_Kashrut from '../components/report/Tab1_Kashrut'
import Tab2_Lounge from '../components/report/Tab2_Lounge'
import Tab3_Synagogue from '../components/report/Tab3_Synagogue'
import Tab4_Spirit from '../components/report/Tab4_Spirit'
import Tab5_Signature from '../components/report/Tab5_Signature'
import Tab6_Deficits from '../components/report/Tab6_Deficits'
import toast from 'react-hot-toast'

const TABS = [
  { icon: '🥩', label: 'כשרות' },
  { icon: '☕', label: 'טרקלין/וויקוק' },
  { icon: '🕍', label: 'בית כנסת' },
  { icon: '💎', label: 'נהלים ורוח' },
  { icon: '✍️', label: 'חתם' },
  { icon: '⚠️', label: 'שליחה' },
]

const BASE_NAMES = Object.keys(BASE_COORDINATES)

export default function NewReport() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const insertReport = useInsertReport()
  const startTime = useRef(Date.now())
  const [activeTab, setActiveTab] = useState(0)
  const [continuityAnswers, setContinuityAnswers] = useState({})
  const [formData, setFormData] = useState({
    unit: user?.unit || '',
    inspector: '',
    base: '',
    date: new Date().toISOString().split('T')[0],
  })

  // Load barcode from DB if available
  async function loadBarcodeForBase(baseName) {
    try {
      const { data } = await supabase.from('base_barcodes').select('barcode').eq('unit', user.unit).eq('base_name', baseName).single()
      if (data?.barcode) setFormData(f => ({ ...f, base_barcode: data.barcode }))
    } catch {}
  }

  function handleBaseChange(base) {
    setFormData(f => ({ ...f, base }))
    if (base) loadBarcodeForBase(base)
  }

  async function handleSubmit() {
    const elapsed = Math.round((Date.now() - startTime.current) / 1000)
    const { score } = calculateReliabilityScore({ ...formData, _elapsed_seconds: elapsed })

    const reportData = {
      ...formData,
      reliability_score: score,
      _elapsed_seconds: elapsed,
      continuity_answers: continuityAnswers,
      created_at: new Date().toISOString(),
    }

    try {
      await insertReport.mutateAsync(reportData)

      // Log audit
      await supabase.from('audit_logs').insert({
        action: 'report_submitted',
        target: formData.base,
        details: { unit: user.unit, score },
        severity: 'info',
      }).catch(() => {})

      // Send alerts if needed
      await sendEmailAlert(formData, user.unit)

      toast.success('✅ הדוח נשלח בהצלחה!')
      navigate('/')
    } catch (err) {
      toast.error('שגיאה בשליחת הדוח: ' + err.message)
    }
  }

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="card mb-4">
          <h1 className="text-xl font-extrabold text-idf-blue mb-4">📝 דוח פיקוד חדש</h1>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="label"><span className="text-red-500">*</span> מוצב</label>
              <select value={formData.base} onChange={e => handleBaseChange(e.target.value)} className="select-field" required>
                <option value="">— בחר מוצב —</option>
                {BASE_NAMES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="label"><span className="text-red-500">*</span> שם מבקר</label>
              <input type="text" value={formData.inspector} onChange={e => setFormData(f => ({ ...f, inspector: e.target.value }))}
                className="input-field" placeholder="שם מלא..." required />
            </div>
            <div>
              <label className="label">תאריך</label>
              <input type="date" value={formData.date} onChange={e => setFormData(f => ({ ...f, date: e.target.value }))}
                className="input-field" />
            </div>
          </div>
        </div>

        {/* History + Continuity */}
        {formData.base && (
          <div className="mb-4 space-y-3">
            <ContinuityQuestions base={formData.base} unit={user.unit} onChange={setContinuityAnswers} />
            <BaseHistoryCard base={formData.base} unit={user.unit} />
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-idf-border overflow-hidden">
          <TabsBar tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
          <div className="p-4">
            {activeTab === 0 && <Tab1_Kashrut data={formData} onChange={setFormData} unit={user.unit} />}
            {activeTab === 1 && <Tab2_Lounge data={formData} onChange={setFormData} />}
            {activeTab === 2 && <Tab3_Synagogue data={formData} onChange={setFormData} />}
            {activeTab === 3 && <Tab4_Spirit data={formData} onChange={setFormData} />}
            {activeTab === 4 && <Tab5_Signature data={formData} onChange={setFormData} />}
            {activeTab === 5 && (
              <Tab6_Deficits
                data={formData}
                onChange={setFormData}
                onSubmit={handleSubmit}
                isSubmitting={insertReport.isPending}
              />
            )}
          </div>

          {/* Tab navigation buttons */}
          <div className="flex justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <button onClick={() => setActiveTab(t => Math.max(0, t - 1))} disabled={activeTab === 0}
              className="btn-outline text-sm py-1.5 px-4 disabled:opacity-30">
              ← הקודם
            </button>
            <span className="text-xs text-gray-400 self-center">{activeTab + 1} / {TABS.length}</span>
            <button onClick={() => setActiveTab(t => Math.min(TABS.length - 1, t + 1))} disabled={activeTab === TABS.length - 1}
              className="btn-primary text-sm py-1.5 px-4 disabled:opacity-30">
              הבא →
            </button>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
