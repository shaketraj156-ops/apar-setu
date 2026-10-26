import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axiosClient from '../../api/axiosClient'
import { supabase } from '../../api/supabaseClient'
import useAuth from '../../hooks/useAuth'
import RoleBasedRedirect from '../../routes/RoleBasedRedirect'

const institutionRoles = ['institution_staff', 'institution_admin']
const roleOptions = [['student', 'Student'], ['institution_staff', 'Institution staff'], ['institution_admin', 'Institution admin'], ['aicte_officer', 'AICTE officer'], ['verifier', 'Employer / verifier'], ['auditor', 'Auditor']]
export default function Register() {
  const [fullName, setFullName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState('')
  const [role, setRole] = useState('student'); const [institutionId, setInstitutionId] = useState(''); const [institutions, setInstitutions] = useState([])
  const [message, setMessage] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  const { user, role: currentRole, loading } = useAuth(); const navigate = useNavigate()
  // T6 FIX: Backend returns paginated { items: [...] } — must unwrap .items
  useEffect(() => { if (institutionRoles.includes(role)) axiosClient.get('/api/v1/institutions').then(({ data }) => setInstitutions(data?.items || [])).catch(() => setInstitutions([])) }, [role])
  if (!loading && user) return <RoleBasedRedirect role={currentRole} />
  const submit = async (event) => {
    event.preventDefault(); setError(''); setMessage('')
    if (institutionRoles.includes(role) && !institutionId) { setError('Select an institution for this account request.'); return }
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) { setError('Authentication is not configured. Set the frontend Supabase environment variables and restart Vite.'); return }
    setBusy(true)
    try {
      const { data, error: signupError } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, requested_role: role, institution_id: institutionId || null } } })
      if (signupError) { setError(signupError.message); return }
      if (data.session) navigate('/', { replace: true })
      else setMessage('Account created. Check your email to confirm it, then sign in. Requested portal roles may need administrator approval before access is granted.')
    } catch (signupError) {
      setError(signupError.message || 'Unable to create your account. Check your connection and try again.')
    } finally { setBusy(false) }
  }
  return <main className="auth-wrap"><section className="auth-card"><p className="eyebrow">Join the demo</p><h1 className="text-3xl font-extrabold text-slate-950">Create an account</h1><p className="mt-2 text-sm leading-6 text-slate-600">Create a Supabase account and request the role that fits your work.</p><form className="mt-7 space-y-4" onSubmit={submit}><label className="form-label">Full name<input className="form-input" autoComplete="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} /></label><label className="form-label">Email<input className="form-input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label><label className="form-label">Password<input className="form-input" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} /><span className="text-xs font-normal text-slate-500">Use at least 8 characters.</span></label><label className="form-label">Requested role<select className="form-input" value={role} onChange={(e) => setRole(e.target.value)}>{roleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>{institutionRoles.includes(role) && <label className="form-label">Institution<select className="form-input" required value={institutionId} onChange={(e) => setInstitutionId(e.target.value)}><option value="">{institutions.length ? 'Select an institution' : 'Institutions unavailable — check API configuration'}</option>{institutions.map((institution) => <option key={institution.id} value={institution.id}>{institution.name}</option>)}</select></label>}{message && <p className="form-success" role="status">{message}</p>}{error && <p className="form-error" role="alert">{error}</p>}<button className="button-primary w-full justify-center" disabled={busy}>{busy ? 'Creating account…' : 'Register'}</button></form><p className="mt-5 text-center text-sm text-slate-600">Already registered? <Link className="font-semibold text-blue-700" to="/login">Login</Link></p><p className="mt-3 text-center text-sm"><Link className="text-slate-500 hover:text-blue-700" to="/">← Back to Home</Link></p></section></main>
}
