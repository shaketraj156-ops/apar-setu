import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  CheckCircle2,
  Sparkles,
  ArrowRight
} from 'lucide-react'
import { supabase } from '../../api/supabaseClient'
import useAuth from '../../hooks/useAuth'
import DemoAccess from '../../components/DemoAccess'
import { DEMO_ENABLED } from '../../config/demoAccounts'
import RoleBasedRedirect, { rolePaths } from '../../routes/RoleBasedRedirect'
import { Button, Input, Card } from '../../components/common'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { user, role, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  if (!loading && user) return <RoleBasedRedirect role={role} />

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setBusy(true)

    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      setError('Authentication is not configured. Set the frontend Supabase environment variables and restart Vite.')
      setBusy(false)
      return
    }

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) {
        setError(authError.message)
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle()

      const home = rolePaths[profile?.role] || '/student'
      navigate(location.state?.from?.pathname || home, { replace: true })
    } catch (authError) {
      setError(authError.message || 'Unable to sign in. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-stretch">
      <div className="grid w-full lg:grid-cols-12 min-h-full">
        
        {/* Left Side: Brand & Trust Panel (visible on lg+) */}
        <div className="hidden lg:flex lg:col-span-5 relative flex-col justify-between p-12 bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-950 text-white overflow-hidden border-r border-slate-800">
          
          {/* Subtle glow and grid background */}
          <div className="absolute inset-0 bg-radial-gradient from-blue-600/15 via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

          {/* Top: Logo & Govtech Pill */}
          <div className="relative z-10 space-y-4">
            <Link to="/" className="inline-flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white p-1.5 shadow-md">
                <img src="/snap-logo.png" alt="SNAP logo" className="h-full w-full object-contain" />
              </div>
              <span className="text-xl font-black tracking-tight text-white">
                SNAP
              </span>
            </Link>

            <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-200">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>AICTE Central Authentication Gateway</span>
            </div>
          </div>

          {/* Middle: Value Prop */}
          <div className="relative z-10 space-y-6 my-12">
            <h2 className="text-3xl font-black tracking-tight leading-snug">
              Secure, Tamper-Evident Access to Academic Data
            </h2>

            <div className="space-y-4 text-xs sm:text-sm text-blue-100/90 leading-relaxed">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Zero-PII leakage: Aadhaar and raw data remain cryptographically masked.</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Ed25519 digital signature validation against national registry public keys.</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Direct integration with AICTE regulatory oversight dashboards.</span>
              </div>
            </div>
          </div>

          {/* Bottom: Regulatory Compliance Note */}
          <div className="relative z-10 pt-6 border-t border-white/10 text-xs text-slate-400">
            <p>Compliant with DPDP Act 2023 · AICTE Academic Norms</p>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="lg:col-span-7 flex flex-col justify-center px-4 py-12 sm:px-8 lg:px-16 bg-slate-50/60 dark:bg-slate-950/60">
          <div className="mx-auto w-full max-w-md space-y-6">
            
            <div>
              <span className="eyebrow">Authentication</span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                Sign in to your portal
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Enter your institutional or user account credentials to access your dashboard.
              </p>
            </div>

            {/* Login Card */}
            <Card className="space-y-5">
              <form onSubmit={submit} className="space-y-4">
                <Input
                  label="Email Address"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@college.edu or admin@demo.test"
                  icon={Mail}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <Input
                  label="Password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  icon={KeyRound}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                {error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-300"
                  >
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={busy}
                  className="w-full justify-center"
                >
                  {busy ? 'Authenticating…' : 'Sign In to Portal'}
                </Button>
              </form>

              {/* One-Click Demo Access Section */}
              {DEMO_ENABLED && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Quick Demo Access
                    </span>
                    <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full">
                      No Password Needed
                    </span>
                  </div>
                  <DemoAccess compact />
                </div>
              )}
            </Card>

            <div className="text-center space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <p>
                Need a portal account?{' '}
                <Link to="/register" className="font-bold text-blue-600 dark:text-blue-400 hover:underline">
                  Register for access
                </Link>
              </p>
              <p>
                <Link to="/" className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
                  ← Return to Home
                </Link>
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
