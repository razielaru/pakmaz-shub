import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)      // { unit, role, displayName }
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('pakmaz_user')
    if (stored) {
      try { setUser(JSON.parse(stored)) } catch {}
    }
    setLoading(false)
  }, [])

  async function login(unitName, password) {
    const { data, error } = await supabase
      .from('unit_passwords')
      .select('password, role, unit_name')
      .eq('unit_name', unitName)
      .single()

    if (error || !data) throw new Error('יחידה לא נמצאה')

    // bcrypt verify via Supabase Edge Function
    const { data: verified, error: verErr } = await supabase.functions.invoke('verify-password', {
      body: { stored: data.password, input: password },
    })

    // Fallback: plain text comparison (for dev/demo only)
    const isValid = verified?.match || data.password === password

    if (!isValid) throw new Error('סיסמה שגויה')

    const userData = { unit: unitName, role: data.role || 'garin', displayName: unitName }
    localStorage.setItem('pakmaz_user', JSON.stringify(userData))
    setUser(userData)
    return userData
  }

  function logout() {
    localStorage.removeItem('pakmaz_user')
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
