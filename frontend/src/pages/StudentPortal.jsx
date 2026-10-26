import React, { useState, useEffect } from 'react'
import {
  ShieldCheck,
  QrCode,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Lock,
  UserCheck,
  AlertCircle,
  ExternalLink,
  ChevronDown
} from 'lucide-react'
import axiosClient from '../api/axiosClient'
import { Card, Button, Badge, Skeleton } from '../components/common'

export default function StudentPortal() {
  const [students, setStudents] = useState([])
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [studentData, setStudentData] = useState(null)
  const [qrData, setQrData] = useState(null)
  const [consents, setConsents] = useState([])
  const [loading, setLoading] = useState(false)
  const [qrLoading, setQrLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [qrError, setQrError] = useState(null)

  useEffect(() => {
    loadStudents()
  }, [])

  useEffect(() => {
    if (selectedStudentId) {
      loadStudentProfile(selectedStudentId)
    }
  }, [selectedStudentId])

  const loadStudents = async () => {
    try {
      const res = await axiosClient.get('/api/v1/students?page_size=25')
      const list = res.data?.items || []
      setStudents(list)
      if (list.length > 0) {
        setSelectedStudentId(list[0].id)
      }
    } catch (err) {
      console.error('Failed to load students', err)
    }
  }

  const loadStudentProfile = async (id) => {
    setLoading(true)
    setQrData(null)
    setQrError(null)
    try {
      const studRes = await axiosClient.get(`/api/v1/students/${id}`)
      setStudentData(studRes.data)

      const conRes = await axiosClient.get(`/api/v1/consents?record_id=${id}`)
      setConsents(conRes.data || [])

      loadQrCredential(id)
    } catch (err) {
      console.error('Failed to load student details', err)
    } finally {
      setLoading(false)
    }
  }

  const loadQrCredential = async (id) => {
    setQrLoading(true)
    try {
      const qrRes = await axiosClient.post('/api/v1/credentials/qr', { record_id: id })
      setQrData(qrRes.data)
    } catch (err) {
      console.error('Failed to generate QR credential', err)
      setQrError('QR credential generation requires QR keys to be configured in backend .env')
    } finally {
      setQrLoading(false)
    }
  }

  const handleConsentAction = async (consentId, action) => {
    setActionLoading(true)
    try {
      await axiosClient.post(`/api/v1/consents/${consentId}/${action}`)
      const res = await axiosClient.get(`/api/v1/consents?record_id=${selectedStudentId}`)
      setConsents(res.data || [])
    } catch (err) {
      alert(err.response?.data?.detail || `Failed to ${action} consent`)
    } finally {
      setActionLoading(false)
    }
  }

  const handleCreateMockConsent = async () => {
    if (!studentData) return
    try {
      await axiosClient.post('/api/v1/consents', {
        record_id: studentData.id,
        scope: ['institution', 'programme', 'academic_year', 'status'],
        ttl_days: 30
      })
      const res = await axiosClient.get(`/api/v1/consents?record_id=${selectedStudentId}`)
      setConsents(res.data || [])
    } catch (err) {
      alert('Failed to simulate consent request')
    }
  }

  const getConsentBadgeVariant = (status) => {
    switch (status) {
      case 'GRANTED': return 'success'
      case 'REJECTED': return 'danger'
      case 'REVOKED': return 'neutral'
      case 'EXPIRED': return 'neutral'
      default: return 'warning'
    }
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header with Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300 mb-1.5">
            <UserCheck className="h-3.5 w-3.5" />
            <span>Self-Sovereign Academic Identity</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            Student Identity & Consent Gate
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Control your verified academic credentials and approve third-party background screening requests.
          </p>
        </div>

        {/* Demo Switcher */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Switch Profile:
          </label>
          <div className="relative">
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="appearance-none rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-1.5 pr-8 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name} ({s.student_institution_id})
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton variant="rectangular" height="260px" />
            <Skeleton variant="rectangular" height="220px" />
          </div>
          <Skeleton variant="rectangular" height="500px" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          
          {/* Left Column: Digital Credential Card + Consent Gate */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Digital Identity Card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-tr from-slate-950 via-indigo-950 to-blue-950 p-6 sm:p-8 text-white shadow-2xl border border-indigo-500/30">
              
              {/* Background watermark */}
              <div className="absolute right-0 bottom-0 translate-x-8 translate-y-8 opacity-5 pointer-events-none select-none">
                <span className="text-9xl font-black">APAAR</span>
              </div>
              <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />

              {/* Card Header */}
              <div className="relative z-10 flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-2xl shadow-sm">
                    🇮🇳
                  </div>
                  <div>
                    <h2 className="text-xs font-bold tracking-widest uppercase text-indigo-300">
                      Republic of India · AICTE
                    </h2>
                    <p className="text-xs text-slate-300 font-medium">
                      Automated Permanent Academic Account Registry
                    </p>
                  </div>
                </div>

                <Badge variant="success" size="sm" dot>
                  AUTHENTICATED
                </Badge>
              </div>

              {/* Student Details Grid */}
              <div className="relative z-10 mt-8 grid grid-cols-2 gap-5">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Student Legal Name
                  </p>
                  <p className="text-lg sm:text-xl font-black text-white mt-0.5">
                    {studentData?.full_name || '—'}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Roll / Institution ID
                  </p>
                  <p className="text-lg sm:text-xl font-mono font-bold text-white mt-0.5">
                    {studentData?.student_institution_id || '—'}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Admitted Institution
                  </p>
                  <p className="text-xs sm:text-sm font-semibold text-slate-200 mt-0.5">
                    {studentData?.institutions?.name || '—'}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Programme & Session
                  </p>
                  <p className="text-xs sm:text-sm font-semibold text-slate-200 mt-0.5">
                    {studentData?.programmes?.name} {studentData?.academic_year && `(${studentData.academic_year})`}
                  </p>
                </div>
              </div>

              {/* Masked National APAAR ID Bar */}
              <div className="relative z-10 mt-7 flex items-center justify-between rounded-2xl bg-black/40 backdrop-blur-md p-4 border border-white/10">
                <div>
                  <p className="text-[9px] uppercase font-bold text-indigo-300 tracking-wider">
                    National APAAR Identifier
                  </p>
                  <p className="text-base sm:text-lg font-mono font-black tracking-widest text-white mt-0.5">
                    {qrData?.payload?.apaar_id_masked || studentData?.apaar_id_masked || '•••• •••• ••••'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">
                    Privacy Guarantee
                  </p>
                  <p className="text-xs font-semibold text-emerald-400 mt-0.5">
                    Zero-PII Disclosure
                  </p>
                </div>
              </div>

            </div>

            {/* Consent Gate Inbox */}
            <Card className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Third-Party Verification Consent Requests
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Background verification agencies must obtain your consent before accessing academic claims.
                  </p>
                </div>
                <button
                  onClick={handleCreateMockConsent}
                  disabled={!studentData}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition disabled:opacity-50"
                >
                  + Simulate Request
                </button>
              </div>

              <div className="space-y-3">
                {consents.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                    No active consent requests pending your review.
                  </div>
                ) : (
                  consents.map((con) => (
                    <div
                      key={con.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-100 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-850 p-4 gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            Requester: {con.requester_id?.substring(0, 10)}…
                          </span>
                          <Badge variant={getConsentBadgeVariant(con.status)} size="xs">
                            {con.status}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Scope:{' '}
                          <span className="font-mono text-slate-700 dark:text-slate-300">
                            {con.scope ? con.scope.join(', ') : 'institution, programme, academic_year, status'}
                          </span>
                        </p>
                        {con.expires_at && (
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Valid until: {new Date(con.expires_at).toLocaleDateString('en-IN')}
                          </p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        {con.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleConsentAction(con.id, 'grant')}
                              disabled={actionLoading}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-2xs transition disabled:opacity-50"
                            >
                              Grant
                            </button>
                            <button
                              onClick={() => handleConsentAction(con.id, 'reject')}
                              disabled={actionLoading}
                              className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 shadow-2xs transition disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {con.status === 'GRANTED' && (
                          <button
                            onClick={() => handleConsentAction(con.id, 'revoke')}
                            disabled={actionLoading}
                            className="rounded-lg border border-rose-300 bg-white dark:bg-slate-900 px-3 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition disabled:opacity-50"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

          </div>

          {/* Right Column: Ed25519 QR Credential */}
          <Card className="flex flex-col justify-between items-center text-center p-6 space-y-6">
            <div className="w-full">
              <Badge variant="brand" size="xs">
                Ed25519 Cryptographic QR
              </Badge>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-2">
                Tamper-Evident Credential
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Scan or download this QR token for offline or online proof of admission.
              </p>

              {/* QR Container */}
              <div className="my-6 flex justify-center">
                {qrLoading ? (
                  <div className="h-48 w-48 bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center rounded-2xl gap-2">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                    <span className="text-xs text-slate-400">Generating QR…</span>
                  </div>
                ) : qrData?.qr_code_data_uri ? (
                  <div className="p-3 bg-white rounded-2xl border-2 border-dashed border-blue-200 dark:border-blue-900/60 shadow-md">
                    <img
                      src={qrData.qr_code_data_uri}
                      alt="Student Verification QR Code"
                      className="h-44 w-44 rounded-xl"
                    />
                  </div>
                ) : (
                  <div className="h-48 w-48 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center rounded-2xl gap-2 p-4">
                    <QrCode className="h-8 w-8 text-slate-400" />
                    <span className="text-[10px] text-slate-400 text-center">
                      {qrError || 'QR credential not available'}
                    </span>
                  </div>
                )}
              </div>

              {/* Claims summary */}
              {qrData && (
                <div className="rounded-xl bg-slate-50 dark:bg-slate-850 p-3.5 text-left text-xs font-mono text-slate-600 dark:text-slate-400 space-y-1">
                  <p className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider">
                    Signed JWT Claims:
                  </p>
                  <p className="truncate">
                    Ref: <strong className="text-slate-900 dark:text-white">{qrData?.verification_id || qrData?.payload?.verification_id}</strong>
                  </p>
                  <p>
                    Status: <span className="text-emerald-600 dark:text-emerald-400 font-bold">ACTIVE</span>
                  </p>
                  <p>
                    Cipher: <span className="text-blue-600 dark:text-blue-400 font-bold">Ed25519</span>
                  </p>
                </div>
              )}
            </div>

            {/* Download Button */}
            {studentData?.id && (
              <a
                href={`${import.meta.env.VITE_API_BASE_URL || ''}/api/v1/credentials/qr/${studentData.id}/png`}
                download={`${studentData?.student_institution_id || 'student'}_credential.png`}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-800 transition"
              >
                <Download className="h-4 w-4" />
                <span>Download Signed QR PNG</span>
              </a>
            )}
          </Card>

        </div>
      )}
    </div>
  )
}
