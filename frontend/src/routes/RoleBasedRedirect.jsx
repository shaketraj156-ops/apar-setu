import { Navigate } from 'react-router-dom'

export const rolePaths = {
  student: '/student', institution_staff: '/institution', institution_admin: '/institution',
  aicte_officer: '/aicte', verifier: '/verifier', auditor: '/aicte', system_admin: '/aicte',
}

export default function RoleBasedRedirect({ role, fallback = '/' }) {
  return <Navigate to={rolePaths[role] || fallback} replace />
}
