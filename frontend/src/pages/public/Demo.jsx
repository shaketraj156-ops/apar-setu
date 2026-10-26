import React from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Sparkles, ShieldCheck, ArrowRight } from 'lucide-react'
import DemoAccess from '../../components/DemoAccess'
import { DEMO_ENABLED } from '../../config/demoAccounts'
import useAuth from '../../hooks/useAuth'
import { rolePaths } from '../../routes/RoleBasedRedirect'

export default function Demo() {
  const { user, role, loading } = useAuth()

  if (!DEMO_ENABLED) return <Navigate to="/login" replace />
  if (!loading && user) return <Navigate to={rolePaths[role] || '/'} replace />

  return (
    <main className="page-shell">
      <section className="mx-auto max-w-4xl">
        <div className="text-center sm:text-left space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Interactive Multi-Role Sandbox</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
            Explore SNAP as Any Role
          </h1>

          <p className="max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Select an account below to sign in instantly with full permissions. Test the ingestion pipeline, explore regulatory oversight, manage student consent, or perform tamper-evident verification.
          </p>
        </div>

        <div className="mt-8">
          <DemoAccess />
        </div>

        <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <p>
            Prefer to sign in with your own credentials?{' '}
            <Link className="font-bold text-blue-600 dark:text-blue-400 hover:underline" to="/login">
              Standard Login
            </Link>
          </p>
          <p>Switch between roles anytime via the top banner bar.</p>
        </div>
      </section>
    </main>
  )
}
