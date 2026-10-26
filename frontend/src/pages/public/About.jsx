import React from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck,
  Building2,
  Users,
  Lock,
  Landmark,
  Scale,
  Sparkles,
  ArrowRight
} from 'lucide-react'
import { Card } from '../../components/common'

const aboutCards = [
  {
    title: 'Mission & Vision',
    desc: 'To establish a unified, tamper-evident digital bridge between AICTE-approved institutions and national academic registries, enabling frictionless verification while upholding student privacy.',
    icon: ShieldCheck
  },
  {
    title: 'The Core Challenge',
    desc: 'Indian technical education spans thousands of approved institutions. Disparate admission reporting historically created duplicate enrollment blind spots and compliance monitoring friction.',
    icon: Landmark
  },
  {
    title: 'What is APAAR ID?',
    desc: 'The Automated Permanent Academic Account Registry (APAAR) is an initiative of the Ministry of Education, Government of India, establishing a lifelong unique academic identifier for every student.',
    icon: Scale
  },
  {
    title: 'DPDP Privacy Architecture',
    desc: 'Built in alignment with the Digital Personal Data Protection (DPDP) Act, SNAP practices minimal necessary disclosure: Aadhaar and raw identifiers are never exposed to verifiers.',
    icon: Lock
  },
  {
    title: 'Cryptographic Credentialing',
    desc: 'Every verified student record is backed by an Ed25519 digital signature, ensuring credentials can be validated offline and online with absolute mathematical certainty.',
    icon: Sparkles
  },
  {
    title: 'Multi-Stakeholder Portals',
    desc: 'Custom-designed workspaces tailored specifically for institutional registrars, national regulators, students, and corporate background verifiers.',
    icon: Users
  }
]

export default function About() {
  return (
    <main className="page-shell">
      <header className="page-heading">
        <span className="eyebrow">About SNAP</span>
        <h1 className="section-title">A Clearer Path from Admission to Trusted Verification</h1>
        <p className="mt-4 text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300">
          SNAP (Student Network &amp; APAAR Portal) is an APAAR ID-based student data management and verification platform engineered for AICTE-approved technical institutions across India.
        </p>
      </header>

      <div className="mx-auto max-w-5xl grid gap-6 md:grid-cols-2">
        {aboutCards.map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.title} hover className="space-y-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">{item.title}</h2>
              <p className="text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {item.desc}
              </p>
            </Card>
          )
        })}
      </div>

      <div className="mx-auto mt-12 max-w-5xl rounded-2xl border border-amber-300/80 bg-amber-50/80 p-5 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
        <div className="flex items-start gap-3">
          <span className="text-lg">🛡️</span>
          <div>
            <strong className="text-xs font-bold uppercase tracking-wider block">
              Demonstration Platform Notice
            </strong>
            <p className="mt-1 text-xs leading-relaxed text-amber-900/90 dark:text-amber-300">
              The current deployment uses synthetic student records, a mock APAAR registry, and demonstration encryption keys. No real citizen PII is processed or stored in this environment.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
