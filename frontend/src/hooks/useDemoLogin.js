import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'
import { DEMO_PASSWORD } from '../config/demoAccounts'

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || 'https://snap-backend-rq8g.onrender.com'

/**
 * Attempts demo login via our FastAPI backend proxy first (bypasses ad-blockers /
 * antivirus software that block direct browser → supabase.co calls), then falls
 * back to direct Supabase auth as a secondary path.
 */
async function loginViaProxy(email) {
  const resp = await fetch(`${API_BASE}/api/v1/auth/demo-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}))
    throw new Error(body.detail || `Proxy responded ${resp.status}`)
  }
  return resp.json() // { access_token, refresh_token, expires_in, expires_at }
}

/**
 * Signs in as one of the demo accounts and lands on that role's portal.
 * Uses backend proxy first (bypasses browser-level ad-blockers / antivirus),
 * falls back to direct Supabase signInWithPassword.
 */
export default function useDemoLogin() {
  const navigate = useNavigate()
  const [busyKey, setBusyKey] = useState(null)
  const [error, setError] = useState('')

  const enterAs = useCallback(async (account) => {
    setError('')
    setBusyKey(account.key)

    try {
      // ── Strategy 1: backend proxy (bypasses browser-level blockers) ──────────
      try {
        const session = await loginViaProxy(account.email)
        // Apply the session directly into the Supabase client
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        })
        if (!sessionError) {
          navigate(account.home, { replace: true })
          return
        }
        // If setSession itself errored, log and fall through to direct auth
        console.warn('setSession failed after proxy login:', sessionError.message)
      } catch (proxyErr) {
        // Proxy unavailable (local dev without backend running, or Render cold-start)
        console.warn('Demo proxy failed, falling back to direct Supabase:', proxyErr.message)
      }

      // ── Strategy 2: direct Supabase signInWithPassword ────────────────────────
      const password = DEMO_PASSWORD || 'password123'
      let res = await supabase.auth.signInWithPassword({ email: account.email, password })

      // One automatic retry on transient network failure
      if (res.error?.message?.includes('Failed to fetch')) {
        await new Promise((r) => setTimeout(r, 800))
        res = await supabase.auth.signInWithPassword({ email: account.email, password })
      }

      if (res.error) {
        if (res.error.message?.includes('Failed to fetch')) {
          setError(
            'Both the backend proxy and direct Supabase auth are unreachable (Failed to fetch). ' +
            'Please check your internet connection. If an ad-blocker (Brave Shields, uBlock Origin, ' +
            'McAfee WebAdvisor) is active, try pausing it for this site.'
          )
        } else {
          setError(`Sign-in failed: ${res.error.message}`)
        }
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
