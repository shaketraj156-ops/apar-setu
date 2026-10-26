import { useNavigate } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'
import { DEMO_ACCOUNTS, isDemoEmail } from '../config/demoAccounts'
import useAuth from '../hooks/useAuth'
import useDemoLogin from '../hooks/useDemoLogin'

/** Slim bar shown only while signed in as a demo user: switch role or exit. */
export default function DemoBanner() {
  const { user, role } = useAuth()
  const { enterAs, busyKey, error } = useDemoLogin()
  const navigate = useNavigate()
  if (!user || !isDemoEmail(user.email)) return null

  const exit = async () => { await supabase.auth.signOut(); navigate('/', { replace: true }) }
  return (
    <div className="border-b border-amber-200 bg-amber-50 text-sm text-amber-900" role="status">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-5 py-2 sm:px-8">
        <span className="font-bold">Demo mode</span>
        <span className="text-amber-800">Synthetic data only. Viewing as {DEMO_ACCOUNTS.find((a) => a.role === role)?.title || role}.</span>
        <span className="ml-auto flex flex-wrap items-center gap-2">
          <span className="text-amber-800">Switch to:</span>
          {DEMO_ACCOUNTS.filter((a) => a.role !== role).map((a) => (
            <button key={a.key} type="button" disabled={Boolean(busyKey)} onClick={() => enterAs(a)} className="rounded-full border border-amber-300 bg-white px-3 py-0.5 font-semibold hover:bg-amber-100 disabled:opacity-60">
              {busyKey === a.key ? 'Opening…' : a.title}
            </button>
          ))}
          <button type="button" onClick={exit} className="rounded-full bg-amber-900 px-3 py-0.5 font-semibold text-white hover:bg-amber-950">Exit demo</button>
        </span>
      </div>
      {error && <p className="mx-auto max-w-7xl px-5 pb-2 text-rose-700 sm:px-8" role="alert">{error}</p>}
    </div>
  )
}
