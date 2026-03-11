// src/pages/Login.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import Spinner from '../components/ui/Spinner'
import { ALL_UNITS } from '../utils/constants'

// מיפוי אייקונים ליחידות (אפשר לשנות לתמונות לוגו בהמשך)
const UNIT_ICONS = {
  'חטיבה 35': '🔴',
  'חטיבה 89': '🦅',
  'חטיבה 900': '🟢',
  'פיקוד מרכז': '🦁',
  'אוגדה 98': '🔥',
  'אוגדה 162': '🛡️',
  'גדוד 51': '🌳',
  'גדוד 202': '🐍',
  'גדוד 890': '🦇',
  'גרעין ירושלים': '🕍',
  'גרעין שומרון': '⛰️',
  'גרעין עציון': '🌲',
  default: '🔰'
}

export default function Login() {
  const [selectedUnit, setSelectedUnit] = useState(null)
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!password.trim()) {
      toast.error('יש להזין סיסמה')
      return
    }
    setLoading(true)
    try {
      await login(selectedUnit, password)
      toast.success(`ברוך הבא למערכת, ${selectedUnit}! 🎖️`)
      navigate('/')
    } catch (err) {
      toast.error(err.message || 'שגיאה בהתחברות')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-idf-blueDark via-idf-blue to-idf-blueLight flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl animate-slide-up">
        
        {/* כותרת עליונה */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-2 tracking-tight">
            מערכת בקרה ודיווח
          </h1>
          <h2 className="text-xl md:text-2xl font-medium text-blue-200">
            רבנות פיקוד המרכז
          </h2>
        </div>

        {!selectedUnit ? (
          /* תצוגת גלריית יחידות */
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 md:p-8 shadow-2xl border border-white/20">
            <h3 className="text-white text-center text-lg md:text-xl mb-6 font-semibold">
              בחר יחידה להתחברות:
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {ALL_UNITS.map(unit => (
                <button
                  key={unit}
                  onClick={() => setSelectedUnit(unit)}
                  className="bg-white rounded-2xl p-6 flex flex-col items-center gap-3 hover:scale-105 hover:shadow-xl transition-all duration-300 border-b-4 border-transparent hover:border-idf-blue group"
                >
                  <span className="text-4xl group-hover:scale-110 transition-transform">
                    {UNIT_ICONS[unit] || UNIT_ICONS.default}
                  </span>
                  <span className="font-bold text-gray-800 text-center text-sm md:text-base">
                    {unit}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* תצוגת הזנת סיסמה ליחידה נבחרת */
          <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-md mx-auto relative overflow-hidden animate-fade-in">
            <button
              onClick={() => { setSelectedUnit(null); setPassword(''); }}
              className="absolute top-4 right-4 text-gray-400 hover:text-idf-blue transition-colors text-sm font-semibold flex items-center gap-1"
            >
              חזור 🔙
            </button>
            
            <div className="text-center mt-4 mb-8">
              <span className="text-6xl mb-4 block">
                {UNIT_ICONS[selectedUnit] || UNIT_ICONS.default}
              </span>
              <h3 className="text-2xl font-bold text-gray-800">{selectedUnit}</h3>
              <p className="text-gray-500 text-sm mt-1">הזן סיסמת גישה ליחידה</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="סיסמה..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-idf-blue transition-all pl-12 text-center"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xl"
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-idf-blue hover:bg-idf-blueDark text-white font-bold text-lg py-4 rounded-xl transition-all transform active:scale-95 shadow-lg flex justify-center items-center gap-2"
              >
                {loading ? <Spinner size="sm" color="white" /> : 'התחבר למערכת'}
              </button>
            </form>
          </div>
        )}
        
        <p className="text-center text-blue-200 text-sm mt-8 opacity-80 font-medium">
          פותח עבור רבנות פיקוד המרכז © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
