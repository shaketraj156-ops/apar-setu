import React, { useState } from 'react'
import axiosClient from '../api/axiosClient'

export default function VerifierPortal() {
  const [tokenInput, setTokenInput] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [result, setResult] = useState(null)
  const [loadingDemo, setLoadingDemo] = useState(false)

  const handleVerify = async (token) => {
    const t = token || tokenInput
    if (!t) {
      alert('Please enter or scan a valid token')
      return
    }
    setVerifying(true)
    setResult(null)
    try {
      const res = await axiosClient.get(`/api/v1/verify/qr?t=${encodeURIComponent(t.trim())}`)
      setResult(res.data)
    } catch (err) {
      setResult({ valid: false, reason: 'network_or_server_error' })
    } finally {
      setVerifying(false)
    }
  }

  const handleFetchSampleToken = async () => {
    setLoadingDemo(true)
    try {
      const sRes = await axiosClient.get('/api/v1/students?limit=1')
      if (sRes.data?.students?.length > 0) {
        const studentId = sRes.data.students[0].id
        const qrRes = await axiosClient.post('/api/v1/credentials/qr', { record_id: studentId })
        const sampleToken = qrRes.data.token
        setTokenInput(sampleToken)
        handleVerify(sampleToken)
      }
    } catch (err) {
      alert('Failed to generate sample verification token')
    } finally {
      setLoadingDemo(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="text-center">
        <span className="rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-xs font-bold border border-emerald-200">
          Public Trust & Verification Engine
        </span>
        <h1 className="text-2xl font-black text-slate-900 sm:text-3xl mt-3">
          Tamper-Evident Academic Credential Verification
        </h1>
        <p className="mt-1 text-sm text-slate-500 max-w-xl mx-auto">
          Verify authentic AICTE student enrolment using cryptographic Ed25519 signatures and the principle of minimum necessary disclosure.
        </p>
      </div>

      {/* Principle of Minimum Necessary Disclosure Notice */}
      <div className="rounded-2xl bg-indigo-50/80 border border-indigo-100 p-4 flex items-start gap-3 text-xs text-indigo-900">
        <span className="text-lg">🛡️</span>
        <div>
          <strong className="font-bold">Zero-Exposure Privacy Guarantee:</strong>
          <p className="mt-0.5 text-indigo-700">
            In compliance with the DPDP framework and AICTE guidelines, APAARSetu never discloses Aadhaar numbers, full APAAR IDs, home addresses, or parent details to third-party verifiers.
          </p>
        </div>
      </div>

      {/* Token Input & Scan Box */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Verification Token (from QR Code scan)
          </label>
          <textarea
            rows={3}
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Paste raw Ed25519 JWT token (e.g. eyJhbGciOiJFZERTQSI...)"
            className="mt-1 w-full rounded-xl border border-slate-300 p-3 font-mono text-xs focus:border-indigo-500 focus:outline-hidden"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={handleFetchSampleToken}
            disabled={loadingDemo}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline"
          >
            {loadingDemo ? 'Generating sample...' : '⚡ Load & Verify Live Student Token'}
          </button>

          <button
            onClick={() => handleVerify()}
            disabled={verifying}
            className="w-full sm:w-auto rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition"
          >
            {verifying ? 'Verifying Signature...' : '🔍 Cryptographically Verify'}
          </button>
        </div>
      </div>

      {/* Verification Result Card */}
      {result && (
        <div className={`rounded-2xl border p-6 shadow-lg transition-all ${
          result.valid
            ? 'bg-emerald-50/40 border-emerald-300'
            : 'bg-rose-50/40 border-rose-300'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl font-black ${
              result.valid ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200' : 'bg-rose-500 text-white'
            }`}>
              {result.valid ? '✓' : '✕'}
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                {result.valid ? 'ACADEMIC RECORD VERIFIED & AUTHENTIC' : 'VERIFICATION FAILED'}
              </h2>
              <p className="text-xs font-medium text-slate-500">
                {result.valid
                  ? 'Cryptographic Ed25519 digital signature verified successfully against national registry public keys.'
                  : `Reason: ${result.reason}`}
              </p>
            </div>
          </div>

          {result.valid && result.payload && (
            <div className="mt-6 rounded-xl bg-white p-5 border border-slate-200/80 shadow-xs grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-400 uppercase font-semibold text-[10px]">Verification Reference</p>
                <p className="font-mono font-bold text-slate-900 text-sm mt-0.5">{result.payload.verification_id}</p>
              </div>

              <div>
                <p className="text-slate-400 uppercase font-semibold text-[10px]">Masked APAAR ID</p>
                <p className="font-mono font-bold text-indigo-700 text-sm mt-0.5">{result.payload.apaar_id_masked}</p>
              </div>

              <div>
                <p className="text-slate-400 uppercase font-semibold text-[10px]">Institution</p>
                <p className="font-semibold text-slate-900 mt-0.5">{result.payload.institution}</p>
              </div>

              <div>
                <p className="text-slate-400 uppercase font-semibold text-[10px]">Programme & Batch</p>
                <p className="font-semibold text-slate-900 mt-0.5">
                  {result.payload.programme} ({result.payload.academic_year})
                </p>
              </div>

              <div>
                <p className="text-slate-400 uppercase font-semibold text-[10px]">Roll / Institution ID</p>
                <p className="font-mono font-bold text-slate-900 mt-0.5">{result.payload.student_institution_id}</p>
              </div>

              <div>
                <p className="text-slate-400 uppercase font-semibold text-[10px]">Enrolment Status</p>
                <span className="inline-block rounded-md bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 mt-0.5">
                  {result.payload.status}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
