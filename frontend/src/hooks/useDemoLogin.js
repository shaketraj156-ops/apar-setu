import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'
import { DEMO_PASSWORD } from '../config/demoAccounts'

/**
 * Signs in as one of the demo accounts and lands on that role's portal.
 * signInWithPassword replaces any current session, so it also works for switching roles.
 */
export default function useDemoLogin() {
  const navigate = useNavigate()
  const [busyKey, setBusyKey] = useState(null)
  const [error, setError] = useState('')

  const enterAs = useCallback(async (account) => {
    setError('')
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY || !DEMO_PASSWORD) {
      setError('Demo is not configured. Set VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY and VITE_DEMO_PASSWORD, then restart Vite.')
      return
    }
    setBusyKey(account.key)
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email: account.email, password: DEMO_PASSWORD })
      if (authError) {
        setError(`Could not sign in to the demo account (${authError.message}). Run database/seed/create_demo_users.py and check VITE_DEMO_PASSWORD.`)
        return
      }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle()
      if (profile?.role !== account.role) {
        await supabase.auth.signOut()
        setError(`The demo account ${account.email} does not have the ${account.role} role yet. Re-run database/seed/create_demo_users.py.`)
        return
      }
      navigate(account.home, { replace: true })
    } catch (err) {
      setError(err.message || 'Unable to start the demo. Check your connection and try again.')
    } finally {
      setBusyKey(null)
    }
  }, [navigate])

  return { enterAs, busyKey, error }
}
