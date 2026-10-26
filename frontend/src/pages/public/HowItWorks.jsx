import React from 'react'
import { Link } from 'react-router-dom'
import {
  FileSpreadsheet,
  Cpu,
  CheckCircle2,
  Users,
  TrendingUp,
  AlertOctagon,
  Edit3,
  Send,
  BarChart3,
  ShieldAlert,
  UserCheck,
  QrCode,
  ArrowRight
} from 'lucide-react'
import { Card, Badge } from '../../components/common'

const workflowSteps = [
  {
    phase: 'Phase 1: Ingestion',
    steps: [
      {
        num: 1,
        title: 'Institution Collects Admission Data',
        desc: 'Colleges assemble admission records with candidate details, quotas, and verified APAAR IDs.',
        icon: FileSpreadsheet
      },
      {
        num: 2,
        title: 'Batch Upload via CSV or REST API',
        desc: 'Files are uploaded securely to the SNAP ingestion buffer for automated processing.',
        icon: Cpu
      }
    ]
  },
  {
    phase: 'Phase 2: Automated Verification',
    steps: [
      {
        num: 3,
        title: 'Format & APAAR Registry Validation',
        desc: 'The validation engine checks APAAR format, student birthdates, and category eligibility.',
        icon: CheckCircle2
      },
      {
        num: 4,
        title: 'Cross-Institution Duplicate Detection',
        desc: 'Algorithms cross-reference existing submissions to detect duplicate enrolments across all colleges.',
        icon: Users
      },
      {
        num: 5,
        title: 'Approved Intake & Quota Verification',
        desc: 'Real-time check against AICTE sanctioned intake limits, identifying seat capacity breaches.',
        icon: TrendingUp
      },
      {
        num: 6,
        title: 'Exception & Flagging Pipeline',
        desc: 'Invalid records are marked with actionable rule codes and suggested correction steps.',
        icon: AlertOctagon
      }
    ]
  },
  {
    phase: 'Phase 3: Review & Submission',
    steps: [
      {
        num: 7,
        title: 'Inline Correction Workflow',
        desc: 'College staff review flagged records and perform inline corrections without re-uploading entire files.',
        icon: Edit3
      },
      {
        num: 8,
        title: 'Batch Finalization & Central Submission',
        desc: 'Once all errors are resolved, the batch is submitted and locked into the AICTE national repository.',
        icon: Send
      },
      {
        num: 9,
        title: 'AICTE Oversight & Anomaly Monitoring',
        desc: 'Regulators review nationwide metrics, category distributions, and composite risk indices in real time.',
        icon: BarChart3
      }
    ]
  },
  {
    phase: 'Phase 4: Privacy & Verification',
    steps: [
      {
        num: 10,
        title: 'Verification Request Initiated',
        desc: 'An employer or background screening agency requests verification of academic credentials.',
        icon: ShieldAlert
      },
      {
        num: 11,
        title: 'Student Grants or Rejects Consent',
        desc: 'In compliance with DPDP rules, the student approves or denies disclosure from their portal.',
        icon: UserCheck
      },
      {
        num: 12,
        title: 'Ed25519 Tamper-Evident QR Proof',
        desc: 'Authorized verifier receives cryptographically signed proof with zero leakage of Aadhaar or private PII.',
        icon: QrCode
      }
    ]
  }
]

export default function HowItWorks() {
  return (
    <main className="page-shell">
      <header className="page-heading">
        <span className="eyebrow">Lifecycle Architecture</span>
        <h1 className="section-title">How SNAP Works</h1>
        <p className="mt-4 text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300">
          A transparent 4-phase journey connecting institution admissions, automated regulatory audits, and privacy-preserving student verification.
        </p>
      </header>

      <div className="mx-auto max-w-4xl space-y-12">
        {workflowSteps.map((phase) => (
          <div key={phase.phase} className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
              <span>{phase.phase}</span>
            </div>

            <div className="space-y-4">
              {phase.steps.map((s) => {
                const Icon = s.icon
                return (
                  <div
                    key={s.num}
                    className="flex items-start gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 transition-all hover:border-blue-300 dark:hover:border-slate-700"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-sm shadow-sm">
                      {String(s.num).padStart(2, '0')}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                          {s.title}
                        </h2>
                        <Icon className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
                      </div>
                      <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        {s.desc}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16 text-center">
        <Link
          to="/login"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-blue-800 transition"
        >
          <span>Get Started on SNAP</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </main>
  )
}
