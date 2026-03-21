// src/pages/Admin.jsx
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'
import PageLayout from '../components/layout/PageLayout'
import TabsBar from '../components/ui/TabsBar'
import toast from 'react-hot-toast'
import { ALL_UNITS } from '../utils/constants'
import BarcodeManager from '../components/admin/BarcodeManager'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import QueryNotice from '../components/ui/QueryNotice'
import { useUnitAccounts, useUpdateUnitAccount } from '../hooks/useUnitAccounts'
import { logAdminAudit } from '../utils/audit'

const ADMIN_TABS = [
  { icon: '🔐', label: 'ניהול חשבונות' },
  { icon: '🖼️', label: 'לוגואים ליחידות' },
  { icon: '📍', label: 'מוצבים ו-QR' },
]

export default function Admin() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState(0)

  // -- משתני סטייט לחשבונות --
  const [selectedUnitPwd, setSelectedUnitPwd] = useState('')
  const [loginEmail, setLoginEmail] = useState('')
  const [selectedRole, setSelectedRole] = useState('gdud')
  const [canManageTasks, setCanManageTasks] = useState(false)
  const [loadingPwd, setLoadingPwd] = useState(false)
  const { data: accounts = [], isLoading: accountsLoading, error: accountsError, refetch } = useUnitAccounts()
  const updateUnitAccount = useUpdateUnitAccount()

  // -- משתני סטייט ללוגואים --
  const [selectedLogoUnit, setSelectedLogoUnit] = useState('')
  const [logoFile, setLogoFile] = useState(null)
  const [loadingLogo, setLoadingLogo] = useState(false)

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.unit_name === selectedUnitPwd),
    [accounts, selectedUnitPwd]
  )

  useEffect(() => {
    if (!selectedAccount) return
    setLoginEmail(selectedAccount.login_email || '')
    setSelectedRole(selectedAccount.role || 'gdud')
    setCanManageTasks(Boolean(selectedAccount.can_manage_tasks))
  }, [selectedAccount])

  async function handleAccountUpdate(e) {
    e.preventDefault()
    if (!selectedUnitPwd || !loginEmail.includes('@')) {
      toast.error('בחר יחידה והזן אימייל התחברות תקין')
      return
    }
    setLoadingPwd(true)
    try {
      await updateUnitAccount.mutateAsync({
        unit_name: selectedUnitPwd,
        login_email: loginEmail,
        role: selectedRole,
        can_manage_tasks: canManageTasks,
      })
      await logAdminAudit({
        action: 'unit_account_updated',
        actorName: user?.displayName,
        actorUnit: user?.unit,
        targetUnit: selectedUnitPwd,
        details: JSON.stringify({
          login_email: loginEmail.trim().toLowerCase(),
          role: selectedRole,
          can_manage_tasks: canManageTasks,
        }),
      })
      toast.success(`כתובת ההתחברות עודכנה בהצלחה ליחידה ${selectedUnitPwd}`)
    } catch (err) {
      toast.error('שגיאה בעדכון החשבון: ' + err.message)
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
      const { error: updateError } = await supabase
        .from('unit_passwords')
        .update({ logo_url: publicUrl })
        .eq('unit_name', selectedLogoUnit)

      if (updateError) throw updateError
      await logAdminAudit({
        action: 'unit_logo_updated',
        actorName: user?.displayName,
        actorUnit: user?.unit,
        targetUnit: selectedLogoUnit,
        details: publicUrl,
      })

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
          {/* טאב חשבונות */}
          {activeTab === 0 && (
            <div className="max-w-md mx-auto">
              <h3 className="text-xl font-bold text-gray-800 mb-2">🔐 חשבון התחברות ליחידה</h3>
              <p className="text-sm text-gray-500 mb-4">
                הסיסמה עצמה מנוהלת ב-Supabase Auth. כאן מגדירים רק את כתובת האימייל המקושרת ליחידה.
              </p>
              {accountsLoading ? (
                <div className="flex justify-center py-10"><Spinner size="lg" /></div>
              ) : accountsError ? (
                <QueryNotice
                  title="שגיאה בטעינת חשבונות"
                  message={accountsError.message || 'לא הצלחנו לטעון את רשימת היחידות'}
                  action={<button type="button" onClick={() => refetch()} className="btn-danger">נסה שוב</button>}
                />
              ) : (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="card text-center py-4">
                      <p className="text-3xl font-extrabold text-idf-blue">{accounts.length}</p>
                      <p className="text-xs text-gray-500 mt-1">יחידות רשומות</p>
                    </div>
                    <div className="card text-center py-4">
                      <p className="text-3xl font-extrabold text-emerald-600">{accounts.filter((account) => account.auth_user_id).length}</p>
                      <p className="text-xs text-gray-500 mt-1">חשבונות מקושרים ל-Auth</p>
                    </div>
                  </div>

                  <form onSubmit={handleAccountUpdate} className="space-y-4">
                    <div>
                      <label className="label">בחר יחידה:</label>
                      <select className="select-field" value={selectedUnitPwd} onChange={e => setSelectedUnitPwd(e.target.value)}>
                        <option value="">-- בחר יחידה --</option>
                        {ALL_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">אימייל התחברות:</label>
                      <input type="email" dir="ltr" className="input-field text-left" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="unit@example.com" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="label">Role</label>
                        <select className="select-field" value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
                          <option value="gdud">gdud</option>
                          <option value="hativa">hativa</option>
                          <option value="ugda">ugda</option>
                          <option value="pikud">pikud</option>
                        </select>
                      </div>
                      <label className="card flex items-center justify-between cursor-pointer">
                        <span className="font-semibold text-sm text-gray-700">הרשאת ניהול משימות</span>
                        <input type="checkbox" checked={canManageTasks} onChange={(e) => setCanManageTasks(e.target.checked)} />
                      </label>
                    </div>
                    {selectedAccount && (
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm">
                        <p className="font-bold text-gray-800">סטטוס קישור</p>
                        <p className="text-gray-500 mt-1">Auth linked: {selectedAccount.auth_user_id ? 'כן' : 'לא'}</p>
                        <p className="text-gray-500">עודכן: {selectedAccount.updated_at ? new Date(selectedAccount.updated_at).toLocaleString('he-IL') : '—'}</p>
                      </div>
                    )}
                    <button type="submit" disabled={loadingPwd || updateUnitAccount.isPending} className="btn-primary w-full py-3 mt-4">
                      {loadingPwd || updateUnitAccount.isPending ? 'שומר...' : 'שמור חשבון יחידה'}
                    </button>
                  </form>

                  {accounts.length === 0 ? (
                    <EmptyState icon="🔐" title="אין יחידות לניהול" description="לא נמצאו חשבונות יחידה במסד הנתונים." />
                  ) : (
                    <div className="card overflow-x-auto">
                      <h4 className="font-bold text-gray-800 mb-3">מצב כל החשבונות</h4>
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-right text-gray-500 border-b border-gray-200">
                            <th className="pb-2">יחידה</th>
                            <th className="pb-2">אימייל</th>
                            <th className="pb-2">Role</th>
                            <th className="pb-2">משימות</th>
                            <th className="pb-2">Auth</th>
                          </tr>
                        </thead>
                        <tbody>
                          {accounts.map((account) => (
                            <tr key={account.id} className="border-b border-gray-100 last:border-0">
                              <td className="py-2 font-semibold">{account.unit_name}</td>
                              <td className="py-2" dir="ltr">{account.login_email || '—'}</td>
                              <td className="py-2">{account.role}</td>
                              <td className="py-2">{account.can_manage_tasks ? 'כן' : 'לא'}</td>
                              <td className="py-2">{account.auth_user_id ? 'מקושר' : 'ממתין'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
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
