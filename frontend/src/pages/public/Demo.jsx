import { Link, Navigate } from 'react-router-dom'
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
        <p className="eyebrow">Live demo</p>
        <h1 className="text-3xl font-extrabold text-slate-950">Explore APAARSetu as any role</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Pick a role to sign in instantly, with no registration. Everything uses synthetic data, and you can switch roles at any time from the bar at the top.
        </p>
        <div className="mt-8"><DemoAccess /></div>
        <p className="mt-8 text-sm text-slate-500">
          Have an account? <Link className="font-semibold text-blue-700" to="/login">Log in</Link>
        </p>
      </section>
    </main>
  )
}
