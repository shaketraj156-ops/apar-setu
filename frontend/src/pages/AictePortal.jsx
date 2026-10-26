/**
 * AictePortal.jsx — APAARSetu AICTE National Dashboard
 * =====================================================
 * The AICTE oversight dashboard provides a national-level view of:
 *  - KPI stat cards (institutions, students recorded, APAAR verified, flagged, duplicates, excess)
 *  - Approved vs Actual Enrolment bar chart (Recharts) with AICTE severity color coding
 *  - Explainable Anomaly Risk Index with weighted composite scoring
 *  - Cross-institution duplicate enrolment triage queue
 *  - T13: Data Quality report section — shows per-institution error/warning counts
 *  - T14: Category breakdown report — shows SC/ST/OBC/General/NRI/OCI/FN diversity per institution
 *  - Export to CSV / Excel / PDF for compliance reporting
 *
 * All data is fetched from backend /api/v1/reports/* endpoints which query
 * Supabase DB views (v_national_kpis, v_intake_utilization, etc.).
 *
 * The risk scoring uses a weighted composite:
 *   0.30 × duplicate + 0.25 × intake + 0.20 × quality + 0.15 × category + 0.10 × behavior
 */
import React, { useState, useEffect } from 'react'
import axiosClient from '../api/axiosClient'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie
} from 'recharts'

export default function AictePortal() {
  /* ── Dashboard data state ── */
  const [kpis, setKpis] = useState(null)
  const [intakeData, setIntakeData] = useState([])
  const [duplicates, setDuplicates] = useState([])
  const [riskScores, setRiskScores] = useState([])
  // T13: Data quality report state
  const [dataQuality, setDataQuality] = useState([])
  // T14: Category breakdown report state
  const [categoryData, setCategoryData] = useState([])

  /* ── UI state ── */
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [selectedRisk, setSelectedRisk] = useState(null)
  // Active tab for switching between dashboard sections
  const [activeTab, setActiveTab] = useState('overview')

  /** Fetch all dashboard data from /api/v1/reports/* on mount */
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [kpisRes, intakeRes, dupRes, riskRes, qualityRes, catRes] = await Promise.all([
        axiosClient.get('/api/v1/reports/kpis'),
        axiosClient.get('/api/v1/reports/intake'),
        axiosClient.get('/api/v1/reports/duplicates'),
        axiosClient.get('/api/v1/reports/risk'),
        // T13: Data quality endpoint
        axiosClient.get('/api/v1/reports/data-quality'),
        // T14: Category breakdown endpoint
        axiosClient.get('/api/v1/reports/category')
      ])
      setKpis(kpisRes.data)
      setIntakeData(intakeRes.data || [])
      setDuplicates(dupRes.data || [])
      setRiskScores(riskRes.data || [])
      setDataQuality(qualityRes.data || [])
      setCategoryData(catRes.data || [])
    } catch (err) {
      console.error('Failed to load AICTE dashboard data', err)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Export a report as CSV, Excel, or PDF.
   * Backend generates the file via /api/v1/reports/{name}/export?format=...
   * The response is a binary blob that we download as a named file.
   */
  const handleExport = async (reportName, format) => {
    setExporting(true)
    try {
      const res = await axiosClient.get(`/api/v1/reports/${reportName}/export?format=${format}`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${reportName}_report.${format === 'xlsx' ? 'xlsx' : format}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed', err)
    } finally {
      setExporting(false)
    }
  }

  /** Map intake alert level to bar chart color */
  const getAlertColor = (alertLevel) => {
    switch (alertLevel) {
      case 'exceeded': return '#ef4444'    // Red
      case 'review': return '#8b5cf6'      // Purple
      case 'near_limit': return '#f59e0b'  // Orange/amber
      default: return '#10b981'            // Green
    }
  }

  /** Risk level badge color classes */
  const getRiskBadge = (level) => {
    switch (level) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200'
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'MEDIUM': return 'bg-amber-100 text-amber-800 border-amber-200'
      default: return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    }
  }

  /** Pie chart color palette for category breakdown */
  const CATEGORY_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']

  /* ── Loading Skeleton ── */
  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">Loading AICTE National Repository...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-12">

      {/* ─── Header & Export Actions ─── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            AICTE National Admission Oversight
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time APAAR-linked verification, excess-intake alerts & multi-college duplicate monitoring.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleExport('compliance', 'csv')}
            disabled={exporting}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            📥 Export CSV
          </button>
          <button
            onClick={() => handleExport('compliance', 'xlsx')}
            disabled={exporting}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            📊 Excel Sheet
          </button>
          <button
            onClick={() => handleExport('compliance', 'pdf')}
            disabled={exporting}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            📄 PDF Compliance Report
          </button>
        </div>
      </div>

      {/* ─── Tab Navigation for Dashboard Sections ─── */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
        {[
          { id: 'overview', label: '📊 Overview' },
          { id: 'quality', label: '🔍 Data Quality' },
          { id: 'categories', label: '📋 Category Report' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-lg px-4 py-2 transition ${
              activeTab === tab.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════════ OVERVIEW TAB ═══════════════ */}
      {activeTab === 'overview' && (
        <>
          {/* ── KPI Stat Cards ── */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Colleges Active</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{kpis?.institutions_registered || 0}</p>
              <span className="mt-1 inline-block text-xs font-medium text-emerald-600">100% Reporting</span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Students Recorded</p>
              <p className="mt-2 text-2xl font-black text-indigo-600">{kpis?.students_recorded || 0}</p>
              <span className="mt-1 inline-block text-xs font-medium text-slate-500">Live Ingested</span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">APAAR Verified</p>
              <p className="mt-2 text-2xl font-black text-emerald-600">{kpis?.verified_apaar || 0}</p>
              <span className="mt-1 inline-block text-xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                {kpis?.students_recorded ? Math.round((kpis.verified_apaar / kpis.students_recorded) * 100) : 0}% Genuine
              </span>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
              <p className="text-xs font-medium text-amber-800 uppercase tracking-wider">Flagged Records</p>
              <p className="mt-2 text-2xl font-black text-amber-900">{kpis?.flagged_records || 0}</p>
              <span className="mt-1 inline-block text-xs font-medium text-amber-700">Requires Correction</span>
            </div>
            <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4 shadow-sm">
              <p className="text-xs font-medium text-purple-800 uppercase tracking-wider">Duplicate Enrolments</p>
              <p className="mt-2 text-2xl font-black text-purple-900">{kpis?.duplicate_cases || 0}</p>
              <span className="mt-1 inline-block text-xs font-medium text-purple-700">Multi-College Risk</span>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 shadow-sm">
              <p className="text-xs font-medium text-rose-800 uppercase tracking-wider">Excess Intake</p>
              <p className="mt-2 text-2xl font-black text-rose-600">{kpis?.programmes_exceeded || 0}</p>
              <span className="mt-1 inline-block text-xs font-medium text-rose-700">Quota Breaches</span>
            </div>
          </div>

          {/* ── Main Grid: Intake Chart + Risk Scoreboard ── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Programme Intake Bar Chart (2 cols) */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Approved vs Actual Enrolment Utilization</h2>
                  <p className="text-xs text-slate-500">Colour coded by AICTE alert severity</p>
                </div>
                {/* Legend pills */}
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Safe</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Near Limit</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-purple-500" /> Review</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Exceeded</span>
                </div>
              </div>
              <div className="h-80 w-full">
                {intakeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={intakeData} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                      <XAxis dataKey="programme_name" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" interval={0} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(val, name, item) => [
                          `${val} students (${item.payload.utilization_pct || 0}%)`,
                          item.payload.institution_name
                        ]}
                        labelFormatter={(label) => `Programme: ${label}`}
                      />
                      <Bar dataKey="total_enrolled" radius={[4, 4, 0, 0]}>
                        {intakeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getAlertColor(entry.alert_level)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">
                    No intake data available. Upload student batches to see utilization.
                  </div>
                )}
              </div>
            </div>

            {/* Anomaly Risk Scoreboard (1 col) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-slate-900">Anomaly Risk Index</h2>
                  <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    Weighted Model
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  0.30×Dup + 0.25×Intake + 0.20×Quality + 0.15×Category + 0.10×Behavior
                </p>
                <div className="space-y-3">
                  {riskScores.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-4">No risk data available.</p>
                  ) : (
                    riskScores.map((r) => (
                      <div
                        key={r.institution_id}
                        onClick={() => setSelectedRisk(r)}
                        className="cursor-pointer rounded-xl border border-slate-100 bg-slate-50/60 p-3 transition hover:border-indigo-200 hover:bg-indigo-50/30"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 truncate max-w-[180px]">{r.institution_name}</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-bold border ${getRiskBadge(r.level)}`}>
                            {r.level} ({r.score})
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-1 text-[10px] text-slate-500">
                          <div>Dup: {Math.round(r.components?.duplicate || 0)}%</div>
                          <div>Intake: {Math.round(r.components?.intake || 0)}%</div>
                          <div>Data: {Math.round(r.components?.data_quality || 0)}%</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <p className="mt-4 text-[11px] text-slate-400 italic text-center">
                Click any college to view root-cause diagnostic findings
              </p>
            </div>
          </div>

          {/* ── Cross-Institution Duplicate Alert Queue ── */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Cross-Institution Concurrent Enrolment Triage</h2>
                <p className="text-xs text-slate-500">Students detected active across two or more AICTE institutions</p>
              </div>
              <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-800">
                {duplicates.length} Active Conflict Cases
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">APAAR ID Hash</th>
                    <th className="px-4 py-3">Conflict Institutions</th>
                    <th className="px-4 py-3">Involved Records</th>
                    <th className="px-4 py-3">Regulatory Recommendation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {duplicates.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-4 py-8 text-center text-slate-400 italic">
                        No cross-institution duplicate enrolments detected.
                      </td>
                    </tr>
                  ) : (
                    duplicates.map((dup, i) => (
                      <tr key={i} className="hover:bg-purple-50/20">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-900">
                          {dup.apaar_id_hash?.substring(0, 16)}...
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {dup.institutions?.map((inst, idx) => (
                              <span key={idx} className="rounded-md bg-purple-100/80 px-2 py-0.5 text-xs font-bold text-purple-900 border border-purple-200">
                                {inst}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">
                          {dup.record_ids?.length} records linked
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-amber-800 font-medium bg-amber-50 border border-amber-200 rounded px-2 py-1">
                            ⚠️ Issue Show-Cause Notice & Confirm genuine nodal enrolment
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════ DATA QUALITY TAB (T13) ═══════════════ */}
      {activeTab === 'quality' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Data Quality Report</h2>
                <p className="text-xs text-slate-500">
                  Per-institution breakdown of validation findings, error rates, and data completeness metrics.
                </p>
              </div>
              <button
                onClick={() => handleExport('data-quality', 'xlsx')}
                disabled={exporting}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                📊 Export Excel
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Institution</th>
                    <th className="px-4 py-3">Total Records</th>
                    <th className="px-4 py-3">Error Count</th>
                    <th className="px-4 py-3">Warning Count</th>
                    <th className="px-4 py-3">Error Rate</th>
                    <th className="px-4 py-3">Quality Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dataQuality.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-slate-400 italic">
                        No data quality metrics available. Upload student batches to generate reports.
                      </td>
                    </tr>
                  ) : (
                    dataQuality.map((dq, i) => {
                      const total = dq.total_records || 0
                      const errors = dq.error_count || 0
                      const warnings = dq.warning_count || 0
                      const errorRate = total > 0 ? ((errors / total) * 100).toFixed(1) : '0'
                      const qualityScore = total > 0 ? Math.max(0, 100 - (errors / total) * 100).toFixed(0) : '100'
                      return (
                        <tr key={dq.institution_id || i} className="hover:bg-slate-50/60">
                          <td className="px-4 py-3 font-semibold text-slate-900">{dq.institution_name || '—'}</td>
                          <td className="px-4 py-3 font-mono">{total}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-0.5 font-bold ${errors > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-50 text-emerald-700'}`}>
                              {errors}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-0.5 font-bold ${warnings > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>
                              {warnings}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-16 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${parseFloat(errorRate) > 10 ? 'bg-rose-500' : parseFloat(errorRate) > 5 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                  style={{ width: `${Math.min(parseFloat(errorRate), 100)}%` }}
                                />
                              </div>
                              <span className="font-mono">{errorRate}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-bold ${parseInt(qualityScore) >= 90 ? 'text-emerald-600' : parseInt(qualityScore) >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
                              {qualityScore}/100
                            </span>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ CATEGORY REPORT TAB (T14) ═══════════════ */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Admission Category Diversity Report</h2>
                <p className="text-xs text-slate-500">
                  Breakdown of student admissions by category (General/OBC/SC/ST/EWS/NRI/OCI/FN) per institution.
                </p>
              </div>
              <button
                onClick={() => handleExport('category', 'xlsx')}
                disabled={exporting}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                📊 Export Excel
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Institution</th>
                    <th className="px-4 py-3">General</th>
                    <th className="px-4 py-3">OBC</th>
                    <th className="px-4 py-3">SC</th>
                    <th className="px-4 py-3">ST</th>
                    <th className="px-4 py-3">EWS</th>
                    <th className="px-4 py-3">NRI</th>
                    <th className="px-4 py-3">OCI</th>
                    <th className="px-4 py-3">FN</th>
                    <th className="px-4 py-3">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categoryData.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="px-4 py-8 text-center text-slate-400 italic">
                        No category data available. Upload student batches to generate this report.
                      </td>
                    </tr>
                  ) : (
                    categoryData.map((cd, i) => (
                      <tr key={cd.institution_id || i} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-semibold text-slate-900">{cd.institution_name || '—'}</td>
                        <td className="px-4 py-3 font-mono">{cd.general || 0}</td>
                        <td className="px-4 py-3 font-mono">{cd.obc || 0}</td>
                        <td className="px-4 py-3 font-mono">{cd.sc || 0}</td>
                        <td className="px-4 py-3 font-mono">{cd.st || 0}</td>
                        <td className="px-4 py-3 font-mono">{cd.ews || 0}</td>
                        <td className="px-4 py-3 font-mono">{cd.nri || 0}</td>
                        <td className="px-4 py-3 font-mono">{cd.oci || 0}</td>
                        <td className="px-4 py-3 font-mono">{cd.foreign_national || 0}</td>
                        <td className="px-4 py-3 font-bold text-indigo-700">
                          {(cd.general || 0) + (cd.obc || 0) + (cd.sc || 0) + (cd.st || 0) + (cd.ews || 0) + (cd.nri || 0) + (cd.oci || 0) + (cd.foreign_national || 0)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── Risk Explanation Modal (all tabs) ─── */}
      {selectedRisk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900">{selectedRisk.institution_name}</h3>
              <button
                onClick={() => setSelectedRisk(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >✕</button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">Calculated Risk Index:</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${getRiskBadge(selectedRisk.level)}`}>
                  {selectedRisk.level} ({selectedRisk.score}/100)
                </span>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 text-xs space-y-2">
                <p className="font-semibold text-slate-700">Audit Diagnostics & Explanations:</p>
                {selectedRisk.explanations?.length > 0 ? (
                  selectedRisk.explanations.map((exp, idx) => (
                    <div key={idx} className="border-l-2 border-indigo-500 pl-2">
                      <p className="font-bold text-slate-900">{exp.what}</p>
                      <p className="text-slate-500">{exp.why}</p>
                      <p className="text-indigo-600 mt-0.5">Recommended: {exp.action}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 italic">No critical anomalies flagged for this institution.</p>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedRisk(null)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
