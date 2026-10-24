import React, { useState } from 'react'
import Navbar from './components/Navbar'
import AictePortal from './pages/AictePortal'
import InstitutionPortal from './pages/InstitutionPortal'
import StudentPortal from './pages/StudentPortal'
import VerifierPortal from './pages/VerifierPortal'

export default function App() {
  const [activePortal, setActivePortal] = useState('aicte')

  return (
    <div className="min-h-screen bg-slate-50/60 font-sans text-slate-900 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar activePortal={activePortal} setActivePortal={setActivePortal} />

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {activePortal === 'aicte' && <AictePortal />}
        {activePortal === 'institution' && <InstitutionPortal />}
        {activePortal === 'student' && <StudentPortal />}
        {activePortal === 'verifier' && <VerifierPortal />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-xs text-slate-500 sm:flex-row sm:px-6">
          <p>© 2026 AICTE · All India Council for Technical Education. APAARSetu Student Record Ecosystem.</p>
          <div className="flex gap-4">
            <span className="text-slate-400">DigiLocker Linked</span>
            <span>·</span>
            <span className="text-slate-400">Academic Bank of Credits (ABC)</span>
            <span>·</span>
            <span className="text-slate-400">Ed25519 Cryptographic Trust</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
