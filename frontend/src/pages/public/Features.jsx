import React from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck,
  FileSpreadsheet,
  CheckCircle2,
  Users,
  TrendingUp,
  LayoutDashboard,
  Lock,
  QrCode,
  FileCheck,
  History,
  Sparkles,
  ArrowRight
} from 'lucide-react'
import { Card, Badge } from '../../components/common'

const featureCategories = [
  {
    category: 'Ingestion & Identity',
    items: [
      {
        title: 'APAAR-Based Student Identity',
        desc: 'Connect admission records directly to India’s Automated Permanent Academic Account Registry for lifelong student continuity.',
        icon: ShieldCheck,
        badge: 'Core Primitive'
      },
      {
        title: 'High-Throughput Batch Upload',
        desc: 'Upload institution records via standard CSV or Excel files with pre-validation and row-level parsing.',
        icon: FileSpreadsheet,
        badge: 'CSV / Excel'
      },
      {
        title: 'Automated Multi-Rule Validation',
        desc: 'Validates APAAR checksums, admission dates, programme categories, and quotas in sub-second intervals.',
        icon: CheckCircle2,
        badge: 'Automated'
      }
    ]
  },
  {
    category: 'Regulatory Oversight & Quality',
    items: [
      {
        title: 'Heuristic Duplicate Enrolment Detection',
        desc: 'Identifies intra-batch duplicates and cross-institution seat overlaps with explainable risk scoring.',
        icon: Users,
        badge: 'Multi-College'
      },
      {
        title: 'Approved Intake Quota Monitoring',
        desc: 'Compares real-time admissions against AICTE council-sanctioned seats, highlighting unapproved overflows.',
        icon: TrendingUp,
        badge: 'AICTE Sanctioned'
      },
      {
        title: 'Real-Time Executive Dashboards',
        desc: 'National bird’s-eye visualisations of admission trends, category diversity, and anomaly indices.',
        icon: LayoutDashboard,
        badge: 'Live Analytics'
      }
    ]
  },
  {
    category: 'Privacy & Cryptographic Verification',
    items: [
      {
        title: 'Self-Sovereign Consent Gate',
        desc: 'Enforces DPDP principles by requiring explicit student authorisation before third-party verification disclosure.',
        icon: Lock,
        badge: 'DPDP Aligned'
      },
      {
        title: 'Tamper-Evident Ed25519 QR Credentials',
        desc: 'Cryptographically signed digital diplomas and student status cards verifiable without revealing sensitive PII.',
        icon: QrCode,
        badge: 'Zero-Disclosure'
      },
      {
        title: 'Immutable Append-Only Audit Trail',
        desc: 'Full forensic logging of all institutional submissions, inline row corrections, and regulator actions.',
        icon: History,
        badge: 'Append-Only'
      }
    ]
  }
]

export default function Features() {
  return (
    <main className="page-shell">
      <header className="page-heading">
        <span className="eyebrow">Enterprise Capabilities</span>
        <h1 className="section-title">Built for Trusted Academic Records</h1>
        <p className="mt-4 text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300">
          Explore the modular architecture powering SNAP from initial batch upload to cryptographic zero-knowledge verification.
        </p>
      </header>

      <div className="space-y-12">
        {featureCategories.map((cat) => (
          <div key={cat.category} className="space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                {cat.category}
              </span>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {cat.items.map((item) => {
                const Icon = item.icon
                return (
                  <Card key={item.title} hover className="flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400">
                          <Icon className="h-5 w-5" />
                        </div>
                        <Badge variant="brand" size="xs">{item.badge}</Badge>
                      </div>

                      <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        {item.title}
                      </h2>
                      <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                        {item.desc}
                      </p>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* CTA Box */}
      <div className="mt-16 rounded-3xl bg-gradient-to-r from-blue-700 to-indigo-800 p-8 text-center text-white shadow-xl shadow-blue-900/10">
        <h2 className="text-2xl font-black">Experience the platform live</h2>
        <p className="mt-2 text-xs sm:text-sm text-blue-100 max-w-xl mx-auto">
          Test the ingestion pipeline, explore AICTE analytics, or scan a tamper-evident QR credential right in the demo sandbox.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/demo"
            className="rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-blue-900 hover:bg-blue-50 transition shadow-sm"
          >
            Launch Interactive Demo
          </Link>
          <Link
            to="/login"
            className="rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 text-xs font-bold text-white hover:bg-white/15 transition"
          >
            Sign In to Portal
          </Link>
        </div>
      </div>
    </main>
  )
}
