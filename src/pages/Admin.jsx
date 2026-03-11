// src/pages/Admin.jsx
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'
import PageLayout from '../components/layout/PageLayout'
import TabsBar from '../components/ui/TabsBar'
import toast from 'react-hot-toast'
import { ALL_UNITS } from '../utils/constants'
import BarcodeManager from '../components/admin/BarcodeManager'

const ADMIN_TABS = [
  { icon: '🔑', label: 'ניהול סיסמאות' },
  { icon: '🖼️', label: 'לוגואים ליחידות' },
  { icon: '📱', label: 'ניהול ברקודים' },
]

export default function Admin() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState(0)

  // -- משתני סטייט לסיסמאות --
  const [selectedUnitPwd, setSelectedUnitPwd] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loadingPwd, setLoadingPwd] = useState(false)

  // -- משתני סטייט ללוגואים --
  const [selectedLogoUnit, setSelectedLogoUnit] = useState('')
  const [logoFile, setLogoFile] = useState(null)
  const [loadingLogo, setLoadingLogo] = useState(false)

  // פונקציית החלפת סיסמה
  async function handlePasswordUpdate(e) {
    e.preventDefault()
    if (!selectedUnitPwd || newPassword.length < 4) {
      toast.error('בחר יחידה והזן סיסמה של 4 תווים לפחות')
      return
    }
    setLoadingPwd(true)
    try {
      // בקוד המקורי השתמשת ב-bcrypt, אם יש לך Edge Function זה מצוין, 
      // אם לא, אפשר לשמור כרגע בטקסט חופשי (כמו בפייתון אם אין ספריה)
      const { error } = await supabase
        .from('unit_passwords')
        .upsert({ unit_name: selectedUnitPwd, password: newPassword }, { onConflict: 'unit_name' })
      
      if (error) throw error
      toast.success(`סיסמה עודכנה בהצלחה ליחידה ${selectedUnitPwd}`)
      setNewPassword('')
    } catch (err) {
      toast.error('שגיאה בעדכון הסיסמה: ' + err.message)
    } finally {
      setLoadingPwd(false)
    }
  }

  // פונקציית העלאת לוגו
  async function handleLogoUpload(e) {
    e.preventDefault()
    if (!selectedLogoUnit || !logoFile) {
      toast.error('בחר יחידה וקובץ תמונה')
      return
    }
    setLoadingLogo(true)
    try {
      // יצירת נתיב באנגלית (כדי למנוע בעיות קידוד ב-Supabase)
      const safeName = `logo_${Date.now()}.png`
      
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(safeName, logoFile, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(safeName)
      
      // עדכון ה-URL בטבלת הסיסמאות (או בטבלה ייעודית)
      await supabase.from('unit_passwords').upsert({ unit_name: selectedLogoUnit, logo_url: publicUrl }, { onConflict: 'unit_name' })

      toast.success('לוגו הועלה ועודכן בהצלחה!')
      setLogoFile(null)
    } catch (err) {
      toast.error('שגיאה בהעלאת הלוגו: ' + err.message)
    } finally {
      setLoadingLogo(false)
    }
  }

  return (
    <PageLayout title="⚙️ ניהול מערכת והגדרות">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <TabsBar tabs={ADMIN_TABS} activeTab={activeTab} onChange={setActiveTab} />
        
        <div className="p-6">
          {/* טאב סיסמאות */}
          {activeTab === 0 && (
            <div className="max-w-md mx-auto">
              <h3 className="text-xl font-bold text-gray-800 mb-4">🔑 עדכון סיסמאות ליחידות</h3>
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div>
                  <label className="label">בחר יחידה:</label>
                  <select className="select-field" value={selectedUnitPwd} onChange={e => setSelectedUnitPwd(e.target.value)}>
                    <option value="">-- בחר יחידה --</option>
                    {ALL_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">סיסמה חדשה (מינימום 4 תווים):</label>
                  <input type="text" className="input-field" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                </div>
                <button type="submit" disabled={loadingPwd} className="btn-primary w-full py-3 mt-4">
                  {loadingPwd ? 'שומר...' : 'עדכן סיסמה במערכת'}
                </button>
              </form>
            </div>
          )}

          {/* טאב לוגואים */}
          {activeTab === 1 && (
            <div className="max-w-md mx-auto">
              <h3 className="text-xl font-bold text-gray-800 mb-4">🖼️ העלאת לוגואים מותאמים אישית</h3>
              <form onSubmit={handleLogoUpload} className="space-y-4">
                <div>
                  <label className="label">בחר יחידה:</label>
                  <select className="select-field" value={selectedLogoUnit} onChange={e => setSelectedLogoUnit(e.target.value)}>
                    <option value="">-- בחר יחידה --</option>
                    {ALL_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">בחר תמונה (PNG/JPG):</label>
                  <input type="file" accept="image/png, image/jpeg" className="input-field py-2" onChange={e => setLogoFile(e.target.files[0])} />
                </div>
                <button type="submit" disabled={loadingLogo} className="btn-success w-full py-3 mt-4">
                  {loadingLogo ? 'מעלה לשרת...' : 'העלה לוגו ליחידה'}
                </button>
              </form>
            </div>
          )}

          {/* טאב ברקודים */}
          {activeTab === 2 && <BarcodeManager unit={user?.unit} />}
        </div>
      </div>
    </PageLayout>
  )
}
