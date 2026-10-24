import { Navigate, Outlet, useLocation } from 'react-router-dom'
import useAuth from '../hooks/useAuth'
import RoleBasedRedirect from './RoleBasedRedirect'

export default function ProtectedRoute({ allowedRoles }) {
  const { user, role, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="page-state" role="status">Checking your session…</div>
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (allowedRoles && !allowedRoles.includes(role)) return <RoleBasedRedirect role={role} />
  return <Outlet />
}
