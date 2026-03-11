import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useHierarchy, useManageHierarchy } from '../hooks/useHierarchy'
import { supabase } from '../supabaseClient'
import PageLayout from '../components/layout/PageLayout'
import TabsBar from '../components/ui/TabsBar'
import ConfirmModal from '../components/ui/ConfirmModal'
import Spinner from '../components/ui/Spinner'
import { ALL_UNITS } from '../utils/constants'
import toast from 'react-hot-toast'
import { Navigate } from 'react-router-dom'

const TABS = [
  { icon: '🏛️', label: 'היררכיה' },
  { icon: '🔑', label: 'סיסמאות' },
  { icon: '📧', label: 'הגדרות מייל' },
  { icon: '🖼️', label: 'לוגואים' },
]

export default function Admin() {
  const { user, canAccess } = useAuth()
  const [activeTab, setActiveTab] = useState(0)

  if (!canAccess('pikud')) return <Navigate to="/" replace />

  return (
    <PageLayout title="⚙️ ניהול מתקדם" subtitle="הגדרות מערכת — גישה לפיקוד בלבד">
      <div className="bg-white rounded-xl shadow-sm border border-idf-border overflow-hidden">
        <TabsBar tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
        <div className="p-4">
          {activeTab === 0 && <HierarchyManager />}
          {activeTab === 1 && <PasswordManager />}
          {activeTab === 2 && <EmailSettings />}
          {activeTab === 3 && <LogoManager />}
        </div>
      </div>
    </PageLayout>
  )
}

// ======================================================
// Hierarchy Manager
// ======================================================
function HierarchyManager() {
  const { data: hierarchy = [], isLoading } = useHierarchy()
  const { add, remove } = useManageHierarchy()
  const [parent, setParent] = useState('')
  const [child, setChild] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  async function handleAdd() {
    if (!parent || !child || parent === child) { toast.error('בחר יחידות תקינות'); return }
    try {
      await add.mutateAsync({ parent, child })
      toast.success(`✅ קשר נוסף: ${parent} → ${child}`)
      setParent(''); setChild('')
    } catch (e) { toast.error(e.message) }
  }

  if (isLoading) return <Spinner />

  return (
    <div className="space-y-6">
      <div className="section-title">🏛️ ניהול היררכיה</div>

      <div className="card space-y-4">
        <h3 className="font-bold text-gray-700">הוספת קשר היררכי</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="label">יחידת אב</label>
            <select value={parent} onChange={e => setParent(e.target.value)} className="select-field">
              <option value="">— בחר —</option>
              {ALL_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="label">יחידת בן</label>
            <select value={child} onChange={e => setChild(e.target.value)} className="select-field">
              <option value="">— בחר —</option>
              {ALL_UNITS.filter(u => u !== parent).map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <button onClick={handleAdd} disabled={add.isPending} className="btn-primary">
            {add.isPending ? '⏳' : '➕'} הוסף קשר
          </button>
        </div>
      </div>

      <div className="card space-y-2">
        <h3 className="font-bold text-gray-700 mb-3">קשרים קיימים ({hierarchy.length})</h3>
        {hierarchy.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">אין קשרים מוגדרים</p>
        ) : hierarchy.map(h => (
          <div key={`${h.parent_unit}-${h.child_unit}`} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
            <span className="text-sm">
              <strong>{h.parent_unit}</strong> <span className="text-gray-400 mx-2">→</span> {h.child_unit}
            </span>
            <button onClick={() => setDeleteTarget(h)} className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded hover:bg-red-50 transition-all">
              🗑️ מחק
            </button>
          </div>
        ))}
      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="מחיקת קשר"
        message={deleteTarget ? `למחוק את הקשר ${deleteTarget.parent_unit} → ${deleteTarget.child_unit}?` : ''}
        confirmLabel="מחק"
        danger
        onConfirm={async () => {
          await remove.mutateAsync(deleteTarget.child_unit)
          toast.success('✅ קשר נמחק')
          setDeleteTarget(null)
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

// ======================================================
// Password Manager
// ======================================================
function PasswordManager() {
  const [selectedUnit, setSelectedUnit] = useState('')
  const [newPass, setNewPass] = useState('')
  const [role, setRole] = useState('garin')
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    if (!selectedUnit || !newPass) { toast.error('מלא את כל השדות'); return }
    if (newPass.length < 4) { toast.error('סיסמה חייבת להיות לפחות 4 תווים'); return }
    setLoading(true)
    try {
      const { error } = await supabase.from('unit_passwords').upsert({
        unit_name: selectedUnit,
        password: newPass,
        role,
      })
      if (error) throw error
      toast.success(`✅ סיסמה עודכנה עבור ${selectedUnit}`)
      setNewPass('')
    } catch (e) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div className="section-title">🔑 ניהול סיסמאות</div>
      <div className="card space-y-4">
        <h3 className="font-bold text-gray-700">עדכון סיסמה</h3>
        <div>
          <label className="label">יחידה</label>
          <select value={selectedUnit} onChange={e => setSelectedUnit(e.target.value)} className="select-field">
            <option value="">— בחר יחידה —</option>
            {ALL_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label className="label">תפקיד / הרשאה</label>
          <select value={role} onChange={e => setRole(e.target.value)} className="select-field">
            <option value="garin">גרעין (בסיסי)</option>
            <option value="mahlaka">מחלקה</option>
            <option value="gdud">גדוד</option>
            <option value="hativa">חטיבה</option>
            <option value="ugda">אוגדה</option>
            <option value="pikud">פיקוד (מנהל)</option>
          </select>
        </div>
        <div>
          <label className="label">סיסמה חדשה</label>
          <input type="text" value={newPass} onChange={e => setNewPass(e.target.value)}
            className="input-field" placeholder="מינימום 4 תווים..." />
        </div>
        <button onClick={handleSave} disabled={loading} className="btn-primary">
          {loading ? '⏳ שומר...' : '💾 שמור סיסמה'}
        </button>
        <p className="text-xs text-gray-400">⚠️ הסיסמה נשמרת כ-plain text בשלב זה. לסביבת ייצור — יש להוסיף bcrypt hashing.</p>
      </div>
    </div>
  )
}

// ======================================================
// Email Settings
// ======================================================
function EmailSettings() {
  const [unit, setUnit] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    if (!unit || !email) { toast.error('מלא יחידה ומייל'); return }
    setLoading(true)
    try {
      const { error } = await supabase.from('unit_emails').upsert({ unit, email })
      if (error) throw error
      toast.success(`✅ מייל עודכן עבור ${unit}`)
      setEmail('')
    } catch (e) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div className="section-title">📧 הגדרות מייל</div>
      <div className="card space-y-4">
        <h3 className="font-bold text-gray-700">הגדר כתובת מייל ליחידה</h3>
        <div>
          <label className="label">יחידה</label>
          <select value={unit} onChange={e => setUnit(e.target.value)} className="select-field">
            <option value="">— בחר —</option>
            {ALL_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label className="label">כתובת מייל</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            className="input-field" placeholder="rabbi@unit.idf.il" dir="ltr" />
        </div>
        <button onClick={handleSave} disabled={loading} className="btn-primary">
          {loading ? '⏳' : '💾'} שמור
        </button>
      </div>
      <div className="card bg-blue-50 border border-blue-200">
        <p className="text-sm text-blue-800 font-semibold mb-1">💡 שימוש</p>
        <p className="text-xs text-blue-700">
          כאשר מוגש דוח עם ליקוי קריטי (עירוב פסול, כשרות חסרה, מזוזות 5+), 
          המערכת תשלח מייל אוטומטי לכתובת שהוגדרה עבור היחידה ולכתובות ביחידות מעל בהיררכיה.
        </p>
      </div>
    </div>
  )
}

// ======================================================
// Logo Manager
// ======================================================
function LogoManager() {
  const [unit, setUnit] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleUpload() {
    if (!unit || !file) { toast.error('בחר יחידה וקובץ תמונה'); return }
    setLoading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `logos/${unit}.${ext}`
      const { error: uploadError } = await supabase.storage.from('logos').upload(path, file, { upsert: true })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path)
      await supabase.from('unit_passwords').update({ logo_url: publicUrl }).eq('unit_name', unit)

      toast.success(`✅ לוגו עודכן עבור ${unit}`)
      setFile(null)
    } catch (e) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div className="section-title">🖼️ ניהול לוגואים</div>
      <div className="card space-y-4">
        <h3 className="font-bold text-gray-700">העלאת לוגו ליחידה</h3>
        <div>
          <label className="label">יחידה</label>
          <select value={unit} onChange={e => setUnit(e.target.value)} className="select-field">
            <option value="">— בחר —</option>
            {ALL_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label className="label">קובץ תמונה (PNG/JPG)</label>
          <input type="file" accept="image/png,image/jpeg" onChange={e => setFile(e.target.files[0])} className="input-field" />
        </div>
        {file && <img src={URL.createObjectURL(file)} alt="preview" className="h-16 rounded-lg border border-gray-200" />}
        <button onClick={handleUpload} disabled={loading} className="btn-primary">
          {loading ? '⏳ מעלה...' : '⬆️ העלה לוגו'}
        </button>
      </div>
    </div>
  )
}
