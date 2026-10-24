import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../api/supabaseClient'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (user) => {
    if (!user) { setProfile(null); return }
    let nextProfile = null
    try {
      if (typeof supabase.from === 'function') {
        const { data } = await supabase.from('profiles').select('id, full_name, email, role, institution_id').eq('id', user.id).maybeSingle()
        nextProfile = data
      }
    } catch { /* Fall back to the least-privileged default role if profile lookup is unavailable. */ }
    setProfile(nextProfile || {
      id: user.id,
      full_name: user.user_metadata?.full_name || user.email,
      // New accounts default to student in the current database signup trigger.
      role: 'student',
      institution_id: user.user_metadata?.institution_id || null,
    })
  }, [])

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      await loadProfile(data.session?.user)
      if (active) setLoading(false)
    }).catch(() => { if (active) setLoading(false) })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(true)
      // Defer profile access to avoid issuing Supabase calls inside its auth callback.
      Promise.resolve().then(() => loadProfile(nextSession?.user)).catch(() => setProfile(null)).finally(() => setLoading(false))
    })
    const onUnauthorized = () => { setSession(null); setProfile(null) }
    window.addEventListener('apaarsetu:unauthorized', onUnauthorized)
    return () => {
      active = false
      listener?.subscription?.unsubscribe()
      window.removeEventListener('apaarsetu:unauthorized', onUnauthorized)
    }
  }, [loadProfile])

  const value = useMemo(() => ({ session, user: session?.user || null, profile, role: profile?.role, loading, refreshProfile: () => loadProfile(session?.user) }), [session, profile, loading, loadProfile])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
