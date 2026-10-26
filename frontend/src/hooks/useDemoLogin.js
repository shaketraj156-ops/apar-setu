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
      let res = await supabase.auth.signInWithPassword({
        email: account.email,
        password
      })

      // If initial attempt failed with 'Failed to fetch', retry once after 500ms
      if (res.error && res.error.message?.includes('Failed to fetch')) {
        await new Promise((resolve) => setTimeout(resolve, 500))
        res = await supabase.auth.signInWithPassword({
          email: account.email,
          password
        })
      }

      if (res.error) {
        if (res.error.message?.includes('Failed to fetch')) {
          setError(
            'Unable to reach Supabase authentication server (Failed to fetch). If using Brave or an ad-blocker (e.g. uBlock Origin), please pause shields for this site or check your network connection.'
          )
        } else {
          setError(`Could not sign in to the demo account (${res.error.message}). Please verify credentials.`)
        }
        return
      }

      const { data } = res
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle()

      // Redirect directly to the account's home portal
      navigate(account.home, { replace: true })
    } catch (err) {
      if (err.message?.includes('Failed to fetch')) {
        setError(
          'Unable to reach Supabase authentication server (Failed to fetch). If using Brave or an ad-blocker (e.g. uBlock Origin), please pause shields for this site or check your network connection.'
        )
      } else {
        setError(err.message || 'Unable to start the demo. Check your connection and try again.')
      }
    } finally {
      setBusyKey(null)
    }
  }, [navigate])

  return { enterAs, busyKey, error }
}
