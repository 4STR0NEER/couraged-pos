import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './lib/supabase.js'

const AuthCtx = createContext(null)

// session / profile: undefined = still loading, null = none.
export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const uid = session?.user.id
  useEffect(() => {
    if (!uid) return setProfile(null)
    setProfile(undefined)
    supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', uid)
      .maybeSingle()
      .then(({ data }) => setProfile(data ?? { full_name: null, role: 'inactive' }))
  }, [uid])

  const value = {
    session,
    profile,
    isAdmin: profile?.role === 'admin',
    signOut: () => supabase.auth.signOut(),
  }
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export const useAuth = () => useContext(AuthCtx)
