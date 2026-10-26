import React from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, Lock, CheckCircle2, ExternalLink } from 'lucide-react'

const publicLinks = [
  { label: 'Home', href: '/' },
  { label: 'Features', href: '/features' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'About SNAP', href: '/about' }
]

const portalLinks = [
  { label: 'Institution Portal', href: '/institution' },
  { label: 'AICTE Oversight', href: '/aicte' },
  { label: 'Student Identity', href: '/student' },
  { label: 'Verifier Engine', href: '/verifier' }
]

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/90 transition-colors">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          
          {/* Brand Col */}
          <div className="space-y-4 lg:col-span-1">
            <Link to="/" className="flex items-center gap-2.5">
              <img src="/snap-logo.png" alt="SNAP logo" className="h-9 w-9 object-contain" />
              <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                SNAP
              </span>
            </Link>

            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              National academic records validation and tamper-evident credential verification engine for AICTE-approved institutions.
            </p>

            <div className="inline-flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-900 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/40">
              <span>⚠️ Demonstration sandbox with synthetic data</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Platform
            </h3>
            <ul className="mt-3.5 space-y-2 text-xs">
              {publicLinks.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    to={href}
                    className="text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Portals */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Role Portals
            </h3>
            <ul className="mt-3.5 space-y-2 text-xs">
              {portalLinks.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    to={href}
                    className="text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Trust & Compliance */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Security & Privacy
            </h3>
            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Ed25519 Cryptographic Signatures</span>
              </div>
              <div className="flex items-start gap-2">
                <Lock className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <span>DPDP Minimal Disclosure Standard</span>
              </div>
              <div className="flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                <span>Immutable Append-Only Audit Trail</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Strip */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-800 pt-6 text-xs text-slate-500 dark:text-slate-400">
          <p>© {new Date().getFullYear()} SNAP (Student Network &amp; APAAR Portal). AICTE Academic Data Management Platform.</p>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              All Systems Operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
