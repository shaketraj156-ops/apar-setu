import React from 'react'
import { NavLink, Link } from 'react-router-dom'
import {
  Building2,
  Users,
  Landmark,
  FileText,
  History,
  GraduationCap,
  ShieldCheck,
  QrCode,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ExternalLink
} from 'lucide-react'
import clsx from 'clsx'
import useAuth from '../../hooks/useAuth'
import { Badge } from '../common'

const roleNavItems = {
  institution_admin: [
    { label: 'Intake & Batches', href: '/institution', icon: Building2 },
    { label: 'Student Roster', href: '/institution/students', icon: Users }
  ],
  institution_staff: [
    { label: 'Intake & Batches', href: '/institution', icon: Building2 },
    { label: 'Student Roster', href: '/institution/students', icon: Users }
  ],
  aicte_officer: [
    { label: 'National Oversight', href: '/aicte', icon: Landmark },
    { label: 'Compliance Reports', href: '/aicte/reports', icon: FileText },
    { label: 'Audit Trail', href: '/aicte/audit', icon: History }
  ],
  system_admin: [
    { label: 'National Oversight', href: '/aicte', icon: Landmark },
    { label: 'Compliance Reports', href: '/aicte/reports', icon: FileText },
    { label: 'Audit Trail', href: '/aicte/audit', icon: History }
  ],
  auditor: [
    { label: 'National Oversight', href: '/aicte', icon: Landmark },
    { label: 'Audit Trail', href: '/aicte/audit', icon: History }
  ],
  student: [
    { label: 'Digital APAAR Card', href: '/student', icon: GraduationCap },
    { label: 'Consent Inbox', href: '/student/consent', icon: ShieldCheck }
  ],
  verifier: [
    { label: 'Verify Credential', href: '/verifier', icon: QrCode }
  ]
}

const roleBadgeVariants = {
  institution_admin: 'info',
  institution_staff: 'info',
  aicte_officer: 'purple',
  system_admin: 'neutral',
  auditor: 'warning',
  student: 'success',
  verifier: 'brand'
}

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const { role, profile } = useAuth()
  const navItems = roleNavItems[role] || []
  const badgeVariant = roleBadgeVariants[role] || 'neutral'

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 flex flex-col justify-between border-r transition-all duration-300 ease-in-out',
          'bg-white border-slate-200/90 dark:bg-slate-900 dark:border-slate-800',
          'lg:static lg:z-auto',
          collapsed ? 'lg:w-20' : 'lg:w-64',
          mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div>
          {/* Header */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-slate-100 dark:border-slate-800">
            <Link to="/" className="flex items-center gap-3 overflow-hidden">
              <img src="/snap-logo.png" alt="SNAP logo" className="h-9 w-9 shrink-0 object-contain" />
              {(!collapsed || mobileOpen) && (
                <div className="min-w-0">
                  <span className="block text-sm font-black tracking-tight text-slate-900 dark:text-white truncate">
                    SNAP
                  </span>
                  <span className="block text-[10px] font-semibold text-slate-400 truncate">
                    Role Portal
                  </span>
                </div>
              )}
            </Link>

            {/* Collapse toggle (desktop only) */}
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          {/* User Role Tag */}
          <div className="p-3">
            <div
              className={clsx(
                'rounded-xl border p-2.5 transition-all',
                'bg-slate-50/80 border-slate-200/80 dark:bg-slate-850 dark:border-slate-800',
                collapsed && 'lg:p-2 lg:text-center'
              )}
            >
              {collapsed ? (
                <div className="text-center font-bold text-[10px] uppercase text-blue-700 dark:text-blue-400">
                  {role?.slice(0, 3)}
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Active Role
                    </span>
                    <Badge variant={badgeVariant} size="xs" dot>
                      {role?.replace('_', ' ')}
                    </Badge>
                  </div>
                  {profile?.full_name && (
                    <p className="mt-1 text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {profile.full_name}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1" aria-label="Portal Navigation">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  end={item.href === '/institution' || item.href === '/aicte' || item.href === '/student' || item.href === '/verifier'}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold transition-all duration-150',
                      isActive
                        ? 'bg-blue-50 text-blue-700 shadow-xs dark:bg-blue-950/60 dark:text-blue-400'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
                      collapsed && 'lg:justify-center lg:px-2'
                    )
                  }
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {(!collapsed || mobileOpen) && <span className="truncate">{item.label}</span>}
                </NavLink>
              )
            })}
          </nav>
        </div>

        {/* Footer info in sidebar */}
        {(!collapsed || mobileOpen) && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500">
            <p className="font-semibold text-slate-600 dark:text-slate-400">AICTE SafeData v2.4</p>
            <p className="mt-0.5 text-[10px]">Ed25519 Cryptographic Layer</p>
          </div>
        )}
      </aside>
    </>
  )
}
