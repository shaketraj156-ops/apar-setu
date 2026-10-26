/**
 * AppRoutes.jsx — SNAP Application Router
 * ==============================================
 * Central routing configuration for all portals and pages.
 *
 * Route structure:
 *   /                           → Public home page
 *   /features                   → Feature listing page
 *   /how-it-works               → Step-by-step workflow page
 *   /about                      → About SNAP page
 *   /login                      → Supabase auth login
 *   /demo                       → One-click demo access (when VITE_ENABLE_DEMO=true)
 *   /register                   → Supabase auth registration
 *
 *   /institution                → Institution Portal (institution_staff, institution_admin)
 *   /institution/students       → Same portal, students sub-view
 *   /institution/batches/:id    → Batch validation findings detail
 *
 *   /aicte                      → AICTE National Dashboard (aicte_officer, auditor, system_admin)
 *   /aicte/reports              → Reports sub-view
 *   /aicte/audit                → T12: Full audit log viewer (replaces old stub)
 *
 *   /student                    → Student Identity & Consent Portal (student role)
 *   /student/consent            → Consent management sub-view
 *
 *   /verifier                   → Verifier Portal (verifier role)
 *   /verifier/verify            → Verification sub-view
 *
 * Security:
 *   - ProtectedRoute wrapper enforces authentication via useAuth hook
 *   - Role-based access: each portal section has allowedRoles guard
 *   - Unauthorized users are redirected to role-appropriate dashboard via RoleBasedRedirect
 */
import React from 'react'
import { Link, Navigate, Route, Routes, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/layout/Footer'
import DemoBanner from '../components/DemoBanner'
import axiosClient from '../api/axiosClient'
import useAuth from '../hooks/useAuth'
import ProtectedRoute from './ProtectedRoute'
import RoleBasedRedirect from './RoleBasedRedirect'

/* ─── Lazy-loaded page components (code-split per route) ─── */
const Home = React.lazy(() => import('../pages/public/Home'))
const Features = React.lazy(() => import('../pages/public/Features'))
const HowItWorks = React.lazy(() => import('../pages/public/HowItWorks'))
const About = React.lazy(() => import('../pages/public/About'))
const Login = React.lazy(() => import('../pages/auth/Login'))
const Demo = React.lazy(() => import('../pages/public/Demo'))
const Register = React.lazy(() => import('../pages/auth/Register'))
const AictePortal = React.lazy(() => import('../pages/AictePortal'))
const InstitutionPortal = React.lazy(() => import('../pages/InstitutionPortal'))
const StudentPortal = React.lazy(() => import('../pages/StudentPortal'))
const VerifierPortal = React.lazy(() => import('../pages/VerifierPortal'))
// T12: Real AuditLogs page — replaces old placeholder stub
const AuditLogs = React.lazy(() => import('../pages/aicte/AuditLogs'))

/* ─── Role group constants for ProtectedRoute ─── */
const institutionRoles = ['institution_staff', 'institution_admin']
const aicteRoles = ['aicte_officer', 'auditor', 'system_admin']

import DashboardLayout from '../components/layout/DashboardLayout'
import { Card, Badge, Button } from '../components/common'
import { ArrowLeft, ShieldAlert, AlertCircle, FileSpreadsheet } from 'lucide-react'

/**
 * AccessDenied — shown when a logged-in user tries to access a portal
 * they don't have the role for. Offers a redirect to their own portal.
 */
function AccessDenied() {
  const { role } = useAuth()
  return (
    <main className="page-shell">
      <Card className="mx-auto max-w-lg text-center p-8 space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Access Restricted</h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Your current account role does not possess the permissions required to view this portal.
        </p>
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <RoleBasedRedirect role={role} />
        </div>
      </Card>
    </main>
  )
}

/**
 * FindingsPage — displays validation findings for a specific batch.
 * Accessed from InstitutionPortal via /institution/batches/:batchId/findings
 * Fetches batch + findings from GET /api/v1/batches/{batchId} (Supabase-direct path).
 */
function FindingsPage() {
  const { batchId } = useParams()
  const [state, setState] = React.useState({ loading: true, batch: null, error: '' })

  React.useEffect(() => {
    let active = true
    axiosClient.get(`/api/v1/batches/${batchId}`)
      .then(({ data }) => {
        if (active) setState({ loading: false, batch: data, error: '' })
      })
      .catch((error) => {
        if (active) setState({
          loading: false,
          batch: null,
          error: error.response?.data?.detail || 'Unable to load validation findings.'
        })
      })
    return () => { active = false }
  }, [batchId])

  if (state.loading) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 animate-pulse">
        Loading validation findings…
      </div>
    )
  }

  if (state.error) {
    return (
      <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-700">
        {state.error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to="/institution"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Institution Portal</span>
        </Link>
        <Badge variant="brand" size="xs">
          Batch #{batchId?.slice(0, 8)}
        </Badge>
      </div>

      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Batch Validation Findings</h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {state.batch?.file_name || 'Roster Upload'} · Total Findings: {state.batch?.findings?.length || 0}
        </p>
      </div>

      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/60">
                {['Row', 'Rule Code', 'Severity', 'Finding Description', 'Suggested Action'].map((heading) => (
                  <th key={heading} className="px-4 py-3.5 font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {(state.batch?.findings || []).map((finding) => (
                <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-850" key={finding.id || `${finding.row_number}-${finding.rule_code}`}>
                  <td className="px-4 py-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                    #{finding.row_number}
                  </td>
                  <td className="px-4 py-3 font-mono text-blue-700 dark:text-blue-400 font-semibold">
                    {finding.rule_code}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={finding.severity === 'error' ? 'danger' : 'warning'} size="xs" dot>
                      {finding.severity}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                    {finding.message}
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                    {finding.recommended_action || 'Review record'}
                  </td>
                </tr>
              ))}
              {!state.batch?.findings?.length && (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-400 italic" colSpan="5">
                    No validation errors or findings for this batch. All records verified.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

/** PortalShell — wraps all portal pages in DashboardLayout with sidebar & topbar */
function PortalShell({ children }) {
  return <DashboardLayout>{children}</DashboardLayout>
}

/**
 * AppFrame — root layout with Navbar, lazy-loaded route content, and Footer.
 * All routes are defined here with role-based guards via ProtectedRoute.
 */
function AppFrame() {
  return (
    <>
      <Navbar />
      <DemoBanner />
      <React.Suspense fallback={<div className="page-state" role="status">Loading page…</div>}>
        <Routes>
          {/* ── Public Pages (no auth required) ── */}
          <Route path="/" element={<Home />} />
          <Route path="/features" element={<Features />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/about" element={<About />} />

          {/* ── Auth Pages ── */}
          <Route path="/login" element={<Login />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/register" element={<Register />} />

          {/* ── Institution Portal (institution_staff, institution_admin) ── */}
          <Route element={<ProtectedRoute allowedRoles={institutionRoles} />}>
            <Route path="/institution" element={<PortalShell><InstitutionPortal /></PortalShell>} />
            <Route path="/institution/students" element={<PortalShell><InstitutionPortal /></PortalShell>} />
            <Route path="/institution/batches/:batchId/findings" element={<PortalShell><FindingsPage /></PortalShell>} />
          </Route>

          {/* ── AICTE National Dashboard (aicte_officer, auditor, system_admin) ── */}
          <Route element={<ProtectedRoute allowedRoles={aicteRoles} />}>
            <Route path="/aicte" element={<PortalShell><AictePortal /></PortalShell>} />
            <Route path="/aicte/reports" element={<PortalShell><AictePortal /></PortalShell>} />
            {/* T12: Real audit logs page — replaces old stub AuditPage */}
            <Route path="/aicte/audit" element={<PortalShell><AuditLogs /></PortalShell>} />
          </Route>

          {/* ── Student Portal (student role) ── */}
          <Route element={<ProtectedRoute allowedRoles={['student']} />}>
            <Route path="/student" element={<PortalShell><StudentPortal /></PortalShell>} />
            <Route path="/student/consent" element={<PortalShell><StudentPortal /></PortalShell>} />
          </Route>

          {/* ── Verifier Portal (verifier role) ── */}
          <Route element={<ProtectedRoute allowedRoles={['verifier']} />}>
            <Route path="/verifier" element={<PortalShell><VerifierPortal /></PortalShell>} />
            <Route path="/verifier/verify" element={<PortalShell><VerifierPortal /></PortalShell>} />
          </Route>

          {/* ── Error / Catch-all routes ── */}
          <Route path="/access-denied" element={<AccessDenied />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </React.Suspense>
      <Footer />
    </>
  )
}

export default function AppRoutes() {
  return <AppFrame />
}
