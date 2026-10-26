import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'

/**
 * Demo login uses our own backend as a proxy (/api/v1/auth/demo-login).
 *
 * The key insight: the browser calls a SAME-ORIGIN URL:
 *   - Dev:  http://localhost:5173/api  → Vite dev proxy → http://localhost:8000/api
 *   - Prod: https://your-app.vercel.app/api → Vercel rewrite → https://snap-backend-rq8g.onrender.com/api
 *
 * Because the browser always calls the same origin, ad-blockers (McAfee WebAdvisor,
 * Brave Shields, uBlock Origin) cannot block the request.
 *
 * The backend calls Supabase server-side and returns the session tokens.
 * We then call supabase.auth.setSession() to load the session into the client.
 */
export default function useDemoLogin() {
  const navigate = useNavigate()
  const [busyKey, setBusyKey] = useState(null)
  const [error, setError] = useState('')

  const enterAs = useCallback(async (account) => {
    setError('')
    setBusyKey(account.key)

    try {
      // Always use a relative URL — same origin as the frontend (Vite dev proxy / Vercel rewrite)
      const resp = await fetch('/api/v1/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: account.email }),
      })

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}))
        throw new Error(body.detail || `Server responded ${resp.status}`)
      }

      const session = await resp.json()

      // Inject session into the Supabase JS client
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      })

      if (sessionError) {
        throw new Error(`Session setup failed: ${sessionError.message}`)
      }

      navigate(account.home, { replace: true })
    } catch (err) {
      setError(
        err.message ||
          'Unable to start the demo. Make sure the backend server is running and try again.'
      )
    } finally {
      setBusyKey(null)
    }
  }, [navigate])

  return { enterAs, busyKey, error }
}
