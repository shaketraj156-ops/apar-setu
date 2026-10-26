import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  Edit3,
  Filter,
  Search,
  ExternalLink,
  ChevronDown,
  Layers,
  ArrowRight
} from 'lucide-react'
import axiosClient from '../api/axiosClient'
import {
  Card,
  CardHeader,
  Button,
  Badge,
  DataTable,
  Modal,
  Input,
  Select,
  StatCard,
  Skeleton
} from '../components/common'

export default function InstitutionPortal() {
  const [institutions, setInstitutions] = useState([])
  const [selectedInstId, setSelectedInstId] = useState('')
  const [students, setStudents] = useState([])
  const [programmes, setProgrammes] = useState([])
  const [enrollmentCounts, setEnrollmentCounts] = useState({})

  // UI state
  const [filterStatus, setFilterStatus] = useState('flagged')
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
      const list = res.data?.items || []
      setInstitutions(list)
      if (list.length > 0) {
        setSelectedInstId(list[0].id)
      }
    } catch (err) {
      console.error('Failed to load institutions', err)
    }
  }

  const loadInstitutionData = async (instId) => {
    setLoading(true)
    try {
      const [studRes, progRes] = await Promise.all([
        axiosClient.get(
          `/api/v1/students?institution_id=${instId}&page_size=100${filterStatus !== 'all' ? `&record_status=${filterStatus}` : ''}`
        ),
        axiosClient.get(`/api/v1/programmes?institution_id=${instId}&page_size=50`)
      ])

      const studentList = studRes.data?.items || []
      setStudents(studentList)

      const progList = progRes.data?.items || []
      setProgrammes(progList)

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

  const computeEnrollmentCounts = (studentList, progList) => {
    const counts = {}
    progList.forEach((p) => { counts[p.id] = 0 })
    studentList.forEach((s) => {
      if (s.programme_id && counts[s.programme_id] !== undefined) {
        if (['validated', 'submitted', 'draft'].includes(s.record_status)) {
          counts[s.programme_id] = (counts[s.programme_id] || 0) + 1
        }
      }
    })
    setEnrollmentCounts(counts)
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    setUploadResult(null)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('institution_id', selectedInstId)
    if (programmes && programmes.length > 0) {
      formData.append('programme_id', programmes[0].id)
      if (programmes[0].academic_year) {
        formData.append('academic_year', programmes[0].academic_year)
      }
    }

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
      e.target.value = ''
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
      await axiosClient.patch(`/api/v1/students/${editingStudent.id}`, editFormData)
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
      const bRes = await axiosClient.get(`/api/v1/batches?institution_id=${selectedInstId}`)
      const batches = bRes.data?.items || bRes.data || []
      if (!batches || batches.length === 0) {
        alert('No upload batch found to submit')
        return
      }
      const batchId = batches[0].id
      await axiosClient.post(`/api/v1/batches/${batchId}/submit`)
      setBatchSuccessMessage('✅ Batch successfully submitted to AICTE Central Repository! All records are verified and locked.')
      loadInstitutionData(selectedInstId)
    } catch (err) {
      alert(err.response?.data?.detail || 'Batch submission failed. Ensure all flagged errors are resolved first.')
    } finally {
      setSubmittingBatch(false)
    }
  }

  const getRecordStatusBadgeVariant = (status) => {
    switch (status) {
      case 'validated': return 'success'
      case 'submitted': return 'info'
      case 'flagged': return 'danger'
      default: return 'warning'
    }
  }

  const selectedInstitution = institutions.find((i) => i.id === selectedInstId)

  // Columns for student data table
  const columns = [
    {
      title: 'Roll / Student ID',
      key: 'student_institution_id',
      render: (val) => <span className="font-mono font-bold text-xs">{val || '—'}</span>
    },
    {
      title: 'Full Name',
      key: 'full_name',
      render: (val) => <span className="font-bold text-slate-900 dark:text-white">{val}</span>
    },
    {
      title: 'Masked APAAR ID',
      key: 'apaar_id',
      render: (val) => (
        <span className="font-mono text-xs text-blue-700 dark:text-blue-400">
          {val ? `${val.slice(0, 4)}••••${val.slice(-4)}` : '—'}
        </span>
      )
    },
    {
      title: 'Category',
      key: 'category',
      render: (val, row) => (
        <span className="text-xs uppercase font-semibold">
          {val || 'General'}
          {row.is_nri && <span className="ml-1 text-[10px] text-purple-600 font-bold">(NRI)</span>}
          {row.is_supernumerary && <span className="ml-1 text-[10px] text-amber-600 font-bold">(SN)</span>}
        </span>
      )
    },
    {
      title: 'Record Status',
      key: 'record_status',
      render: (val) => (
        <Badge variant={getRecordStatusBadgeVariant(val)} size="xs" dot>
          {val || 'draft'}
        </Badge>
      )
    },
    {
      title: 'Action',
      key: 'action',
      align: 'right',
      render: (_, row) => (
        <Button
          variant="secondary"
          size="xs"
          onClick={() => openEditModal(row)}
          icon={Edit3}
        >
          {row.record_status === 'flagged' ? 'Resolve' : 'Edit'}
        </Button>
      )
    }
  ]

  return (
    <div className="space-y-8 pb-12">
      
      {/* Header & Institution Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300 mb-1.5">
            <Building2 className="h-3.5 w-3.5" />
            <span>AICTE Institute Operations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            Admissions, Intake & Batch Validation
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Ingest student rosters, resolve row-level validation findings inline, and submit verified batches to AICTE.
          </p>
        </div>

        {/* Institution selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Institution:
          </label>
          <div className="relative">
            <select
              value={selectedInstId}
              onChange={(e) => setSelectedInstId(e.target.value)}
              className="appearance-none rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-1.5 pr-8 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {institutions.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Programme Intake Utilization Strip */}
      <Card>
        <CardHeader
          title="Sanctioned Intake Utilization"
          subtitle={`Live verified student enrolments vs AICTE sanctioned seats for ${selectedInstitution?.name || 'College'}`}
        />
        
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {programmes.map((p) => {
            const enrolled = enrollmentCounts[p.id] || 0
            const maxIntake = p.approved_intake || 1
            const pct = Math.min(Math.round((enrolled / maxIntake) * 100), 100)
            const isExceeded = enrolled > p.approved_intake

            return (
              <div
                key={p.id}
                className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-850"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {p.name}
                    </h4>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      Session {p.academic_year || '2025-26'}
                    </span>
                  </div>
                  <Badge variant={isExceeded ? 'danger' : pct > 90 ? 'warning' : 'success'} size="xs">
                    {pct}%
                  </Badge>
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] mb-1 font-semibold text-slate-600 dark:text-slate-400">
                    <span>Enrolled: <strong className="text-slate-900 dark:text-white">{enrolled}</strong></span>
                    <span>Cap: {p.approved_intake}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isExceeded ? 'bg-rose-500' : pct > 90 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* CSV / Excel Ingestion Dropzone */}
      <Card>
        <CardHeader
          title="Upload Student Admission Batch"
          subtitle="Support CSV or Excel format containing APAAR IDs, category claims, and student identifiers"
        />

        <div className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 p-8 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 mb-3 shadow-xs">
            <UploadCloud className="h-7 w-7" />
          </div>

          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Drag and drop your roster file, or browse
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Accepts .csv, .xlsx (Max 10,000 records per batch)
          </p>

          <label className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-800 transition cursor-pointer">
            <span>{uploading ? 'Parsing & Ingesting…' : 'Select Batch File'}</span>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>

        {/* Upload feedback summary */}
        {uploadResult && (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/40">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    Batch Processed Successfully: {uploadResult.file_name}
                  </h4>
                  <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300 mt-0.5">
                    Total: {uploadResult.total_rows} · Valid: {uploadResult.valid_rows} · Flagged Errors: {uploadResult.error_rows}
                  </p>
                </div>
              </div>

              {uploadResult.batch_id && (
                <Link
                  to={`/institution/batches/${uploadResult.batch_id}/findings`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 dark:text-emerald-300 underline"
                >
                  <span>View Findings</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Student Records Table Section */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Student Records & Exception Queue
            </h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Review flagged errors, perform inline corrections, and confirm verified records.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="inline-flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
            {[
              { id: 'flagged', label: 'Flagged Errors' },
              { id: 'validated', label: 'Validated' },
              { id: 'submitted', label: 'Submitted' },
              { id: 'all', label: 'All Records' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterStatus(f.id)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                  filterStatus === f.id
                    ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <DataTable
          columns={columns}
          data={students}
          loading={loading}
          emptyMessage={`No ${filterStatus} student records found for this institution.`}
        />

        {/* Submit to AICTE Action Bar */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-blue-50/70 border border-blue-200/80 dark:bg-blue-950/40 dark:border-blue-900/60">
          <div>
            <h4 className="text-xs font-bold text-blue-950 dark:text-blue-200">
              Ready to Submit Verified Batch to AICTE?
            </h4>
            <p className="text-[11px] text-blue-900/80 dark:text-blue-300 mt-0.5">
              Submitting locks records and publishes authentic enrolments to the national repository.
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            icon={Send}
            loading={submittingBatch}
            onClick={handleSubmitBatch}
          >
            Submit Batch to Central Repository
          </Button>
        </div>

        {batchSuccessMessage && (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
            {batchSuccessMessage}
          </div>
        )}
      </Card>

      {/* Inline Correction Modal */}
      {editingStudent && (
        <Modal
          isOpen={Boolean(editingStudent)}
          onClose={() => setEditingStudent(null)}
          title={`Correct Student Record: ${editingStudent.full_name}`}
          description={`Student ID: ${editingStudent.student_institution_id} · Update fields to re-validate against AICTE rules.`}
          footer={
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setEditingStudent(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={savingRow}
                onClick={handleSaveCorrection}
              >
                Save & Revalidate
              </Button>
            </div>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2 text-xs">
            <Input
              label="Student Full Name"
              required
              value={editFormData.full_name || ''}
              onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
            />

            <Input
              label="Roll / Institution ID"
              required
              value={editFormData.student_institution_id || ''}
              onChange={(e) => setEditFormData({ ...editFormData, student_institution_id: e.target.value })}
            />

            <Input
              label="APAAR ID (12 Digits)"
              required
              value={editFormData.apaar_id || ''}
              onChange={(e) => setEditFormData({ ...editFormData, apaar_id: e.target.value })}
            />

            <Input
              label="Date of Birth"
              type="date"
              value={editFormData.dob || ''}
              onChange={(e) => setEditFormData({ ...editFormData, dob: e.target.value })}
            />

            <Input
              label="Admission Date"
              type="date"
              value={editFormData.admission_date || ''}
              onChange={(e) => setEditFormData({ ...editFormData, admission_date: e.target.value })}
            />

            <Select
              label="Category"
              value={editFormData.category || 'general'}
              onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
              options={[
                ['general', 'General'],
                ['obc', 'OBC'],
                ['sc', 'SC'],
                ['st', 'ST'],
                ['ews', 'EWS']
              ]}
            />

            <div className="sm:col-span-2 pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(editFormData.is_nri)}
                  onChange={(e) => setEditFormData({ ...editFormData, is_nri: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>NRI Quota</span>
              </label>

              <label className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(editFormData.is_oci)}
                  onChange={(e) => setEditFormData({ ...editFormData, is_oci: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>OCI</span>
              </label>

              <label className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(editFormData.is_foreign_national)}
                  onChange={(e) => setEditFormData({ ...editFormData, is_foreign_national: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Foreign Nat.</span>
              </label>

              <label className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(editFormData.is_supernumerary)}
                  onChange={(e) => setEditFormData({ ...editFormData, is_supernumerary: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Supernumerary</span>
              </label>
            </div>
          </div>
        </Modal>
      )}

    </div>
  )
}
