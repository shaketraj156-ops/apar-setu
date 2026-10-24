import React, { useState, useEffect } from 'react'
import axiosClient from '../api/axiosClient'

export default function InstitutionPortal() {
  const [institutions, setInstitutions] = useState([])
  const [selectedInstId, setSelectedInstId] = useState('')
  const [students, setStudents] = useState([])
  const [programmes, setProgrammes] = useState([])
  const [filterStatus, setFilterStatus] = useState('flagged') // 'all', 'flagged', 'validated', 'submitted'
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [editingStudent, setEditingStudent] = useState(null)
  const [editFormData, setEditFormData] = useState({})
  const [savingRow, setSavingRow] = useState(false)
  const [submittingBatch, setSubmittingBatch] = useState(false)
  const [batchSuccessMessage, setBatchSuccessMessage] = useState('')

  useEffect(() => {
    loadInstitutions()
  }, [])

  useEffect(() => {
    if (selectedInstId) {
      loadInstitutionData(selectedInstId)
    }
  }, [selectedInstId, filterStatus])

  const loadInstitutions = async () => {
    try {
      const res = await axiosClient.get('/api/v1/institutions')
      setInstitutions(res.data || [])
      if (res.data?.length > 0) {
        setSelectedInstId(res.data[0].id)
      }
    } catch (err) {
      console.error('Failed to load institutions', err)
    }
  }

  const loadInstitutionData = async (instId) => {
    setLoading(true)
    try {
      const [studRes, progRes] = await Promise.all([
        axiosClient.get(`/api/v1/students?institution_id=${instId}&limit=100${filterStatus !== 'all' ? `&record_status=${filterStatus}` : ''}`),
        axiosClient.get(`/api/v1/programmes?institution_id=${instId}`)
      ])
      setStudents(studRes.data?.students || [])
      setProgrammes(progRes.data || [])
    } catch (err) {
      console.error('Failed to load institution students', err)
    } finally {
      setLoading(false)
    }
  }

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
      loadInstitutionData(selectedInstId)
    } catch (err) {
      alert(err.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

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

  const handleSaveCorrection = async () => {
    if (!editingStudent) return
    setSavingRow(true)
    try {
      const res = await axiosClient.patch(`/api/v1/students/${editingStudent.id}`, editFormData)
      // Update in local list
      setStudents((prev) =>
        prev.map((s) => (s.id === editingStudent.id ? { ...s, ...res.data } : s))
      )
      setEditingStudent(null)
      loadInstitutionData(selectedInstId)
    } catch (err) {
      alert(err.response?.data?.detail || 'Correction failed')
    } finally {
      setSavingRow(false)
    }
  }

  const handleSubmitBatch = async () => {
    setSubmittingBatch(true)
    setBatchSuccessMessage('')
    try {
      // Find latest batch id
      const bRes = await axiosClient.get(`/api/v1/batches?institution_id=${selectedInstId}`)
      if (!bRes.data || bRes.data.length === 0) {
        alert('No upload batch found to submit')
        return
      }
      const batchId = bRes.data[0].id
      await axiosClient.post(`/api/v1/batches/${batchId}/submit`)
      setBatchSuccessMessage('Batch successfully submitted to AICTE Central Repository! All records verified.')
      loadInstitutionData(selectedInstId)
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to submit batch')
    } finally {
      setSubmittingBatch(false)
    }
  }

  const currentInst = institutions.find((i) => i.id === selectedInstId)

  return (
    <div className="space-y-8 pb-12">
      {/* Institution Selector & Banner */}
      <div className="rounded-2xl bg-linear-to-r from-slate-900 to-indigo-950 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300 border border-indigo-500/30">
              Institution Portal & Ingestion Engine
            </span>
            <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">
              {currentInst?.name || 'Institution Management'}
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              AICTE Code: <span className="font-mono text-indigo-200">{currentInst?.aicte_code}</span> · {currentInst?.state}, India
            </p>
          </div>

          {/* College Switcher */}
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={selectedInstId}
              onChange={(e) => setSelectedInstId(e.target.value)}
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-md focus:outline-hidden focus:ring-2 focus:ring-indigo-400"
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

      {/* Programme Intake Utilization Progress Meters */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {programmes.map((p) => {
          const cap = p.approved_intake + p.supernumerary_quota
          return (
            <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-tight">{p.name}</h3>
                  <p className="text-[11px] text-slate-500">Session {p.academic_year}</p>
                </div>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-mono font-bold text-slate-700">
                  Cap: {cap}
                </span>
              </div>

              <div className="mt-4 space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-slate-600">
                  <span>Approved Intake</span>
                  <span className="font-bold">{p.approved_intake} seats</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Quota (NRI: {p.nri_quota}, OCI: {p.oci_quota}, FN: {p.fn_quota})</span>
                  <span>+{p.supernumerary_quota} extra</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full bg-indigo-600 rounded-full" style={{ width: '85%' }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Upload Studio Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Batch Student Data Ingestion (CSV / Excel)</h2>
            <p className="text-xs text-slate-500">
              Upload admissions list. The validation engine checks APAAR format, mock registry, duplicates, and quotas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="cursor-pointer flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition">
              <span>{uploading ? 'Processing File...' : '📁 Upload Admissions CSV'}</span>
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
              <span className="font-mono">File: {uploadResult.file_name}</span>
            </div>
            <div className="mt-2 flex gap-4 text-xs">
              <span>Total Rows: <strong>{uploadResult.total_rows}</strong></span>
              <span className="text-emerald-700">Valid: <strong>{uploadResult.valid_rows}</strong></span>
              <span className="text-rose-700">Errors: <strong>{uploadResult.error_rows}</strong></span>
              <span className="text-amber-700">Warnings: <strong>{uploadResult.warning_rows}</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* Row-Level Error Correction Studio Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Row-Level Error Correction Studio</h2>
            <p className="text-xs text-slate-500">
              Fix only flagged rows inline. Instantaneous re-validation updates badge without re-uploading entire file.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center rounded-lg bg-slate-100 p-1 text-xs font-semibold">
            <button
              onClick={() => setFilterStatus('flagged')}
              className={`rounded-md px-3 py-1.5 transition ${filterStatus === 'flagged' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600'}`}
            >
              ⚠️ Flagged ({students.filter((s) => s.record_status === 'flagged').length})
            </button>
            <button
              onClick={() => setFilterStatus('all')}
              className={`rounded-md px-3 py-1.5 transition ${filterStatus === 'all' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600'}`}
            >
              All Records
            </button>
            <button
              onClick={() => setFilterStatus('submitted')}
              className={`rounded-md px-3 py-1.5 transition ${filterStatus === 'submitted' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'}`}
            >
              Verified Batches
            </button>
          </div>
        </div>

        {batchSuccessMessage && (
          <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-800">
            {batchSuccessMessage}
          </div>
        )}

        {/* Student Grid Table */}
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
              {students.length === 0 ? (
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
                            {student.apaar_id}
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                              student.registry_status === 'VALID' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {student.registry_status || 'VERIFIED'}
                            </span>
                          </span>
                        ) : (
                          <span className="text-rose-600 font-bold">MISSING</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{student.programmes?.name || 'B.Tech'}</td>
                      <td className="px-4 py-3">
                        <span className="capitalize font-medium">{student.category}</span>
                        {student.is_nri && <span className="ml-1 text-[10px] bg-indigo-100 text-indigo-700 px-1 rounded">NRI</span>}
                        {student.is_supernumerary && <span className="ml-1 text-[10px] bg-purple-100 text-purple-700 px-1 rounded">SUPER</span>}
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
                        <button
                          onClick={() => openEditModal(student)}
                          className="rounded-md bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                        >
                          ✏️ Correct Row
                        </button>
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
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition"
          >
            {submittingBatch ? 'Submitting to AICTE...' : '🚀 Submit Clean Batch to AICTE'}
          </button>
        </div>
      </div>

      {/* Row-Level Inline Correction Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Row-Level Record Correction: {editingStudent.full_name}
                </h3>
                <p className="text-xs text-slate-500">Roll No: {editingStudent.student_institution_id}</p>
              </div>
              <button onClick={() => setEditingStudent(null)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700">12-Digit APAAR ID</label>
                <input
                  type="text"
                  maxLength={12}
                  value={editFormData.apaar_id}
                  onChange={(e) => setEditFormData({ ...editFormData, apaar_id: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 font-mono text-sm focus:border-indigo-500 focus:outline-hidden"
                  placeholder="e.g. 901043321819"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Student Full Name</label>
                <input
                  type="text"
                  value={editFormData.full_name}
                  onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Admission Date</label>
                <input
                  type="date"
                  value={editFormData.admission_date}
                  onChange={(e) => setEditFormData({ ...editFormData, admission_date: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Category</label>
                <select
                  value={editFormData.category}
                  onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-indigo-500 focus:outline-hidden"
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

              <div className="col-span-2 flex flex-wrap gap-4 pt-2">
                <label className="flex items-center gap-2 font-medium">
                  <input
                    type="checkbox"
                    checked={editFormData.is_nri}
                    onChange={(e) => setEditFormData({ ...editFormData, is_nri: e.target.checked })}
                  />
                  <span>Is NRI</span>
                </label>
                <label className="flex items-center gap-2 font-medium">
                  <input
                    type="checkbox"
                    checked={editFormData.is_oci}
                    onChange={(e) => setEditFormData({ ...editFormData, is_oci: e.target.checked })}
                  />
                  <span>Is OCI</span>
                </label>
                <label className="flex items-center gap-2 font-medium">
                  <input
                    type="checkbox"
                    checked={editFormData.is_foreign_national}
                    onChange={(e) => setEditFormData({ ...editFormData, is_foreign_national: e.target.checked })}
                  />
                  <span>Is Foreign National</span>
                </label>
                <label className="flex items-center gap-2 font-medium">
                  <input
                    type="checkbox"
                    checked={editFormData.is_supernumerary}
                    onChange={(e) => setEditFormData({ ...editFormData, is_supernumerary: e.target.checked })}
                  />
                  <span>Supernumerary Seat</span>
                </label>
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
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700"
              >
                {savingRow ? 'Re-validating...' : '⚡ Save & Re-validate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
