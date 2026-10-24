import React, { useState, useEffect } from 'react'
import axiosClient from '../api/axiosClient'

export default function StudentPortal() {
  const [students, setStudents] = useState([])
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [studentData, setStudentData] = useState(null)
  const [qrData, setQrData] = useState(null)
  const [consents, setConsents] = useState([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

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
      const res = await axiosClient.get('/api/v1/students?limit=25')
      const list = res.data?.students || []
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
    try {
      const [studRes, qrRes, conRes] = await Promise.all([
        axiosClient.get(`/api/v1/students/${id}`),
        axiosClient.post('/api/v1/credentials/qr', { record_id: id }),
        axiosClient.get('/api/v1/consents')
      ])
      setStudentData(studRes.data)
      setQrData(qrRes.data)
      // Filter consents for this student or mock list
      setConsents(conRes.data || [])
    } catch (err) {
      console.error('Failed to load student details', err)
    } finally {
      setLoading(false)
    }
  }

  const handleConsentAction = async (consentId, action) => {
    setActionLoading(true)
    try {
      await axiosClient.post(`/api/v1/consents/${consentId}/${action}`)
      // Reload consents
      const res = await axiosClient.get('/api/v1/consents')
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
      const res = await axiosClient.get('/api/v1/consents')
      setConsents(res.data || [])
    } catch (err) {
      alert('Failed to request consent')
    }
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Student Profile Switcher Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">Student Academic Identity & Consent Gate</h1>
          <p className="mt-1 text-sm text-slate-500">
            Self-sovereign control over your academic credentials and third-party verification requests.
          </p>
        </div>

        {/* Demo Switcher */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500">Demo Student:</label>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-xs"
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
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Digital APAAR Card (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-3xl bg-linear-to-tr from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-2xl border border-indigo-900/50 relative overflow-hidden">
              {/* Background watermark */}
              <div className="absolute right-0 bottom-0 translate-x-10 translate-y-10 opacity-5 pointer-events-none">
                <span className="text-9xl font-black">APAAR</span>
              </div>

              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white font-black text-xl">
                    🇮🇳
                  </div>
                  <div>
                    <h2 className="text-sm font-bold tracking-wider uppercase text-indigo-300">Republic of India · AICTE</h2>
                    <p className="text-xs text-slate-400">Automated Permanent Academic Account Registry</p>
                  </div>
                </div>

                <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  AUTHENTICATED
                </span>
              </div>

              {/* Student Details */}
              <div className="mt-8 grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase">Student Name</p>
                  <p className="text-xl font-bold text-white mt-1">{studentData?.full_name}</p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase">Roll / Institution ID</p>
                  <p className="text-xl font-mono font-bold text-white mt-1">{studentData?.student_institution_id}</p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase">Admitted Institution</p>
                  <p className="text-sm font-semibold text-slate-200 mt-1">{studentData?.institutions?.name}</p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase">Programme & Batch</p>
                  <p className="text-sm font-semibold text-slate-200 mt-1">
                    {studentData?.programmes?.name} ({studentData?.academic_year})
                  </p>
                </div>
              </div>

              {/* Masked APAAR Number Bar */}
              <div className="mt-8 flex items-center justify-between rounded-2xl bg-black/40 backdrop-blur-md p-4 border border-white/10">
                <div>
                  <p className="text-[10px] uppercase font-bold text-indigo-300">Masked National APAAR ID</p>
                  <p className="text-lg font-mono font-black tracking-widest text-white mt-0.5">
                    {qrData?.payload?.apaar_id_masked || '********4821'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Privacy Status</p>
                  <p className="text-xs font-semibold text-emerald-400">Zero-PII Disclosure</p>
                </div>
              </div>
            </div>

            {/* Consent Gate Inbox */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Third-Party Verification Consent Requests</h3>
                  <p className="text-xs text-slate-500">
                    Employers and background verification agencies must obtain your explicit consent.
                  </p>
                </div>

                <button
                  onClick={handleCreateMockConsent}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  + Simulate Verification Request
                </button>
              </div>

              <div className="space-y-3">
                {consents.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center italic">
                    No active consent requests pending your approval.
                  </p>
                ) : (
                  consents.map((con) => (
                    <div
                      key={con.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-4 gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            Verification Agency / Employer ID: {con.requester_id?.substring(0, 8)}...
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            con.status === 'GRANTED'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : con.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : 'bg-amber-100 text-amber-800 border-amber-300'
                          }`}>
                            {con.status}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          Scope requested: <span className="font-mono text-slate-700">institution, programme, academic_year, status</span>
                        </p>
                      </div>

                      {con.status === 'PENDING' ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleConsentAction(con.id, 'grant')}
                            disabled={actionLoading}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs"
                          >
                            ✓ Grant
                          </button>
                          <button
                            onClick={() => handleConsentAction(con.id, 'reject')}
                            disabled={actionLoading}
                            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 shadow-xs"
                          >
                            ✕ Reject
                          </button>
                        </div>
                      ) : con.status === 'GRANTED' ? (
                        <button
                          onClick={() => handleConsentAction(con.id, 'revoke')}
                          disabled={actionLoading}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                        >
                          Revoke Access
                        </button>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Verifiable Signed QR Credential Box (1 col) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between items-center text-center">
            <div className="w-full">
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 border border-indigo-200">
                Ed25519 Cryptographic QR
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-3">Tamper-Evident QR Credential</h3>
              <p className="text-xs text-slate-500 mt-1">
                Scan or download this QR code for instant offline/online proof of admission.
              </p>

              {/* QR Image */}
              <div className="my-6 flex justify-center">
                {qrData?.qr_code_data_uri ? (
                  <div className="p-3 bg-white rounded-2xl border-2 border-dashed border-indigo-200 shadow-md">
                    <img
                      src={qrData.qr_code_data_uri}
                      alt="Student Verification QR Code"
                      className="h-48 w-48 rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="h-48 w-48 bg-slate-100 flex items-center justify-center rounded-lg text-xs text-slate-400">
                    Generating QR...
                  </div>
                )}
              </div>

              {/* Claims Breakdown */}
              <div className="rounded-xl bg-slate-50 p-3 text-left text-xs font-mono text-slate-600 space-y-1">
                <p className="text-[10px] font-sans font-bold text-slate-400 uppercase">Signed JWT Payload:</p>
                <p>Ref: <strong className="text-slate-900">{qrData?.verification_id}</strong></p>
                <p>Status: <span className="text-emerald-700 font-bold">ACTIVE</span></p>
                <p>Algorithm: <span className="text-indigo-600">EdDSA / Ed25519</span></p>
              </div>
            </div>

            <a
              href={`/api/v1/credentials/qr/${studentData?.id}/png`}
              download={`${studentData?.student_institution_id}_credential.png`}
              className="mt-6 w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition"
            >
              📥 Download Signed QR PNG
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
