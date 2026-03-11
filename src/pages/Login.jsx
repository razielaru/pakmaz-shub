import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { ALL_UNITS } from '../utils/constants'
import Spinner from '../components/ui/Spinner'

export default function Login() {
  const [unitName, setUnitName] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!unitName.trim() || !password.trim()) {
      toast.error('יש למלא שם יחידה וסיסמה')
      return
    }
    setLoading(true)
    try {
      await login(unitName, password)
      toast.success(`ברוך הבא! 🎖️`)
      navigate('/')
    } catch (err) {
      toast.error(err.message || 'שגיאה בהתחברות')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-idf-blueDark via-idf-blue to-idf-blueLight flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-slide-up">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">✡️</div>
          <h1 className="text-3xl font-extrabold text-white tracking-wide">מערכת בקרה רבנות</h1>
          <p className="text-blue-200 mt-1 text-sm font-medium">פיקוד מרכז — IDF Rabbinate Control</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">כניסה למערכת</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Unit selector */}
            <div>
              <label className="label">שם יחידה</label>
              <select
                value={unitName}
                onChange={e => setUnitName(e.target.value)}
                className="select-field text-base"
                required
              >
                <option value="">— בחר יחידה —</option>
                {ALL_UNITS.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">אם יחידתך אינה ברשימה — פנה למנהל המערכת</p>
            </div>

            {/* Password */}
            <div>
              <label className="label">סיסמה</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="הזן סיסמה"
                  className="input-field pl-10 text-base"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg"
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
            >
              {loading ? <Spinner size="sm" color="white" /> : '🔐'}
              {loading ? 'מתחבר...' : 'כניסה למערכת'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              בעיות התחברות? פנה לרב היחידה או מנהל המערכת
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-blue-200 text-xs mt-6 opacity-70">
          מערכת מאובטחת — סיסמאות מוצפנות bcrypt
        </p>
      </div>
    </div>
  )
}
