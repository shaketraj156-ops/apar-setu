import React from 'react'

export default function Navbar({ activePortal, setActivePortal, apiHealth }) {
  const portals = [
    { id: 'aicte', label: 'AICTE Command', icon: '🏛️', desc: 'National Oversight & KPIs' },
    { id: 'institution', label: 'Institution Studio', icon: '🎓', desc: 'Upload & Row Correction' },
    { id: 'student', label: 'Student Identity', icon: '👤', desc: 'Consent & QR Credential' },
    { id: 'verifier', label: 'Public Verifier', icon: '🔍', desc: 'Tamper-Evident QR Verification' }
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-tr from-indigo-600 to-violet-600 text-white font-bold shadow-md shadow-indigo-200">
            AS
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight text-slate-900">APAAR<span className="text-indigo-600">Setu</span></span>
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
                AICTE Official
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">National Student Record & Verification Ecosystem</p>
          </div>
        </div>

        {/* Portal Tabs */}
        <nav className="hidden md:flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/80">
          {portals.map((portal) => {
            const isActive = activePortal === portal.id
            return (
              <button
                key={portal.id}
                onClick={() => setActivePortal(portal.id)}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <span>{portal.icon}</span>
                <span>{portal.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Status indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>API Online :8000</span>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="flex md:hidden border-t border-slate-100 overflow-x-auto px-4 py-2 gap-2">
        {portals.map((portal) => (
          <button
            key={portal.id}
            onClick={() => setActivePortal(portal.id)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold ${
              activePortal === portal.id
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            <span>{portal.icon}</span>
            <span>{portal.label}</span>
          </button>
        ))}
      </div>
    </header>
  )
}
