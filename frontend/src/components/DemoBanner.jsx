import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, ArrowRightLeft, LogOut, AlertCircle, ShieldAlert } from 'lucide-react'
import { supabase } from '../api/supabaseClient'
import { DEMO_ACCOUNTS, isDemoEmail } from '../config/demoAccounts'
import useAuth from '../hooks/useAuth'
import useDemoLogin from '../hooks/useDemoLogin'

export default function DemoBanner() {
  const { user, role } = useAuth()
  const { enterAs, busyKey, error } = useDemoLogin()
  const navigate = useNavigate()

  if (!user || !isDemoEmail(user.email)) return null

  const exit = async () => {
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  const currentAccount = DEMO_ACCOUNTS.find((a) => a.role === role)

  return (
    <aside
      aria-label="Demo mode switcher"
      className="border-b border-amber-300/80 bg-gradient-to-r from-amber-50 via-amber-100/70 to-amber-50 text-xs text-amber-950 dark:border-amber-900/60 dark:from-amber-950/60 dark:via-amber-900/40 dark:to-amber-950/60 dark:text-amber-200"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 sm:px-6 lg:px-8">
        
        {/* Left: Mode tag */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/20 px-2 py-0.5 font-bold uppercase tracking-wider text-[10px] text-amber-900 dark:text-amber-300 border border-amber-500/30">
            <Sparkles className="h-3 w-3" />
            Demo Sandbox
          </span>
          <span className="font-medium text-amber-900/90 dark:text-amber-200">
            Viewing as <strong className="font-bold underline decoration-amber-400">{currentAccount?.title || role}</strong>
          </span>
        </div>

        {/* Right: Switch buttons */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="hidden sm:inline text-amber-800/80 dark:text-amber-300/80 font-semibold text-[11px]">
            Switch role:
          </span>

          {DEMO_ACCOUNTS.filter((a) => a.role !== role).map((a) => (
            <button
              key={a.key}
              type="button"
              disabled={Boolean(busyKey)}
              onClick={() => enterAs(a)}
              className="inline-flex items-center gap-1 rounded-lg border border-amber-300/80 bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-800 shadow-2xs hover:bg-amber-100 hover:border-amber-400 disabled:opacity-50 dark:border-amber-800 dark:bg-slate-900 dark:text-amber-200 dark:hover:bg-amber-950 transition cursor-pointer"
            >
              {busyKey === a.key ? (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 animate-ping rounded-full bg-amber-500" />
                  Loading…
                </span>
              ) : (
                a.title.split(' ')[0]
              )}
            </button>
          ))}

          <button
            type="button"
            onClick={exit}
            className="inline-flex items-center gap-1 rounded-lg bg-amber-900 px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs hover:bg-amber-950 dark:bg-amber-800 dark:hover:bg-amber-700 transition cursor-pointer"
          >
            <LogOut className="h-3 w-3" />
            <span>Exit Demo</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 pb-2 text-rose-700 dark:text-rose-400 sm:px-6 lg:px-8">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <p className="text-[11px] font-medium">{error}</p>
        </div>
      )}
    </aside>
  )
}
