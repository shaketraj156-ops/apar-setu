import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet,
  QrCode,
  Users,
  Building2,
  Landmark,
  GraduationCap,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Lock,
  Layers,
  Search,
  AlertTriangle,
  History,
  FileCheck
} from 'lucide-react'
import { DEMO_ENABLED } from '../../config/demoAccounts'
import { Badge, Button, Card } from '../../components/common'

const stats = [
  { label: 'AICTE Compliance', value: '100%', detail: 'Intake & Quota Monitoring' },
  { label: 'Cryptography', value: 'Ed25519', detail: 'Tamper-Evident Signatures' },
  { label: 'Privacy Framework', value: 'DPDP', detail: 'Zero-PII Disclosure' },
  { label: 'Ingestion Speed', value: '< 2.5s', detail: 'Per 1,000 Records Batch' }
]

const workflowSteps = [
  { step: '01', title: 'Data Ingestion', desc: 'Colleges upload student admission batches via secure CSV or REST API.', icon: FileSpreadsheet },
  { step: '02', title: 'Automated Validation', desc: 'Rules engine verifies APAAR IDs, category quotas, and registry records.', icon: CheckCircle2 },
  { step: '03', title: 'Duplicate Triage', desc: 'Heuristic algorithms detect multi-college concurrent enrolments instantly.', icon: Search },
  { step: '04', title: 'AICTE Oversight', desc: 'Central command dashboards alert regulators to intake breaches and anomalies.', icon: Landmark },
  { step: '05', title: 'Cryptographic QR', desc: 'Students receive digitally signed Ed25519 credentials for zero-leak verification.', icon: QrCode }
]

const features = [
  {
    title: 'APAAR ID Identity Linking',
    desc: 'Binds college admission records to India’s Automated Permanent Academic Account Registry for lifelong continuity.',
    icon: ShieldCheck,
    gradient: 'from-blue-600 to-indigo-600'
  },
  {
    title: 'Batch & API Upload Pipeline',
    desc: 'High-throughput ingestion of CSV/Excel datasets with real-time row-by-row error reporting and correction.',
    icon: FileSpreadsheet,
    gradient: 'from-emerald-600 to-teal-600'
  },
  {
    title: 'Cross-College Duplicate Alert',
    desc: 'Eliminates ghost students and concurrent multi-institution enrollments before academic terms begin.',
    icon: Users,
    gradient: 'from-purple-600 to-pink-600'
  },
  {
    title: 'Approved Intake Enforcement',
    desc: 'Tracks supernumerary, NRI, and category quotas against AICTE approved limits with automated alerts.',
    icon: TrendingUp,
    gradient: 'from-amber-500 to-orange-600'
  },
  {
    title: 'Self-Sovereign Consent Gate',
    desc: 'Students control third-party verifier access. Grant, reject, or revoke access to academic claims anytime.',
    icon: Lock,
    gradient: 'from-indigo-600 to-blue-700'
  },
  {
    title: 'Tamper-Evident QR Verification',
    desc: 'Offline and online verification using asymmetric Ed25519 cryptography without exposing Aadhaar or PII.',
    icon: QrCode,
    gradient: 'from-cyan-600 to-blue-600'
  },
  {
    title: 'Immutable Audit Trail',
    desc: 'Every upload, inline correction, and consent transaction is securely recorded in append-only audit tables.',
    icon: History,
    gradient: 'from-slate-700 to-slate-900'
  },
  {
    title: 'Executive Analytics & Reports',
    desc: 'Exportable compliance reports in CSV, Excel, and PDF formats for academic councils and inspectors.',
    icon: FileCheck,
    gradient: 'from-rose-600 to-red-600'
  }
]

const roles = [
  {
    title: 'Institution Admin & Staff',
    subtitle: 'Colleges & Universities',
    desc: 'Ingest student rosters, resolve row-level validation findings inline, and submit verified batches to AICTE.',
    icon: Building2,
    color: 'border-blue-500/30 bg-blue-50/50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/60',
    link: '/institution'
  },
  {
    title: 'AICTE Oversight Officer',
    subtitle: 'National Regulatory Body',
    desc: 'Monitor nationwide intake utilization, review anomaly risk scores, and triage cross-institution duplicate enrolments.',
    icon: Landmark,
    color: 'border-purple-500/30 bg-purple-50/50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-900/60',
    link: '/aicte'
  },
  {
    title: 'Student & Learner',
    subtitle: 'Academic Identity Owner',
    desc: 'Access your digital APAAR ID credential card, download signed QR codes, and approve verification requests.',
    icon: GraduationCap,
    color: 'border-emerald-500/30 bg-emerald-50/50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/60',
    link: '/student'
  },
  {
    title: 'Employer & Verifier',
    subtitle: 'Third-Party Verification',
    desc: 'Cryptographically authenticate student enrolment claims with zero exposure to sensitive personal records.',
    icon: CheckCircle2,
    color: 'border-teal-500/30 bg-teal-50/50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-300 dark:border-teal-900/60',
    link: '/verifier'
  }
]

const ecosystem = ['AICTE', 'APAAR Registry', 'Digital India', 'DPDP Act 2023', 'Ed25519 Signatures', 'Supabase Auth', 'Zero-PII Verification', 'Immutable Audit Trail']

/** Fades/slides its children in once they scroll into view. */
function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') { setVisible(true); return }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); io.disconnect() }
    }, { threshold: 0.12 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} className={`reveal ${visible ? 'is-visible' : ''} ${className}`} style={{ '--reveal-delay': `${delay}ms` }}>
      {children}
    </div>
  )
}

export default function Home() {
  return (
    <div className="space-y-0">
      
      {/* ─── Hero Section with Mesh & Mock Preview ─── */}
      <section className="hero-surface hero-grid border-b border-slate-200/80 dark:border-slate-800">
        <div className="aurora -top-24 -left-24 h-96 w-96 bg-blue-400" />
        <div className="aurora top-10 right-0 h-[26rem] w-[26rem] bg-violet-400" style={{ animationDelay: '-5s' }} />
        <div className="aurora -bottom-32 left-1/3 h-80 w-80 bg-rose-300" style={{ animationDelay: '-9s' }} />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            
            {/* Left Column: Headline & Action */}
            <div className="lg:col-span-7 space-y-6">
              
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white/90 px-3.5 py-1 text-xs font-bold text-blue-800 shadow-2xs backdrop-blur-md dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300">
                <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                <span>Student Network &amp; APAAR Portal · AICTE</span>
              </div>

              <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl leading-[1.12]">
                One Verified Academic Identity for{' '}
                <span className="text-snap-gradient">Every Student</span>
              </h1>

              <p className="max-w-2xl text-base sm:text-lg leading-relaxed text-slate-600 dark:text-slate-300">
                SNAP powers AICTE-approved institutions with cryptographic APAAR ID validation, instant duplicate detection, approved quota monitoring, and tamper-evident student credentials.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  to="/login"
                  className="bg-snap-gradient inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/30 hover:brightness-110 hover:-translate-y-0.5 transition active:scale-[0.99]"
                >
                  <span>Open Role Portal</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                {DEMO_ENABLED && (
                  <Link
                    to="/demo"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition"
                  >
                    <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span>Try Interactive Demo</span>
                  </Link>
                )}

                <Link
                  to="/how-it-works"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
                >
                  Explore Workflow
                </Link>
              </div>

              {/* Micro proof badges */}
              <div className="flex flex-wrap items-center gap-4 pt-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  National APAAR Registry Synced
                </span>
                <span className="flex items-center gap-1.5">
                  <Lock className="h-4 w-4 text-blue-500" />
                  DPDP Consent Protected
                </span>
              </div>
            </div>

            {/* Right Column: High-Fidelity Mock Credential & Dashboard Card */}
            <div className="lg:col-span-5 relative">
              <div className="float-slow -top-5 -left-2 absolute z-20 hidden sm:flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 text-xs font-bold text-slate-800 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100">
                <ShieldCheck className="h-4 w-4 text-emerald-500" /> Zero-PII Verified
              </div>
              <div className="float-slower -bottom-5 -right-2 absolute z-20 hidden sm:flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 text-xs font-bold text-slate-800 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100">
                <QrCode className="h-4 w-4 text-violet-500" /> Signed QR Ready
              </div>
              <div className="relative mx-auto max-w-md rounded-3xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-7 text-white shadow-2xl border border-indigo-500/20 overflow-hidden">
                
                {/* Decorative glow */}
                <div className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-violet-500/30 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 h-44 w-44 rounded-full bg-rose-500/20 blur-3xl pointer-events-none" />

                {/* Card Top */}
                <div className="flex items-start justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white p-1.5 shadow-md">
                      <img src="/snap-logo.png" alt="SNAP logo" className="h-full w-full object-contain" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold tracking-widest uppercase text-indigo-300">
                        Republic of India · AICTE
                      </p>
                      <p className="text-xs text-slate-300 font-medium">SNAP Digital APAAR Credential</p>
                    </div>
                  </div>

                  <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-[10px] font-bold text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    VERIFIED
                  </span>
                </div>

                {/* Student Info */}
                <div className="mt-5 space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">Student Name</span>
                      <p className="font-bold text-white text-sm">Aarav Sharma</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">Roll / ID</span>
                      <p className="font-mono font-bold text-white text-sm">CS2026-042</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">Institution</span>
                      <p className="font-semibold text-slate-200">Delhi Institute of Tech</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">Programme</span>
                      <p className="font-semibold text-slate-200">B.Tech CSE (2025-26)</p>
                    </div>
                  </div>

                  {/* Masked APAAR ID */}
                  <div className="rounded-xl bg-black/40 p-3 border border-white/10 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] uppercase font-bold text-indigo-300 tracking-wider">Masked APAAR ID</p>
                      <p className="font-mono font-bold text-white text-sm tracking-widest mt-0.5">
                        •••• •••• 9842
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-[10px] font-mono text-indigo-300 border border-indigo-400/30">
                        Ed25519 Signed
                      </span>
                    </div>
                  </div>
                </div>

                {/* Floating validation pill badge */}
                <div className="mt-5 flex items-center justify-between rounded-xl bg-white/10 backdrop-blur-md px-3.5 py-2 border border-white/15 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span className="text-slate-200 font-medium">Duplicate Check Passed</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400">0 Breaches</span>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── Trust / Stats Strip ─── */}
      <section className="border-b border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900/90 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center sm:text-left">
                <p className="text-2xl sm:text-3xl font-black tracking-tight text-snap-gradient">
                  {s.value}
                </p>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 mt-1">
                  {s.label}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {s.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-8 overflow-hidden border-t border-slate-200/70 pt-5 dark:border-slate-800" aria-hidden="true">
          <div className="marquee gap-3">
            {[...ecosystem, ...ecosystem].map((item, i) => (
              <span key={i} className="mx-1.5 inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
                <Sparkles className="h-3 w-3 text-violet-500" /> {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── The Challenge & Solution ─── */}
      <section className="section-wrap bg-slate-50/70 dark:bg-slate-950/40">
        <div className="mx-auto max-w-7xl">
          <Reveal className="text-center max-w-3xl mx-auto mb-14">
            <span className="eyebrow">Data Integrity Challenge</span>
            <h2 className="section-title">Why Higher Education Needs SNAP</h2>
            <p className="mt-4 text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300">
              Fragmented student data reporting across institutions leads to undetected duplicate enrolments, unapproved intake overflows, and delayed credential verification.
            </p>
          </Reveal>

          <div className="grid gap-6 md:grid-cols-3">
            <Reveal delay={0}><Card hover className="glow-card h-full space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Multi-College Concurrent Enrolment</h3>
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Students enrolling in multiple colleges or claiming duplicate seat allocations without cross-institutional validation visibility.
              </p>
            </Card></Reveal>

            <Reveal delay={100}><Card hover className="glow-card h-full space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Approved Intake Breaches</h3>
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Institutions admitting beyond sanctioned council seats, with manual audit reviews only detecting discrepancies long after admission cycles.
              </p>
            </Card></Reveal>

            <Reveal delay={200}><Card hover className="glow-card h-full space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Slow & Invasive Verification</h3>
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Employers and verifiers requesting full paper transcripts, violating privacy principles and creating bottlenecks for student employment.
              </p>
            </Card></Reveal>
          </div>
        </div>
      </section>

      {/* ─── Workflow Stepper ─── */}
      <section className="section-wrap bg-white dark:bg-slate-900">
        <div className="mx-auto max-w-7xl">
          <Reveal className="text-center max-w-3xl mx-auto mb-14">
            <span className="eyebrow">End-to-End Workflow</span>
            <h2 className="section-title">How Data Travels Safely on SNAP</h2>
            <p className="mt-4 text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300">
              A 5-step automated validation lifecycle connecting college admission desks to national regulatory monitoring.
            </p>
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {workflowSteps.map((ws, idx) => {
              const Icon = ws.icon
              return (
                <Reveal key={ws.step} delay={idx * 90}><div
                  className="relative h-full rounded-2xl border border-slate-200/90 bg-slate-50/50 p-5 transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-850 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-mono text-xs font-black text-blue-700 dark:text-blue-400">
                        {ws.step}
                      </span>
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{ws.title}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{ws.desc}</p>
                  </div>
                </div></Reveal>
              )
            })}
          </div>

          <div className="mt-10 text-center">
            <Link
              to="/how-it-works"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400 hover:underline"
            >
              <span>Read the comprehensive step-by-step documentation</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Platform Capabilities Grid ─── */}
      <section className="section-wrap bg-slate-50/70 dark:bg-slate-950/40">
        <div className="mx-auto max-w-7xl">
          <Reveal className="text-center max-w-3xl mx-auto mb-14">
            <span className="eyebrow">Enterprise Features</span>
            <h2 className="section-title">Architected for National Scale</h2>
            <p className="mt-4 text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300">
              Engineered with modern cryptographic primitives, real-time analytics, and role-based zero-trust security.
            </p>
          </Reveal>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => {
              const Icon = f.icon
              return (
                <Reveal key={f.title} delay={(features.indexOf(f) % 4) * 90}><Card hover className="glow-card h-full flex flex-col justify-between space-y-4">
                  <div>
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${f.gradient} text-white shadow-md`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-sm font-bold text-slate-900 dark:text-white">{f.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{f.desc}</p>
                  </div>
                </Card></Reveal>
              )
            })}
          </div>

          <div className="mt-10 text-center">
            <Link
              to="/features"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400 hover:underline"
            >
              <span>Explore full technical feature catalog</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Role Cards ─── */}
      <section className="section-wrap bg-white dark:bg-slate-900">
        <div className="mx-auto max-w-7xl">
          <Reveal className="text-center max-w-3xl mx-auto mb-14">
            <span className="eyebrow">User Roles</span>
            <h2 className="section-title">Built for Every Stakeholder</h2>
            <p className="mt-4 text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300">
              Dedicated, specialized workspaces tailored for college registrars, AICTE officials, students, and employers.
            </p>
          </Reveal>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {roles.map((r, ri) => {
              const Icon = r.icon
              return (
                <Reveal key={r.title} delay={ri * 100}><div
                  className={`h-full rounded-2xl border p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${r.color}`}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-slate-900 mb-4">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider opacity-75">{r.subtitle}</span>
                  <h3 className="text-base font-black text-slate-900 dark:text-white mt-1">{r.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{r.desc}</p>
                  
                  <div className="mt-5 pt-4 border-t border-slate-200/60 dark:border-slate-800/60">
                    <Link
                      to={r.link}
                      className="inline-flex items-center gap-1 text-xs font-bold text-slate-900 dark:text-white hover:underline"
                    >
                      <span>Explore Portal</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div></Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="section-wrap bg-gradient-to-b from-blue-900 via-indigo-950 to-slate-950 text-white relative overflow-hidden">
        <div className="aurora -top-20 left-0 h-80 w-80 bg-blue-500" />
        <div className="aurora bottom-0 right-0 h-80 w-80 bg-fuchsia-500" style={{ animationDelay: '-6s' }} />
        <div className="aurora -bottom-10 left-1/2 h-64 w-64 bg-rose-500" style={{ animationDelay: '-10s' }} />
        
        <div className="mx-auto max-w-4xl text-center relative z-10 space-y-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/30 bg-blue-500/10 px-3.5 py-1 text-xs font-bold text-blue-300">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Ready for Immediate Deployment</span>
          </span>

          <img src="/snap-logo.png" alt="" className="float-slow mx-auto h-20 w-20 rounded-3xl bg-white p-2 shadow-2xl" />
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Transform Your Institution’s Academic Record Lifecycle
          </h2>

          <p className="text-sm sm:text-base leading-relaxed text-blue-200 max-w-2xl mx-auto">
            Experience the full capabilities of SNAP. Sign in with your institutional credentials or launch our one-click interactive sandbox.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-slate-950 shadow-lg hover:bg-blue-50 transition"
            >
              <span>Login to Portal</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            {DEMO_ENABLED && (
              <Link
                to="/demo"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur-md hover:bg-white/15 transition"
              >
                <Sparkles className="h-4 w-4 text-amber-300" />
                <span>Launch Demo Accounts</span>
              </Link>
            )}

            <Link
              to="/register"
              className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold text-blue-200 hover:text-white transition"
            >
              Request Access
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
