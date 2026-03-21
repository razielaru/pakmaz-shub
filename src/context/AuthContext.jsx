import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

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
        setLoading(false)
        return
      }

      setUser({
        unit: data.unit_name,
        role: data.role || 'hativa',
        displayName: data.unit_name,
        canManageTasks: Boolean(data.can_manage_tasks),
        loginEmail: data.login_email || session.user.email || '',
      })
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
    return userData
  }

  async function logout() {
    await supabase.auth.signOut()
    setUser(null)
  }

  function canAccess(minRole) {
    const hierarchy = ['garin', 'mahlaka', 'gdud', 'hativa', 'ugda', 'pikud']
    const userIdx = hierarchy.indexOf(user?.role)
    const reqIdx = hierarchy.indexOf(minRole)
    return userIdx >= reqIdx
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, canAccess }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
