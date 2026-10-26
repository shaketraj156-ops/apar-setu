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
    const password = DEMO_PASSWORD || 'password123'
    setBusyKey(account.key)
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: account.email,
        password
      })
      if (authError) {
        setError(`Could not sign in to the demo account (${authError.message}). Please verify credentials.`)
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle()

      // Redirect directly to the account's home portal
      navigate(account.home, { replace: true })
    } catch (err) {
      setError(err.message || 'Unable to start the demo. Check your connection and try again.')
    } finally {
      setBusyKey(null)
    }
  }, [navigate])

  return { enterAs, busyKey, error }
}
