import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../api/supabaseClient'
import useAuth from '../../hooks/useAuth'
import DemoAccess from '../../components/DemoAccess'
import { DEMO_ENABLED } from '../../config/demoAccounts'
import RoleBasedRedirect, { rolePaths } from '../../routes/RoleBasedRedirect'

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
    event.preventDefault(); setError(''); setBusy(true)
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) { setError('Authentication is not configured. Set the frontend Supabase environment variables and restart Vite.'); setBusy(false); return }
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) { setError(authError.message); return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle()
      const home = rolePaths[profile?.role] || '/student'
      navigate(location.state?.from?.pathname || home, { replace: true })
    } catch (authError) {
      setError(authError.message || 'Unable to sign in. Check your connection and try again.')
    } finally { setBusy(false) }
  }
  return <main className="auth-wrap"><section className="auth-card"><p className="eyebrow">Welcome back</p><h1 className="text-3xl font-extrabold text-slate-950">Login to APAARSetu</h1><p className="mt-2 text-sm leading-6 text-slate-600">Use your registered account to open your role-based portal.</p><form className="mt-7 space-y-4" onSubmit={submit}><label className="form-label">Email<input className="form-input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label><label className="form-label">Password<input className="form-input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button-primary w-full justify-center" disabled={busy}>{busy ? 'Signing in…' : 'Login'}</button></form>{DEMO_ENABLED && <div className="mt-6 border-t border-slate-200 pt-5"><p className="mb-3 text-center text-sm font-semibold text-slate-700">Just exploring? Try the demo</p><DemoAccess compact /></div>}<p className="mt-5 text-center text-sm text-slate-600">New to APAARSetu? <Link className="font-semibold text-blue-700" to="/register">Create an account</Link></p><p className="mt-3 text-center text-sm"><Link className="text-slate-500 hover:text-blue-700" to="/">← Back to Home</Link></p></section></main>
}
