import React, { useState } from 'react'
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  QrCode,
  Zap,
  Lock,
  Search,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react'
import axiosClient from '../api/axiosClient'
import { Card, Button, Badge } from '../components/common'

export default function VerifierPortal() {
  const [tokenInput, setTokenInput] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [result, setResult] = useState(null)
  const [loadingDemo, setLoadingDemo] = useState(false)
  const [copied, setCopied] = useState(false)

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
      const studentList = sRes.data?.items || sRes.data?.students || []
      if (studentList.length > 0) {
        const studentId = studentList[0].id
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

  const copyRef = (text) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800 dark:border-teal-900/60 dark:bg-teal-950/60 dark:text-teal-300">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Public Trust & Verification Engine</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
          Tamper-Evident Academic Credential Verification
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
          Verify authentic AICTE student enrolment using cryptographic Ed25519 signatures and the principle of minimum necessary disclosure.
        </p>
      </div>

      {/* Privacy Guarantee Notice */}
      <Card className="bg-gradient-to-r from-indigo-50/90 to-blue-50/90 border-indigo-200/80 dark:from-indigo-950/40 dark:to-blue-950/40 dark:border-indigo-900/60">
        <div className="flex items-start gap-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
            <Lock className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-950 dark:text-indigo-200">
              Zero-Exposure Privacy Guarantee (DPDP Framework)
            </h3>
            <p className="text-xs leading-relaxed text-indigo-900/80 dark:text-indigo-300">
              In strict adherence to the DPDP Act 2023 and AICTE data standards, SNAP never exposes Aadhaar numbers, raw APAAR identifiers, home addresses, or parental records to third-party verification bodies.
            </p>
          </div>
        </div>
      </Card>

      {/* Token Input Box */}
      <Card className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Cryptographic Token (Extracted from QR Code Scan)
          </label>
          <textarea
            rows={3}
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Paste raw Ed25519 JWT credential token (e.g. eyJhbGciOiJFZERTQSI...)"
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3.5 font-mono text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleFetchSampleToken}
            disabled={loadingDemo}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline cursor-pointer disabled:opacity-50"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>{loadingDemo ? 'Generating sample token…' : 'Load & Verify Live Sample Token'}</span>
          </button>

          <Button
            type="button"
            variant="primary"
            size="md"
            loading={verifying}
            onClick={() => handleVerify()}
            icon={QrCode}
            className="w-full sm:w-auto"
          >
            {verifying ? 'Validating Signature…' : 'Cryptographically Verify'}
          </Button>
        </div>
      </Card>

      {/* Verification Result Card */}
      {result && (
        <div
          className={`rounded-2xl border p-6 shadow-lg transition-all animate-in fade-in-50 duration-200 ${
            result.valid
              ? 'bg-emerald-50/70 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800'
              : 'bg-rose-50/70 border-rose-300 dark:bg-rose-950/40 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-md ${
                result.valid
                  ? 'bg-emerald-600 shadow-emerald-500/20'
                  : 'bg-rose-600 shadow-rose-500/20'
              }`}
            >
              {result.valid ? <CheckCircle2 className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {result.valid ? 'ACADEMIC RECORD AUTHENTIC & VERIFIED' : 'VERIFICATION SIGNATURE INVALID'}
                </h2>
                <Badge variant={result.valid ? 'success' : 'danger'} size="xs">
                  {result.valid ? 'Authentic' : 'Failed'}
                </Badge>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                {result.valid
                  ? 'Cryptographic Ed25519 digital signature verified against official AICTE national registry keys.'
                  : `Reason: ${result.reason || 'Signature could not be matched against public registry.'}`}
              </p>
            </div>
          </div>

          {result.valid && result.payload && (
            <div className="mt-6 rounded-xl bg-white dark:bg-slate-900 p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-400 dark:text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                  Verification Reference
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                    {result.payload.verification_id}
                  </span>
                  <button
                    onClick={() => copyRef(result.payload.verification_id)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title="Copy reference ID"
                  >
                    {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>

              <div>
                <p className="text-slate-400 dark:text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                  Masked APAAR Identifier
                </p>
                <p className="font-mono font-bold text-blue-700 dark:text-blue-400 text-sm mt-1">
                  {result.payload.apaar_id_masked}
                </p>
              </div>

              <div>
                <p className="text-slate-400 dark:text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                  Admitted Institution
                </p>
                <p className="font-bold text-slate-900 dark:text-white mt-1">
                  {result.payload.institution}
                </p>
              </div>

              <div>
                <p className="text-slate-400 dark:text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                  Programme & Academic Year
                </p>
                <p className="font-bold text-slate-900 dark:text-white mt-1">
                  {result.payload.programme} ({result.payload.academic_year})
                </p>
              </div>

              <div>
                <p className="text-slate-400 dark:text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                  Roll / Institution Student ID
                </p>
                <p className="font-mono font-bold text-slate-900 dark:text-white mt-1">
                  {result.payload.student_institution_id}
                </p>
              </div>

              <div>
                <p className="text-slate-400 dark:text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                  Admission Enrolment Status
                </p>
                <div className="mt-1">
                  <Badge variant="success" size="sm" dot>
                    {result.payload.status}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
