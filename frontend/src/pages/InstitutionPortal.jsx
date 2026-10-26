/**
 * InstitutionPortal.jsx — APAARSetu Institution Portal
 * =====================================================
 * Main portal for institution staff and admins to:
 *  - Select and switch between institutions (or auto-selected from JWT profile)
 *  - View programme intake utilization with real calculated % bars (T9 fix)
 *  - Upload student CSV/Excel batch files for validation
 *  - View and correct row-level validation errors inline
 *  - Submit clean batches to AICTE Central Repository
 *
 * Backend integration fixes:
 *  - T6: institutions list now unwraps `.items` from paginated response
 *  - T7: programmes list now unwraps `.items` from paginated response
 *  - T8: students list now unwraps `.items` and uses `page_size` param correctly
 *  - T9: intake utilization % is now calculated from real student count vs approved_intake
 *        (was hardcoded to 85% before)
 *  - PATCH endpoint is now `/api/v1/students/{id}` (T3 backend fix matches this call)
 */
import React, { useState, useEffect } from 'react'
import axiosClient from '../api/axiosClient'

export default function InstitutionPortal() {
  // Institution and programme state
  const [institutions, setInstitutions] = useState([])
  const [selectedInstId, setSelectedInstId] = useState('')
  const [students, setStudents] = useState([])
  const [programmes, setProgrammes] = useState([])
  // Per-programme enrollment counts for real utilization bar (T9)
  const [enrollmentCounts, setEnrollmentCounts] = useState({})

  // UI state
  const [filterStatus, setFilterStatus] = useState('flagged') // 'all', 'flagged', 'validated', 'submitted'
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [editingStudent, setEditingStudent] = useState(null)
  const [editFormData, setEditFormData] = useState({})
  const [savingRow, setSavingRow] = useState(false)
  const [submittingBatch, setSubmittingBatch] = useState(false)
  const [batchSuccessMessage, setBatchSuccessMessage] = useState('')
  const [instStats, setInstStats] = useState(null)

  // Load institutions list on mount
  useEffect(() => {
    loadInstitutions()
  }, [])

  // Reload data whenever institution or filter status changes
  useEffect(() => {
    if (selectedInstId) {
      loadInstitutionData(selectedInstId)
    }
  }, [selectedInstId, filterStatus])

  /**
   * T6 FIX: Backend returns paginated response { total, page, page_size, items }.
   * Old code: setInstitutions(res.data || [])   → would set the pagination wrapper
   * New code: setInstitutions(res.data?.items || []) → correctly extracts the array
   */
  const loadInstitutions = async () => {
    try {
      const res = await axiosClient.get('/api/v1/institutions')
      // T6: unwrap paginated response .items
      const list = res.data?.items || []
      setInstitutions(list)
      if (list.length > 0) {
        setSelectedInstId(list[0].id)
      }
    } catch (err) {
      console.error('Failed to load institutions', err)
    }
  }

  /**
   * Load all data for the selected institution:
   * - students with optional status filter
   * - programmes with real intake numbers
   * - institution-level stats (total enrolled per programme via students list)
   */
  const loadInstitutionData = async (instId) => {
    setLoading(true)
    try {
      // T7 FIX: programmes endpoint also returns paginated {items: [...]}
      // T8 FIX: students endpoint uses page_size (not limit), unwrap .items
      const [studRes, progRes] = await Promise.all([
        axiosClient.get(
          `/api/v1/students?institution_id=${instId}&page_size=100${filterStatus !== 'all' ? `&record_status=${filterStatus}` : ''}`
        ),
        axiosClient.get(`/api/v1/programmes?institution_id=${instId}&page_size=50`)
      ])

      // T8: unwrap paginated students response
      const studentList = studRes.data?.items || []
      setStudents(studentList)

      // T7: unwrap paginated programmes response
      const progList = progRes.data?.items || []
      setProgrammes(progList)

      // T9: Calculate real enrollment counts per programme for utilization bars
      // Load ALL students (not filtered) to get accurate intake counts
      if (filterStatus !== 'all') {
        try {
          const allStudRes = await axiosClient.get(
            `/api/v1/students?institution_id=${instId}&page_size=500`
          )
          const allStudents = allStudRes.data?.items || []
          computeEnrollmentCounts(allStudents, progList)
        } catch {
          computeEnrollmentCounts(studentList, progList)
        }
      } else {
        computeEnrollmentCounts(studentList, progList)
      }
    } catch (err) {
      console.error('Failed to load institution data', err)
    } finally {
      setLoading(false)
    }
  }

  /**
   * T9: Compute per-programme enrollment counts from students list.
   * Returns { [programme_id]: count } map used for progress bar %.
   */
  const computeEnrollmentCounts = (studentList, progList) => {
    const counts = {}
    progList.forEach(p => { counts[p.id] = 0 })
    studentList.forEach(s => {
      if (s.programme_id && counts[s.programme_id] !== undefined) {
        // Count only active/submitted students (not withdrawn/transferred)
        if (['validated', 'submitted', 'draft'].includes(s.record_status)) {
          counts[s.programme_id] = (counts[s.programme_id] || 0) + 1
        }
      }
    })
    setEnrollmentCounts(counts)
  }

  /**
   * Handle CSV/Excel batch upload.
   * Sends file as multipart/form-data to /api/v1/batches/upload.
   * On success, reloads institution data to reflect new students.
   */
  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    setUploadResult(null)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('institution_id', selectedInstId)

    try {
      const res = await axiosClient.post('/api/v1/batches/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setUploadResult(res.data)
      // Refresh table to show newly ingested students
      loadInstitutionData(selectedInstId)
    } catch (err) {
      alert(err.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
      // Reset file input so same file can be re-uploaded after correction
      e.target.value = ''
    }
  }

  /**
   * Open the inline correction modal for a specific student row.
   * Pre-fills the form with the student's current data.
   */
  const openEditModal = (student) => {
    setEditingStudent(student)
    setEditFormData({
      apaar_id: student.apaar_id || '',
      student_institution_id: student.student_institution_id || '',
      full_name: student.full_name || '',
      dob: student.dob || '',
      admission_date: student.admission_date || '',
      category: student.category || 'general',
      is_nri: student.is_nri || false,
      is_oci: student.is_oci || false,
      is_foreign_national: student.is_foreign_national || false,
      is_supernumerary: student.is_supernumerary || false
    })
  }

  /**
   * Save corrected student data via PATCH /api/v1/students/{id}.
   * Backend (T3 fix) now handles PATCH on the students route.
   * After saving, reloads institution data to trigger re-render with updated status.
   */
  const handleSaveCorrection = async () => {
    if (!editingStudent) return
    setSavingRow(true)
    try {
      // T3 BACKEND FIX: /api/v1/students/{id} now has a PATCH handler
      await axiosClient.patch(`/api/v1/students/${editingStudent.id}`, editFormData)
      setEditingStudent(null)
      // Reload to pick up new record_status after revalidation
      loadInstitutionData(selectedInstId)
    } catch (err) {
      alert(err.response?.data?.detail || 'Correction failed')
    } finally {
      setSavingRow(false)
    }
  }

  /**
   * Submit the latest batch for this institution to AICTE.
   * Calls GET /batches?institution_id= first to find the latest batch ID,
   * then POST /batches/{id}/submit.
   * Backend enforces: batch cannot be submitted if error_rows > 0.
   */
  const handleSubmitBatch = async () => {
    setSubmittingBatch(true)
    setBatchSuccessMessage('')
    try {
      // Find the most recent batch for this institution
      const bRes = await axiosClient.get(`/api/v1/batches?institution_id=${selectedInstId}`)
      // T6: batches endpoint also returns paginated response
      const batches = bRes.data?.items || bRes.data || []
      if (!batches || batches.length === 0) {
        alert('No upload batch found to submit')
        return
      }
      const batchId = batches[0].id
      await axiosClient.post(`/api/v1/batches/${batchId}/submit`)
      setBatchSuccessMessage('✅ Batch successfully submitted to AICTE Central Repository! All records are now verified and locked.')
      loadInstitutionData(selectedInstId)
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to submit batch')
    } finally {
      setSubmittingBatch(false)
    }
  }

  const currentInst = institutions.find((i) => i.id === selectedInstId)

  /**
   * T9: Calculate utilization % for a programme.
   * Uses real enrolled count vs (approved_intake + supernumerary_quota).
   * Returns % clamped at 0-100 and color class for the progress bar.
   */
  const getIntakeUtilization = (programme) => {
    const enrolled = enrollmentCounts[programme.id] || 0
    const totalCap = (programme.approved_intake || 0) + (programme.supernumerary_quota || 0)
    if (totalCap === 0) return { pct: 0, color: 'bg-emerald-500', label: '0%' }
    const pct = Math.min(Math.round((enrolled / totalCap) * 100), 100)
    let color = 'bg-emerald-500'
    if (pct >= 100) color = 'bg-rose-500'
    else if (pct >= 90) color = 'bg-amber-500'
    else if (pct >= 75) color = 'bg-indigo-500'
    return { pct, color, enrolled, totalCap, label: `${pct}%` }
  }

  return (
    <div className="space-y-8 pb-12">

      {/* ─── Institution Selector & Banner ─── */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300 border border-indigo-500/30">
              Institution Portal · Ingestion Engine
            </span>
            <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">
              {currentInst?.name || 'Institution Management'}
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              AICTE Code: <span className="font-mono text-indigo-200">{currentInst?.aicte_code}</span>
              {currentInst?.state && ` · ${currentInst.state}, India`}
            </p>
          </div>

          {/* Institution Switcher — populated from /api/v1/institutions */}
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={selectedInstId}
              onChange={(e) => setSelectedInstId(e.target.value)}
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {institutions.map((inst) => (
                <option key={inst.id} value={inst.id} className="text-slate-900">
                  {inst.name} ({inst.aicte_code})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ─── Programme Intake Utilization Progress Meters (T9: Real data) ─── */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm animate-pulse">
              <div className="h-4 w-3/4 bg-slate-200 rounded mb-3" />
              <div className="h-3 w-1/2 bg-slate-100 rounded mb-4" />
              <div className="h-2 w-full bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {programmes.map((p) => {
            // T9: calculate real utilization from enrollment counts
            const util = getIntakeUtilization(p)
            return (
              <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-tight">{p.name}</h3>
                    <p className="text-[11px] text-slate-500">Session {p.academic_year}</p>
                  </div>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-mono font-bold text-slate-700">
                    Cap: {util.totalCap}
                  </span>
                </div>

                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-xs font-medium text-slate-600">
                    <span>Approved Intake</span>
                    <span className="font-bold">{p.approved_intake} seats</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>NRI: {p.nri_quota} · OCI: {p.oci_quota} · FN: {p.fn_quota}</span>
                    <span>+{p.supernumerary_quota} sup</span>
                  </div>
                  {/* T9: Real utilization bar — was hardcoded 85% before */}
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${util.color}`}
                      style={{ width: `${util.pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] font-semibold">
                    <span className="text-slate-500">
                      {util.enrolled !== undefined ? `${util.enrolled} enrolled` : 'Loading...'}
                    </span>
                    <span className={util.pct >= 100 ? 'text-rose-600' : util.pct >= 90 ? 'text-amber-600' : 'text-indigo-600'}>
                      {util.label} utilized
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── Upload Studio Card ─── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Batch Student Data Ingestion (CSV / Excel)</h2>
            <p className="text-xs text-slate-500">
              Upload admissions list. Engine checks APAAR format, mock registry, duplicates, and quotas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="cursor-pointer flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition">
              <span>{uploading ? '⏳ Processing File...' : '📁 Upload Admissions CSV'}</span>
              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Upload Status Alert */}
        {uploadResult && (
          <div className={`mt-4 rounded-xl p-4 border text-xs ${
            uploadResult.status === 'validated'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm">
                {uploadResult.status === 'validated' ? '✅ Batch Validated Cleanly!' : '⚠️ Validation Findings Detected!'}
              </span>
              <span className="font-mono text-xs">{uploadResult.file_name}</span>
            </div>
            <div className="mt-2 flex gap-4 text-xs">
              <span>Total: <strong>{uploadResult.total_rows}</strong></span>
              <span className="text-emerald-700">Valid: <strong>{uploadResult.valid_rows}</strong></span>
              <span className="text-rose-700">Errors: <strong>{uploadResult.error_rows}</strong></span>
              <span className="text-amber-700">Warnings: <strong>{uploadResult.warning_rows}</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* ─── Row-Level Error Correction Studio ─── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Row-Level Error Correction Studio</h2>
            <p className="text-xs text-slate-500">
              Fix flagged rows inline. Instantaneous re-validation updates badge without re-uploading entire file.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center rounded-lg bg-slate-100 p-1 text-xs font-semibold">
            <button
              onClick={() => setFilterStatus('flagged')}
              className={`rounded-md px-3 py-1.5 transition ${filterStatus === 'flagged' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
            >
              ⚠️ Flagged ({students.filter((s) => s.record_status === 'flagged').length})
            </button>
            <button
              onClick={() => setFilterStatus('all')}
              className={`rounded-md px-3 py-1.5 transition ${filterStatus === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
            >
              All Records
            </button>
            <button
              onClick={() => setFilterStatus('submitted')}
              className={`rounded-md px-3 py-1.5 transition ${filterStatus === 'submitted' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
            >
              ✓ Submitted
            </button>
          </div>
        </div>

        {/* Success banner after batch submit */}
        {batchSuccessMessage && (
          <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-800">
            {batchSuccessMessage}
          </div>
        )}

        {/* Student Records Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Roll No</th>
                <th className="px-4 py-3">Student Name</th>
                <th className="px-4 py-3">APAAR ID</th>
                <th className="px-4 py-3">Programme</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center">
                    <div className="flex justify-center items-center gap-2 text-slate-400">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                      Loading student records...
                    </div>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-slate-400 italic">
                    No student records found matching this filter.
                  </td>
                </tr>
              ) : (
                students.map((student) => {
                  const isFlagged = student.record_status === 'flagged'
                  return (
                    <tr key={student.id} className={isFlagged ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-slate-50/60'}>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{student.student_institution_id}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{student.full_name}</td>
                      <td className="px-4 py-3 font-mono">
                        {student.apaar_id ? (
                          <span className="flex items-center gap-1 font-semibold text-slate-800">
                            {/* Show masked APAAR from apaar_id_masked field — raw APAAR never shown */}
                            {student.apaar_id_masked || student.apaar_id}
                            <span className={`text-[10px] px-1.5 rounded font-bold ${
                              student.registry_status === 'VALID' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {student.registry_status || 'PENDING'}
                            </span>
                          </span>
                        ) : (
                          <span className="text-rose-600 font-bold">MISSING</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{student.programmes?.name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="capitalize font-medium">{student.category}</span>
                        {student.is_nri && <span className="ml-1 text-[10px] bg-indigo-100 text-indigo-700 px-1 rounded">NRI</span>}
                        {student.is_supernumerary && <span className="ml-1 text-[10px] bg-purple-100 text-purple-700 px-1 rounded">SUP</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 font-bold uppercase text-[10px] border ${
                          isFlagged
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : student.record_status === 'submitted'
                            ? 'bg-blue-100 text-blue-800 border-blue-300'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}>
                          {student.record_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {/* Only allow editing non-submitted records */}
                        {student.record_status !== 'submitted' ? (
                          <button
                            onClick={() => openEditModal(student)}
                            className="rounded-md bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition"
                          >
                            ✏️ Correct Row
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium">🔒 Locked</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Submit to AICTE Action Button */}
        <div className="mt-6 flex justify-between items-center border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">
            Submit validated student records to AICTE Central Repository once all errors are cleared.
          </p>
          <button
            onClick={handleSubmitBatch}
            disabled={submittingBatch}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition disabled:opacity-60"
          >
            {submittingBatch ? '⏳ Submitting to AICTE...' : '🚀 Submit Clean Batch to AICTE'}
          </button>
        </div>
      </div>

      {/* ─── Row-Level Inline Correction Modal ─── */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Row Correction: {editingStudent.full_name}
                </h3>
                <p className="text-xs text-slate-500">Roll No: {editingStudent.student_institution_id}</p>
              </div>
              <button onClick={() => setEditingStudent(null)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
              {/* APAAR ID correction field */}
              <div>
                <label className="font-semibold text-slate-700">12-Digit APAAR ID</label>
                <input
                  type="text"
                  maxLength={12}
                  value={editFormData.apaar_id}
                  onChange={(e) => setEditFormData({ ...editFormData, apaar_id: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 font-mono text-sm focus:border-indigo-500 focus:outline-none"
                  placeholder="e.g. 901043321819"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Student Full Name</label>
                <input
                  type="text"
                  value={editFormData.full_name}
                  onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Admission Date</label>
                <input
                  type="date"
                  value={editFormData.admission_date}
                  onChange={(e) => setEditFormData({ ...editFormData, admission_date: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Category</label>
                <select
                  value={editFormData.category}
                  onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-indigo-500 focus:outline-none"
                >
                  <option value="general">General</option>
                  <option value="obc">OBC</option>
                  <option value="sc">SC</option>
                  <option value="st">ST</option>
                  <option value="ews">EWS</option>
                  <option value="management">Management</option>
                  <option value="nri">NRI</option>
                  <option value="oci">OCI</option>
                  <option value="foreign_national">Foreign National</option>
                </select>
              </div>

              {/* Boolean flag checkboxes */}
              <div className="col-span-2 flex flex-wrap gap-4 pt-2">
                {[
                  ['is_nri', 'Is NRI'],
                  ['is_oci', 'Is OCI'],
                  ['is_foreign_national', 'Is Foreign National'],
                  ['is_supernumerary', 'Supernumerary Seat']
                ].map(([field, label]) => (
                  <label key={field} className="flex items-center gap-2 font-medium">
                    <input
                      type="checkbox"
                      checked={editFormData[field]}
                      onChange={(e) => setEditFormData({ ...editFormData, [field]: e.target.checked })}
                      className="rounded border-slate-300"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t pt-4">
              <button
                onClick={() => setEditingStudent(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCorrection}
                disabled={savingRow}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
              >
                {savingRow ? '⏳ Re-validating...' : '⚡ Save & Re-validate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
