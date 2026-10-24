import React from 'react'
import { Link, Navigate, Route, Routes, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/layout/Footer'
import axiosClient from '../api/axiosClient'
import useAuth from '../hooks/useAuth'
import ProtectedRoute from './ProtectedRoute'
import RoleBasedRedirect from './RoleBasedRedirect'

const Home = React.lazy(() => import('../pages/public/Home'))
const Features = React.lazy(() => import('../pages/public/Features'))
const HowItWorks = React.lazy(() => import('../pages/public/HowItWorks'))
const About = React.lazy(() => import('../pages/public/About'))
const Login = React.lazy(() => import('../pages/auth/Login'))
const Register = React.lazy(() => import('../pages/auth/Register'))
const AictePortal = React.lazy(() => import('../pages/AictePortal'))
const InstitutionPortal = React.lazy(() => import('../pages/InstitutionPortal'))
const StudentPortal = React.lazy(() => import('../pages/StudentPortal'))
const VerifierPortal = React.lazy(() => import('../pages/VerifierPortal'))

const institutionRoles = ['institution_staff', 'institution_admin']
const aicteRoles = ['aicte_officer', 'auditor', 'system_admin']
function AccessDenied() { const { role } = useAuth(); return <main className="page-shell"><section className="info-card mx-auto max-w-xl text-center"><h1 className="text-2xl font-extrabold">Access Denied</h1><p className="mt-3 text-slate-600">Your account role does not have access to this page.</p><div className="mt-6"><RoleBasedRedirect role={role} /></div></section></main> }
function FindingsPage() {
  const { batchId } = useParams(); const [state, setState] = React.useState({ loading: true, batch: null, error: '' })
  React.useEffect(() => { let active = true; axiosClient.get(`/api/v1/batches/${batchId}`).then(({ data }) => { if (active) setState({ loading: false, batch: data, error: '' }) }).catch((error) => { if (active) setState({ loading: false, batch: null, error: error.response?.data?.detail || 'Unable to load validation findings.' }) }); return () => { active = false } }, [batchId])
  if (state.loading) return <main className="page-shell page-state">Loading validation findings…</main>
  if (state.error) return <main className="page-shell"><p className="form-error">{state.error}</p></main>
  return <main className="page-shell"><Link to="/institution" className="font-semibold text-blue-700">← Institution portal</Link><h1 className="mt-5 text-3xl font-extrabold">Validation Findings</h1><p className="mt-2 text-slate-600">Batch {state.batch?.file_name || batchId}</p><div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50"><tr>{['Row', 'Rule', 'Severity', 'Finding', 'Suggested action'].map((heading) => <th className="px-4 py-3 font-semibold" key={heading}>{heading}</th>)}</tr></thead><tbody>{(state.batch?.findings || []).map((finding) => <tr className="border-t border-slate-100" key={finding.id || `${finding.row_number}-${finding.rule_code}`}><td className="px-4 py-3">{finding.row_number}</td><td className="px-4 py-3">{finding.rule_code}</td><td className="px-4 py-3">{finding.severity}</td><td className="px-4 py-3">{finding.message}</td><td className="px-4 py-3">{finding.recommended_action || 'Review record'}</td></tr>)}{!state.batch?.findings?.length && <tr><td className="px-4 py-6 text-center text-slate-500" colSpan="5">No findings for this batch.</td></tr>}</tbody></table></div></main>
}
function AuditPage() { return <main className="page-shell"><h1 className="text-3xl font-extrabold">Audit Logs</h1><div className="info-card mt-6"><p className="font-semibold text-slate-900">Audit log API is not connected to the frontend yet.</p><p className="mt-2 text-slate-600">The current backend does not expose an audit route. This page is reserved for the authorized audit workflow.</p></div></main> }
function PortalShell({ children }) { return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main> }
function AppFrame() { return <><Navbar /><React.Suspense fallback={<div className="page-state" role="status">Loading page…</div>}><Routes>
  <Route path="/" element={<Home />} /><Route path="/features" element={<Features />} /><Route path="/how-it-works" element={<HowItWorks />} /><Route path="/about" element={<About />} />
  <Route path="/login" element={<Login />} /><Route path="/register" element={<Register />} />
  <Route element={<ProtectedRoute allowedRoles={institutionRoles} />}><Route path="/institution" element={<PortalShell><InstitutionPortal /></PortalShell>} /><Route path="/institution/students" element={<PortalShell><InstitutionPortal /></PortalShell>} /><Route path="/institution/batches/:batchId/findings" element={<FindingsPage />} /></Route>
  <Route element={<ProtectedRoute allowedRoles={aicteRoles} />}><Route path="/aicte" element={<PortalShell><AictePortal /></PortalShell>} /><Route path="/aicte/reports" element={<PortalShell><AictePortal /></PortalShell>} /><Route path="/aicte/audit" element={<AuditPage />} /></Route>
  <Route element={<ProtectedRoute allowedRoles={['student']} />}><Route path="/student" element={<PortalShell><StudentPortal /></PortalShell>} /><Route path="/student/consent" element={<PortalShell><StudentPortal /></PortalShell>} /></Route>
  <Route element={<ProtectedRoute allowedRoles={['verifier']} />}><Route path="/verifier" element={<PortalShell><VerifierPortal /></PortalShell>} /><Route path="/verifier/verify" element={<PortalShell><VerifierPortal /></PortalShell>} /></Route>
  <Route path="/access-denied" element={<AccessDenied />} /><Route path="*" element={<Navigate to="/" replace />} />
 </Routes></React.Suspense><Footer /></> }

export default function AppRoutes() { return <AppFrame /> }
