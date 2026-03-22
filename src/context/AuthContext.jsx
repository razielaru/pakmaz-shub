import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext(null)

function getManagerAccessStorageKey(sessionUserId) {
  return `pakmaz:manager-access:${sessionUserId}`
}

function buildResetRedirectUrl() {
  if (typeof window === 'undefined') return undefined
  const baseUrl = import.meta.env.VITE_APP_URL?.replace(/\/$/, '') || window.location.origin
  return `${baseUrl}/reset-password`
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [managerUnlocked, setManagerUnlocked] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadProfile(session) {
      if (!session?.user?.id) {
        if (isMounted) {
          setUser(null)
          setLoading(false)
        }
        return
      }

      const { data, error } = await supabase
        .from('unit_passwords')
        .select('unit_name, role, can_manage_tasks, login_email')
        .eq('auth_user_id', session.user.id)
        .maybeSingle()

      if (!isMounted) return

      if (error || !data) {
        await supabase.auth.signOut()
        setUser(null)
        setManagerUnlocked(false)
        setLoading(false)
        return
      }

      const isAutoManager = ['ugda', 'pikud'].includes(data.role)
      const savedManagerAccess = window.localStorage.getItem(getManagerAccessStorageKey(session.user.id)) === 'true'

      setUser({
        unit: data.unit_name,
        role: data.role || 'hativa',
        displayName: data.unit_name,
        canManageTasks: Boolean(data.can_manage_tasks),
        loginEmail: data.login_email || session.user.email || '',
      })
      setManagerUnlocked(isAutoManager || savedManagerAccess)
      setLoading(false)
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return
      void loadProfile(data.session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return
      setLoading(true)
      void loadProfile(session)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function login(unitName, password) {
    const { data, error } = await supabase
      .from('unit_login_directory')
      .select('unit_name, login_email')
      .eq('unit_name', unitName)
      .single()

    if (error || !data) {
      throw new Error('היחידה לא מוגדרת לכניסה מאובטחת. בדוק שה-SQL החדש רץ ב-Supabase.')
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: data.login_email,
      password,
    })

    if (authError) {
      throw new Error(authError.message || 'התחברות נכשלה')
    }

    const { data: profile, error: profileError } = await supabase
      .from('unit_passwords')
      .select('unit_name, role, can_manage_tasks, login_email')
      .eq('auth_user_id', authData.user.id)
      .maybeSingle()

    if (profileError || !profile) {
      await supabase.auth.signOut()
      throw new Error('לחשבון אין פרופיל הרשאות פעיל. יש להשלים את קישור המשתמש ב-Supabase.')
    }

    const userData = {
      unit: profile.unit_name,
      role: profile.role || 'hativa',
      displayName: profile.unit_name,
      canManageTasks: Boolean(profile.can_manage_tasks),
      loginEmail: profile.login_email || authData.user.email || '',
    }
    setUser(userData)
    const isAutoManager = ['ugda', 'pikud'].includes(userData.role)
    const savedManagerAccess = window.localStorage.getItem(getManagerAccessStorageKey(authData.user.id)) === 'true'
    setManagerUnlocked(isAutoManager || savedManagerAccess)
    return userData
  }

  async function logout() {
    const session = await supabase.auth.getSession()
    if (session.data.session?.user?.id) {
      window.localStorage.removeItem(getManagerAccessStorageKey(session.data.session.user.id))
    }
    await supabase.auth.signOut()
    setUser(null)
    setManagerUnlocked(false)
  }

  async function requestPasswordReset(unitName) {
    const { data, error } = await supabase
      .from('unit_login_directory')
      .select('unit_name, login_email')
      .eq('unit_name', unitName)
      .single()

    if (error || !data?.login_email) {
      throw new Error('ליחידה הזו אין כתובת אימייל מאובטחת לאיפוס סיסמה.')
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(data.login_email, {
      redirectTo: buildResetRedirectUrl(),
    })

    if (resetError) {
      throw new Error(resetError.message || 'שליחת קישור האיפוס נכשלה')
    }

    return { email: data.login_email }
  }

  async function updatePassword(nextPassword) {
    const { data, error } = await supabase.auth.updateUser({
      password: nextPassword,
    })

    if (error) {
      throw new Error(error.message || 'עדכון הסיסמה נכשל')
    }

    return data.user
  }

  async function unlockManagerAccess(accessCode) {
    if (!user) {
      throw new Error('אין משתמש מחובר')
    }

    if (['ugda', 'pikud'].includes(user.role)) {
      setManagerUnlocked(true)
      return true
    }

    const normalizedCode = accessCode?.trim()
    if (!normalizedCode) {
      throw new Error('יש להזין סיסמת מנהל')
    }

    const { data, error } = await supabase.rpc('verify_manager_access', {
      access_code: normalizedCode,
    })

    if (error) {
      if (/function|does not exist|verify_manager_access/i.test(error.message || '')) {
        throw new Error('עדיין לא הוגדרה במערכת פונקציית פתיחת ניהול. יש להריץ את עדכון ה-SQL החדש ב-Supabase.')
      }
      throw new Error(error.message || 'אימות סיסמת המנהל נכשל')
    }

    if (!data) {
      throw new Error('סיסמת המנהל שגויה')
    }

    const session = await supabase.auth.getSession()
    if (session.data.session?.user?.id) {
      window.localStorage.setItem(getManagerAccessStorageKey(session.data.session.user.id), 'true')
    }
    setManagerUnlocked(true)
    return true
  }

  async function lockManagerAccess() {
    const session = await supabase.auth.getSession()
    if (session.data.session?.user?.id) {
      window.localStorage.removeItem(getManagerAccessStorageKey(session.data.session.user.id))
    }
    setManagerUnlocked(['ugda', 'pikud'].includes(user?.role))
  }

  function canAccess(minRole) {
    const hierarchy = ['garin', 'mahlaka', 'gdud', 'hativa', 'ugda', 'pikud']
    const userIdx = hierarchy.indexOf(user?.role)
    const reqIdx = hierarchy.indexOf(minRole)
    return userIdx >= reqIdx
  }

  const managerAccessEligible = Boolean(user && (['gdud', 'hativa'].includes(user.role) || user.canManageTasks))
  const hasManagerAccess = Boolean(user && (['ugda', 'pikud'].includes(user.role) || managerUnlocked))

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        canAccess,
        requestPasswordReset,
        updatePassword,
        managerUnlocked,
        managerAccessEligible,
        hasManagerAccess,
        unlockManagerAccess,
        lockManagerAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
