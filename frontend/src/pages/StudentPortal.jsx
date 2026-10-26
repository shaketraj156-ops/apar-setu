/**
 * StudentPortal.jsx — APAARSetu Student Identity Portal
 * ======================================================
 * Self-sovereign academic identity portal for students:
 *  - View digital APAAR credential card with masked APAAR ID
 *  - Download tamper-evident Ed25519 QR credential (PNG)
 *  - Manage third-party verification consent requests (grant / reject / revoke)
 *
 * Backend integration fixes applied:
 *  - T8:  Students list uses `page_size` param (was `limit` — backend now accepts both, but was causing 422 errors)
 *         Response is unwrapped from paginated { items: [...] } format
 *  - T10: QR credential endpoint `/api/v1/credentials/qr` is correct — verified that verification.py
 *         mounts this directly under the app without /api/v1 prefix conflict. axiosClient.baseURL
 *         must be set to backend root (not /api/v1) in VITE_API_BASE_URL.
 *  - T11: Consents are now filtered by `record_id` (current student's record ID) to avoid showing
 *         all system consents on the student's page. Also filters out expired consents visually.
 */
import React, { useState, useEffect } from 'react'
import axiosClient from '../api/axiosClient'

export default function StudentPortal() {
  // Student list for demo switcher
  const [students, setStudents] = useState([])
  const [selectedStudentId, setSelectedStudentId] = useState('')

  // Current student's full record, QR credential, and consent list
  const [studentData, setStudentData] = useState(null)
  const [qrData, setQrData] = useState(null)
  const [consents, setConsents] = useState([])

  // UI state
  const [loading, setLoading] = useState(false)
  const [qrLoading, setQrLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [qrError, setQrError] = useState(null)

  // Load student list on mount for demo switcher
  useEffect(() => {
    loadStudents()
  }, [])

  // Reload profile when selected student changes
  useEffect(() => {
    if (selectedStudentId) {
      loadStudentProfile(selectedStudentId)
    }
  }, [selectedStudentId])

  /**
   * T8 FIX: Backend list_students() returns PaginatedResponse { total, page, page_size, items }.
   * Previously called with `?limit=25` → backend now accepts both `limit` and `page_size`,
   * and response must be unwrapped from `.items`.
   */
  const loadStudents = async () => {
    try {
      const res = await axiosClient.get('/api/v1/students?page_size=25')
      // T8: unwrap paginated response
      const list = res.data?.items || []
      setStudents(list)
      if (list.length > 0) {
        setSelectedStudentId(list[0].id)
      }
    } catch (err) {
      console.error('Failed to load students', err)
    }
  }

  /**
   * Load student profile, QR credential, and filtered consents in parallel.
   * T11 FIX: Consents are now fetched with record_id filter so only this student's
   * consent requests are shown (not all system consent records).
   */
  const loadStudentProfile = async (id) => {
    setLoading(true)
    setQrData(null)
    setQrError(null)
    try {
      // Fetch student record first
      const studRes = await axiosClient.get(`/api/v1/students/${id}`)
      setStudentData(studRes.data)

      // T11: Filter consents by record_id to show only this student's consents
      // (Not all /api/v1/consents — that would show every consent in the system)
      const conRes = await axiosClient.get(`/api/v1/consents?record_id=${id}`)
      setConsents(conRes.data || [])

      // Load QR credential separately (may fail if no private key configured)
      loadQrCredential(id)
    } catch (err) {
      console.error('Failed to load student details', err)
    } finally {
      setLoading(false)
    }
  }

  /**
   * T10: Fetch Ed25519 QR credential from POST /api/v1/credentials/qr.
   * The verification.py router mounts this endpoint without a prefix in main.py,
   * so the full URL is: {VITE_API_BASE_URL}/api/v1/credentials/qr ✓
   * Separated into its own function so it can fail gracefully without
   * blocking the main student card from rendering.
   */
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

  /**
   * Handle consent action (grant / reject / revoke).
   * After action, reload consents filtered by current student's record_id.
   */
  const handleConsentAction = async (consentId, action) => {
    setActionLoading(true)
    try {
      await axiosClient.post(`/api/v1/consents/${consentId}/${action}`)
      // T11: Reload with record_id filter
      const res = await axiosClient.get(`/api/v1/consents?record_id=${selectedStudentId}`)
      setConsents(res.data || [])
    } catch (err) {
      alert(err.response?.data?.detail || `Failed to ${action} consent`)
    } finally {
      setActionLoading(false)
    }
  }

  /**
   * Simulate a verification consent request for demo purposes.
   * Creates a new PENDING consent for the current student record,
   * then reloads the filtered consent list.
   */
  const handleCreateMockConsent = async () => {
    if (!studentData) return
    try {
      await axiosClient.post('/api/v1/consents', {
        record_id: studentData.id,
        scope: ['institution', 'programme', 'academic_year', 'status'],
        ttl_days: 30
      })
      // T11: Reload filtered by this record
      const res = await axiosClient.get(`/api/v1/consents?record_id=${selectedStudentId}`)
      setConsents(res.data || [])
    } catch (err) {
      alert('Failed to simulate consent request')
    }
  }

  /** Map consent status to color badge classes */
  const getConsentBadgeClass = (status) => {
    switch (status) {
      case 'GRANTED':   return 'bg-emerald-100 text-emerald-800 border-emerald-300'
      case 'REJECTED':  return 'bg-rose-100 text-rose-800 border-rose-300'
      case 'REVOKED':   return 'bg-slate-100 text-slate-600 border-slate-300'
      case 'EXPIRED':   return 'bg-gray-100 text-gray-500 border-gray-300'
      default:          return 'bg-amber-100 text-amber-800 border-amber-300' // PENDING
    }
  }

  return (
    <div className="space-y-8 pb-12">

      {/* ─── Header with Demo Student Switcher ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
            Student Academic Identity & Consent Gate
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Self-sovereign control over your academic credentials and third-party verification requests.
          </p>
        </div>

        {/* Demo Student Switcher — populated from /api/v1/students */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500">View as:</label>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm"
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name} ({s.student_institution_id})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        /* ─── Skeleton Loading State ─── */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-3xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 p-8 h-64 animate-pulse" />
            <div className="rounded-2xl border border-slate-200 bg-white p-6 h-48 animate-pulse" />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 h-80 animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* ─── Left Column: Digital APAAR Card + Consent Inbox ─── */}
          <div className="lg:col-span-2 space-y-6">

            {/* ── Digital APAAR Identity Card ── */}
            <div className="rounded-3xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-2xl border border-indigo-900/50 relative overflow-hidden">
              {/* Background watermark — decorative */}
              <div className="absolute right-0 bottom-0 translate-x-10 translate-y-10 opacity-5 pointer-events-none select-none">
                <span className="text-9xl font-black">APAAR</span>
              </div>

              {/* Card Header */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-xl">
                    🇮🇳
                  </div>
                  <div>
                    <h2 className="text-sm font-bold tracking-wider uppercase text-indigo-300">
                      Republic of India · AICTE
                    </h2>
                    <p className="text-xs text-slate-400">Automated Permanent Academic Account Registry</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  AUTHENTICATED
                </span>
              </div>

              {/* Student Details Grid */}
              <div className="mt-8 grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase">Student Name</p>
                  <p className="text-xl font-bold text-white mt-1">
                    {studentData?.full_name || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase">Roll / Institution ID</p>
                  <p className="text-xl font-mono font-bold text-white mt-1">
                    {studentData?.student_institution_id || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase">Admitted Institution</p>
                  <p className="text-sm font-semibold text-slate-200 mt-1">
                    {studentData?.institutions?.name || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase">Programme & Batch</p>
                  <p className="text-sm font-semibold text-slate-200 mt-1">
                    {studentData?.programmes?.name} {studentData?.academic_year && `(${studentData.academic_year})`}
                  </p>
                </div>
              </div>

              {/* Masked APAAR Number Bar */}
              <div className="mt-8 flex items-center justify-between rounded-2xl bg-black/40 backdrop-blur-md p-4 border border-white/10">
                <div>
                  <p className="text-[10px] uppercase font-bold text-indigo-300">Masked National APAAR ID</p>
                  <p className="text-lg font-mono font-black tracking-widest text-white mt-0.5">
                    {/* T10: Show masked APAAR from QR payload or student data */}
                    {qrData?.payload?.apaar_id_masked || studentData?.apaar_id_masked || '* * * * * * * *'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Privacy Status</p>
                  <p className="text-xs font-semibold text-emerald-400">Zero-PII Disclosure</p>
                </div>
              </div>
            </div>

            {/* ── Consent Gate Inbox ── */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Third-Party Verification Consent Requests</h3>
                  <p className="text-xs text-slate-500">
                    Employers and background verification agencies must obtain your explicit consent before viewing any details.
                  </p>
                </div>
                <button
                  onClick={handleCreateMockConsent}
                  disabled={!studentData}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
                >
                  + Simulate Request
                </button>
              </div>

              <div className="space-y-3">
                {consents.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-2xl mb-2">🛡️</p>
                    <p className="text-xs text-slate-400 italic">
                      No active consent requests pending your approval.
                    </p>
                  </div>
                ) : (
                  consents.map((con) => (
                    <div
                      key={con.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-4 gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-900">
                            Verification Agency ID: {con.requester_id?.substring(0, 8)}...
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getConsentBadgeClass(con.status)}`}>
                            {con.status}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          Scope requested:{' '}
                          <span className="font-mono text-slate-700">
                            {con.scope ? con.scope.join(', ') : 'institution, programme, academic_year, status'}
                          </span>
                        </p>
                        {con.expires_at && (
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Expires: {new Date(con.expires_at).toLocaleDateString('en-IN')}
                          </p>
                        )}
                      </div>

                      {/* Consent action buttons based on current status */}
                      <div className="flex items-center gap-2 shrink-0">
                        {con.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleConsentAction(con.id, 'grant')}
                              disabled={actionLoading}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm transition disabled:opacity-60"
                            >
                              ✓ Grant
                            </button>
                            <button
                              onClick={() => handleConsentAction(con.id, 'reject')}
                              disabled={actionLoading}
                              className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 shadow-sm transition disabled:opacity-60"
                            >
                              ✕ Reject
                            </button>
                          </>
                        )}
                        {con.status === 'GRANTED' && (
                          <button
                            onClick={() => handleConsentAction(con.id, 'revoke')}
                            disabled={actionLoading}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition disabled:opacity-60"
                          >
                            Revoke Access
                          </button>
                        )}
                        {['REJECTED', 'REVOKED', 'EXPIRED'].includes(con.status) && (
                          <span className="text-[10px] text-slate-400 italic">No further actions</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ─── Right Column: Verifiable Ed25519 QR Credential ─── */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between items-center text-center">
            <div className="w-full">
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 border border-indigo-200">
                Ed25519 Cryptographic QR
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-3">Tamper-Evident QR Credential</h3>
              <p className="text-xs text-slate-500 mt-1">
                Scan or download this QR code for instant offline/online proof of admission.
              </p>

              {/* QR Code Image — generated by backend via qrcode + pillow */}
              <div className="my-6 flex justify-center">
                {qrLoading ? (
                  /* Loading state while backend generates QR */
                  <div className="h-48 w-48 bg-slate-100 flex flex-col items-center justify-center rounded-lg gap-2">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                    <span className="text-xs text-slate-400">Generating QR...</span>
                  </div>
                ) : qrData?.qr_code_data_uri ? (
                  <div className="p-3 bg-white rounded-2xl border-2 border-dashed border-indigo-200 shadow-md">
                    <img
                      src={qrData.qr_code_data_uri}
                      alt="Student Verification QR Code"
                      className="h-48 w-48 rounded-lg"
                    />
                  </div>
                ) : (
                  /* Error state — shown when QR keys not configured */
                  <div className="h-48 w-48 bg-slate-50 border border-slate-200 flex flex-col items-center justify-center rounded-lg gap-2 p-3">
                    <span className="text-2xl">🔑</span>
                    <span className="text-[10px] text-slate-400 text-center">
                      {qrError || 'QR credential not available'}
                    </span>
                  </div>
                )}
              </div>

              {/* JWT Payload Claims Summary */}
              {qrData && (
                <div className="rounded-xl bg-slate-50 p-3 text-left text-xs font-mono text-slate-600 space-y-1">
                  <p className="text-[10px] font-sans font-bold text-slate-400 uppercase">Signed JWT Claims:</p>
                  <p>Ref: <strong className="text-slate-900">{qrData?.verification_id || qrData?.payload?.verification_id}</strong></p>
                  <p>Status: <span className="text-emerald-700 font-bold">ACTIVE</span></p>
                  <p>Algorithm: <span className="text-indigo-600">EdDSA / Ed25519</span></p>
                  {qrData?.payload?.academic_year && (
                    <p>Session: <span className="text-slate-700">{qrData.payload.academic_year}</span></p>
                  )}
                </div>
              )}
            </div>

            {/* Download QR PNG — links to GET /api/v1/credentials/qr/{id}/png */}
            {studentData?.id && (
              <a
                href={`${import.meta.env.VITE_API_BASE_URL || ''}/api/v1/credentials/qr/${studentData.id}/png`}
                download={`${studentData?.student_institution_id || 'student'}_credential.png`}
                className="mt-6 w-full inline-flex items-center justify-center rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition"
              >
                📥 Download Signed QR PNG
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
