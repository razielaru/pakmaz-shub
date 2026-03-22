import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'
import toast from 'react-hot-toast'
import Spinner from '../components/ui/Spinner'

function hasRecoveryToken() {
  if (typeof window === 'undefined') return false
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  return hashParams.get('type') === 'recovery' || Boolean(hashParams.get('access_token'))
}

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isRecoveryFlow, setIsRecoveryFlow] = useState(false)
  const { user, updatePassword, logout } = useAuth()
  const navigate = useNavigate()

  const canSubmit = useMemo(() => {
    return password.trim().length >= 8 && password === confirmPassword
  }, [password, confirmPassword])

  useEffect(() => {
    let mounted = true

    async function validateAccess() {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return

      const recoveryMode = hasRecoveryToken() || Boolean(data.session) || Boolean(user)
      setIsRecoveryFlow(recoveryMode)
      setCheckingSession(false)
    }

    void validateAccess()

    return () => {
      mounted = false
    }
  }, [user])

  async function handleSubmit(e) {
    e.preventDefault()

    if (password.trim().length < 8) {
      toast.error('יש לבחור סיסמה באורך 8 תווים לפחות')
      return
    }

    if (password !== confirmPassword) {
      toast.error('שתי הסיסמאות חייבות להיות זהות')
      return
    }

    setSubmitting(true)
    try {
      await updatePassword(password)
      toast.success('הסיסמה עודכנה בהצלחה. אפשר להתחבר עם הסיסמה החדשה.')
      await logout()
      navigate('/login', { replace: true })
    } catch (error) {
      toast.error(error.message || 'עדכון הסיסמה נכשל')
    } finally {
      setSubmitting(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-idf-blueDark via-idf-blue to-idf-blueLight">
        <Spinner size="lg" color="white" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-idf-blueDark via-idf-blue to-idf-blueLight flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-800 mb-2">איפוס סיסמה מאובטח</h1>
          <p className="text-gray-500 text-sm">
            שינוי הסיסמה מתבצע דרך Supabase Auth בלבד, בלי שמירה של סיסמאות בטבלאות המערכת.
          </p>
        </div>

        {!isRecoveryFlow ? (
          <div className="space-y-5 text-center">
            <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-5 text-amber-800 text-sm leading-6">
              קישור האיפוס אינו פעיל או שפג תוקפו. יש לחזור למסך ההתחברות ולשלוח קישור חדש.
            </div>
            <Link
              to="/login"
              className="block w-full bg-idf-blue hover:bg-idf-blueDark text-white font-bold py-3.5 rounded-xl transition-all"
            >
              חזרה להתחברות
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="סיסמה חדשה"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-idf-blue transition-all pl-12 text-center"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPass(current => !current)}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xl"
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>

            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="אימות סיסמה חדשה"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-idf-blue transition-all pl-12 text-center"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(current => !current)}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xl"
              >
                {showConfirm ? '🙈' : '👁️'}
              </button>
            </div>

            <div className="rounded-2xl bg-blue-50 border border-blue-100 px-4 py-3 text-blue-900 text-sm leading-6">
              דרישת מינימום: לפחות 8 תווים. מומלץ לשלב אותיות, מספרים ותו מיוחד.
            </div>

            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className="w-full bg-idf-blue hover:bg-idf-blueDark disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-lg py-4 rounded-xl transition-all shadow-lg flex justify-center items-center gap-2"
            >
              {submitting ? <Spinner size="sm" color="white" /> : 'עדכון סיסמה'}
            </button>

            <Link to="/login" className="block text-center text-sm text-idf-blue hover:underline">
              חזרה למסך ההתחברות
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
