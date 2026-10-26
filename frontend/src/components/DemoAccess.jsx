import React from 'react'
import {
  Building2,
  Landmark,
  GraduationCap,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Check
} from 'lucide-react'
import clsx from 'clsx'
import { DEMO_ACCOUNTS } from '../config/demoAccounts'
import useDemoLogin from '../hooks/useDemoLogin'
import { Badge } from './common'

const roleIcons = {
  institution_admin: Building2,
  aicte_officer: Landmark,
  student: GraduationCap,
  verifier: CheckCircle2
}

const roleAccent = {
  institution_admin: {
    border: 'hover:border-blue-500 hover:shadow-blue-500/10',
    iconBg: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400',
    badge: 'info'
  },
  aicte_officer: {
    border: 'hover:border-purple-500 hover:shadow-purple-500/10',
    iconBg: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400',
    badge: 'purple'
  },
  student: {
    border: 'hover:border-emerald-500 hover:shadow-emerald-500/10',
    iconBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400',
    badge: 'success'
  },
  verifier: {
    border: 'hover:border-teal-500 hover:shadow-teal-500/10',
    iconBg: 'bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-400',
    badge: 'brand'
  }
}

export default function DemoAccess({ compact = false }) {
  const { enterAs, busyKey, error } = useDemoLogin()

  return (
    <div>
      <div className={compact ? 'grid gap-2.5' : 'grid gap-4 sm:grid-cols-2'}>
        {DEMO_ACCOUNTS.map((account) => {
          const IconComponent = roleIcons[account.role] || ShieldCheck
          const accent = roleAccent[account.role] || roleAccent.institution_admin
          const isBusy = busyKey === account.key

          return (
            <button
              key={account.key}
              type="button"
              disabled={Boolean(busyKey)}
              onClick={() => enterAs(account)}
              className={clsx(
                'group relative rounded-2xl border text-left transition-all duration-200 cursor-pointer',
                'bg-white border-slate-200/90 shadow-2xs hover:-translate-y-0.5 hover:shadow-md',
                'dark:bg-slate-900 dark:border-slate-800 dark:hover:border-slate-700',
                accent.border,
                'disabled:opacity-60 disabled:cursor-wait disabled:transform-none disabled:shadow-none',
                compact ? 'p-3.5' : 'p-5'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={clsx(
                      'flex shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105',
                      compact ? 'h-9 w-9' : 'h-11 w-11',
                      accent.iconBg
                    )}
                  >
                    <IconComponent className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                        {account.title}
                      </span>
                    </div>
                    <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {account.subtitle}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 pt-0.5">
                  {isBusy ? (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      Opening…
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">
                      Enter <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
              </div>

              {!compact && account.highlights && (
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                    {account.highlights.map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-300">
          {error}
        </div>
      )}
    </div>
  )
}
