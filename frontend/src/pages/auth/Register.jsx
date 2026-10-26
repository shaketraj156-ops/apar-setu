import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  User,
  Mail,
  KeyRound,
  Building2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import axiosClient from '../../api/axiosClient'
import { supabase } from '../../api/supabaseClient'
import useAuth from '../../hooks/useAuth'
import RoleBasedRedirect from '../../routes/RoleBasedRedirect'
import { Button, Input, Select, Card, Toast } from '../../components/common'

const institutionRoles = ['institution_staff', 'institution_admin']
const roleOptions = [
  ['student', 'Student / Learner'],
  ['institution_staff', 'Institution Staff'],
  ['institution_admin', 'Institution Admin'],
  ['aicte_officer', 'AICTE Officer'],
  ['verifier', 'Employer / Verifier'],
  ['auditor', 'Auditor']
]

export default function Register() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('student')
  const [institutionId, setInstitutionId] = useState('')
  const [institutions, setInstitutions] = useState([])
  const [loadingInst, setLoadingInst] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { user, role: currentRole, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (institutionRoles.includes(role)) {
      setLoadingInst(true)
      axiosClient
        .get('/api/v1/institutions')
        .then(({ data }) => setInstitutions(data?.items || []))
        .catch(() => setInstitutions([]))
        .finally(() => setLoadingInst(false))
    }
  }, [role])

  if (!loading && user) return <RoleBasedRedirect role={currentRole} />

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')

    if (institutionRoles.includes(role) && !institutionId) {
      setError('Please select an affiliated institution for this account request.')
      return
    }

    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      setError('Authentication is not configured. Set the frontend Supabase environment variables and restart Vite.')
      return
    }

    setBusy(true)
    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            requested_role: role,
            institution_id: institutionId || null
          }
        }
      })
      if (signupError) {
        setError(signupError.message)
        return
      }
      if (data.session) {
        navigate('/', { replace: true })
      } else {
        setMessage('Account request submitted. Please check your email to verify your address. Administrative approval may be required before elevated portal access is activated.')
      }
    } catch (signupError) {
      setError(signupError.message || 'Unable to create your account. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-stretch">
      <div className="grid w-full lg:grid-cols-12 min-h-full">
        
        {/* Left Side: Brand & Trust Panel */}
        <div className="hidden lg:flex lg:col-span-5 relative flex-col justify-between p-12 bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-950 text-white overflow-hidden border-r border-slate-800">
          <div className="absolute inset-0 bg-radial-gradient from-blue-600/15 via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

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
              <span>Institutional Onboarding Gateway</span>
            </div>
          </div>

          <div className="relative z-10 space-y-6 my-12">
            <h2 className="text-3xl font-black tracking-tight leading-snug">
              Join the National Student Identity Network
            </h2>

            <div className="space-y-4 text-xs sm:text-sm text-blue-100/90 leading-relaxed">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Institutions can upload CSV batches and streamline admission audits.</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Students claim self-sovereign cryptographic QR credentials.</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Employers verify academic qualifications in sub-second timeframes.</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-6 border-t border-white/10 text-xs text-slate-400">
            <p>Protected by AICTE Access Control Policy</p>
          </div>
        </div>

        {/* Right Side: Registration Form */}
        <div className="lg:col-span-7 flex flex-col justify-center px-4 py-12 sm:px-8 lg:px-16 bg-slate-50/60 dark:bg-slate-950/60">
          <div className="mx-auto w-full max-w-md space-y-6">
            
            <div>
              <span className="eyebrow">Onboarding</span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                Create an Account
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Register for role-based access to the SNAP portal.
              </p>
            </div>

            <Card className="space-y-5">
              <form onSubmit={submit} className="space-y-4">
                <Input
                  label="Full Name"
                  required
                  autoComplete="name"
                  placeholder="Dr. Rajesh Kumar or Ananya Sen"
                  icon={User}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />

                <Input
                  label="Official Email Address"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@college.edu or name@domain.com"
                  icon={Mail}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <Input
                  label="Password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  helperText="Must be at least 8 characters long."
                  icon={KeyRound}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <Select
                  label="Requested Portal Role"
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  options={roleOptions}
                />

                {institutionRoles.includes(role) && (
                  <Select
                    label="Affiliated Institution"
                    required
                    value={institutionId}
                    onChange={(e) => setInstitutionId(e.target.value)}
                    helperText={loadingInst ? 'Loading institutions list…' : undefined}
                  >
                    <option value="">
                      {institutions.length
                        ? 'Select your college / university'
                        : loadingInst
                        ? 'Loading institutions…'
                        : 'No institutions found'}
                    </option>
                    {institutions.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name}
                      </option>
                    ))}
                  </Select>
                )}

                {message && (
                  <div
                    role="status"
                    className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-300"
                  >
                    {message}
                  </div>
                )}

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
                  {busy ? 'Submitting Registration…' : 'Register Account'}
                </Button>
              </form>
            </Card>

            <div className="text-center space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <p>
                Already have an account?{' '}
                <Link to="/login" className="font-bold text-blue-600 dark:text-blue-400 hover:underline">
                  Sign in
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
