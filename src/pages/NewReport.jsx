// src/pages/NewReport.jsx
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useInsertReport } from '../hooks/useReports'
import { useGPS } from '../hooks/useGPS'
import { supabase } from '../supabaseClient'
import PageLayout from '../components/layout/PageLayout'
import TabsBar from '../components/ui/TabsBar'
import Tab1_Kashrut from '../components/report/Tab1_Kashrut'
import Tab2_Lounge from '../components/report/Tab2_Lounge'
import Tab3_Synagogue from '../components/report/Tab3_Synagogue'
import Tab4_Spirit from '../components/report/Tab4_Spirit'
import Tab5_Signature from '../components/report/Tab5_Signature'
import Tab6_Deficits from '../components/report/Tab6_Deficits'
import GPSCheckpoint from '../components/report/GPSCheckpoint'
import { BASE_COORDINATES } from '../utils/constants'
import { calculateReliabilityScore } from '../utils/reliabilityScore'
import toast from 'react-hot-toast'

const TABS = [
  { icon: '🥩', label: 'כשרות' },
  { icon: '☕', label: 'טרקלין/ויקוק' },
  { icon: '🕍', label: 'ביה"כ ועירוב' },
  { icon: '📜', label: 'נהלים ורוח' },
  { icon: '✍️', label: 'שיחת חתם' },
  { icon: '⚠️', label: 'סיכום' },
]

export default function NewReport() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const insertReport = useInsertReport()
  const gps = useGPS('new_report_main')
  
  const [activeTab, setActiveTab] = useState(0)
  const [startTime] = useState(Date.now())
  const [tabStartTimes, setTabStartTimes] = useState({})
  const [speedFlags, setSpeedFlags] = useState([])
  const [mandatoryWarnings, setMandatoryWarnings] = useState([])

  const [formData, setFormData] = useState({
    unit: user?.unit || '',
    inspector: user?.displayName || '',
    base: '',
    date: new Date().toISOString().split('T')[0],
  })

  // מעקב זמני מילוי לכל טאב (Speed Check)
  useEffect(() => {
    setTabStartTimes(prev => ({ ...prev, [activeTab]: Date.now() }))
  }, [activeTab])

  // פונקציית העלאת תמונות (מחזירה URL)
  async function uploadPhoto(file, pathSuffix) {
    if (!file) return null;
    const safeName = `report_${Date.now()}_${pathSuffix}.jpg`;
    const { error } = await supabase.storage.from('report-photos').upload(safeName, file);
    if (error) { toast.error('שגיאה בהעלאת תמונה'); return null; }
    const { data } = supabase.storage.from('report-photos').getPublicUrl(safeName);
    return data.publicUrl;
  }

  // פונקציית בדיקות ולידציה לפני שליחה
  function validateForm() {
    const warnings = [];
    const _speedFlags = [];
    const now = Date.now();

    // 1. חובות בסיסיות
    if (!formData.base) warnings.push("חובה להזין שם מוצב");
    if (!gps.hasFix) warnings.push("חובה לאשר מיקום GPS לפני השליחה");

    // 2. חובות שאלון
    if (!formData.k_cert || formData.k_cert.startsWith('לא יודע')) warnings.push("חובה לבדוק תעודת כשרות (טאב כשרות)");
    if (!formData.e_status) warnings.push("חובה לציין סטטוס עירוב (טאב ביה\"כ)");
    if (!formData.r_sg?.includes('כן') && !formData.r_hamal?.includes('כן') && !["חטיבה 35", "חטיבה 89", "חטיבה 900"].includes(user?.unit)) {
       warnings.push("חובה לבדוק נהלים בש.ג או בחמ\"ל");
    }

    // 3. בדיקת "לא יודע" ללא הסבר
    Object.keys(formData).forEach(key => {
      if (typeof formData[key] === 'string' && formData[key] === 'לא יודע / לא בדקתי') {
        warnings.push("חסר הסבר מילולי עבור אחת התשובות של 'לא יודע/לא נבדק'");
      }
    });

    // 4. בדיקת מהירות (Speed Check) מופחתת ביחס לפייתון
    const thresholds = { 0: 15000, 2: 10000 }; // מינימום 15 שניות לכשרות, 10 לבית כנסת
    Object.entries(thresholds).forEach(([tabIdx, minMs]) => {
       const duration = (now - (tabStartTimes[tabIdx] || now));
       if (duration > 0 && duration < minMs) {
          _speedFlags.push(`מילוי מהיר מדי בטאב ${TABS[tabIdx].label}`);
       }
    });

    setMandatoryWarnings(warnings);
    setSpeedFlags(_speedFlags);

    return warnings.length === 0 && _speedFlags.length === 0;
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
        toast.error("לא ניתן לשלוח. אנא תקן את הליקויים האדומים בטופס.");
        return;
    }

    try {
      const finalData = { ...formData };
      
      // העלאת תמונות (אם יש)
      if (finalData.k_issues_photo) finalData.k_issues_photo_url = await uploadPhoto(finalData.k_issues_photo, 'issue');
      if (finalData.k_shabbat_photo) finalData.k_shabbat_photo_url = await uploadPhoto(finalData.k_shabbat_photo, 'shabbat');
      
      // ניקוי אוביקטי קבצים לפני שליחה ל-DB
      delete finalData.k_issues_photo;
      delete finalData.k_shabbat_photo;

      finalData.gps_lat = gps.lat;
      finalData.gps_lon = gps.lon;
      finalData._elapsed_seconds = Math.floor((Date.now() - startTime) / 1000);
      
      // ציון אמינות (מהפונקציה המשותפת)
      const { score } = calculateReliabilityScore(finalData);
      finalData.reliability_score = score;
      finalData.review_status = score < 60 ? 'suspicious' : 'ok';
      
      await insertReport.mutateAsync(finalData);
      toast.success("✅ הדוח נשלח בהצלחה לחמ\"ל!");
      navigate('/');
    } catch (e) {
      toast.error("שגיאה בשמירת הדוח: " + e.message);
    }
  }

  return (
    <PageLayout title="📋 דיווח ביקורת שטח" subtitle={user?.unit}>
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-idf-border overflow-hidden pb-6 mb-20">
        
        {/* אזור בחירת מוצב ומיקום */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
             <div>
                <label className="label">בחר מוצב או מיקום *</label>
                <select className="select-field font-bold text-lg" value={formData.base} onChange={e => setFormData(p => ({...p, base: e.target.value}))}>
                  <option value="" disabled>-- בחר מוצב --</option>
                  {Object.keys(BASE_COORDINATES).map(b => <option key={b} value={b}>{b}</option>)}
                  <option value="אחר">מוצב ארעי (הקלד למטה)</option>
                </select>
             </div>
             <div>
                <label className="label">תאריך ביקורת</label>
                <input type="date" className="input-field" value={formData.date} onChange={e => setFormData(p => ({...p, date: e.target.value}))} />
             </div>
          </div>
          <GPSCheckpoint checkpointNum="ראשי" base={formData.base} onCapture={(pos) => console.log('Captured')} />
        </div>

        {formData.base && (
          <>
            <TabsBar tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
            <div className="p-4 sm:p-6 bg-slate-50/50 min-h-[400px]">
              
              {/* אזהרות לפני שליחה (יוצגו בכל הטאבים אם החייל ניסה לשלוח ונכשל) */}
              {(mandatoryWarnings.length > 0 || speedFlags.length > 0) && (
                 <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-xl">
                    <h4 className="font-bold text-red-800 mb-2">🚨 חובה לתקן לפני שליחה:</h4>
                    <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                       {mandatoryWarnings.map((w,i) => <li key={`w-${i}`}>{w}</li>)}
                       {speedFlags.map((w,i) => <li key={`s-${i}`}>{w}</li>)}
                    </ul>
                 </div>
              )}

              {activeTab === 0 && <Tab1_Kashrut data={formData} onChange={setFormData} />}
              {activeTab === 1 && <Tab2_Lounge data={formData} onChange={setFormData} />}
              {activeTab === 2 && <Tab3_Synagogue data={formData} onChange={setFormData} />}
              {activeTab === 3 && <Tab4_Spirit data={formData} onChange={setFormData} />}
              {activeTab === 4 && <Tab5_Signature data={formData} onChange={setFormData} />}
              {activeTab === 5 && (
                <div className="space-y-6">
                   <Tab6_Deficits data={formData} onChange={setFormData} />
                   
                   <div className="bg-white p-5 rounded-xl border shadow-sm mt-4 text-center">
                      <h3 className="font-bold text-gray-800 mb-2">🚀 מוכן לשליחה?</h3>
                      <p className="text-sm text-gray-500 mb-4">וודא שסיימת לסקור את כל הטאבים.</p>
                      <button 
                        onClick={handleSubmit} 
                        disabled={insertReport.isPending}
                        className="btn-primary w-full md:w-auto px-12 py-4 text-xl shadow-lg"
                      >
                        {insertReport.isPending ? 'משגר דיווח לחמ"ל...' : 'שגר דיווח למערכת!'}
                      </button>
                   </div>
                </div>
              )}
            </div>

            {/* כפתורי ניווט בין טאבים */}
            <div className="flex justify-between items-center px-4 py-3 border-t border-gray-200 bg-white sticky bottom-0">
              <button 
                onClick={() => setActiveTab(t => Math.max(0, t - 1))} 
                disabled={activeTab === 0}
                className="btn-outline text-sm py-2 px-5 disabled:opacity-30">
                הקודם
              </button>
              <span className="text-xs font-bold text-gray-400">{activeTab + 1} / {TABS.length}</span>
              <button 
                onClick={() => setActiveTab(t => Math.min(TABS.length - 1, t + 1))} 
                disabled={activeTab === TABS.length - 1}
                className="bg-idf-blue text-white hover:bg-idf-blueDark text-sm py-2 px-5 rounded-lg font-bold disabled:opacity-30">
                הבא
              </button>
            </div>
          </>
        )}
      </div>
    </PageLayout>
  )
}
