import React, { useState, useEffect } from 'react'
import {
  Landmark,
  Building2,
  Users,
  CheckCircle2,
  AlertTriangle,
  Flame,
  FileSpreadsheet,
  FileText,
  Download,
  Search,
  Filter,
  BarChart3,
  PieChart as PieIcon,
  Layers,
  ArrowUpRight
} from 'lucide-react'
import axiosClient from '../api/axiosClient'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts'
import {
  Card,
  CardHeader,
  StatCard,
  Badge,
  Button,
  DataTable,
  Tabs,
  Skeleton
} from '../components/common'

export default function AictePortal() {
  const [kpis, setKpis] = useState(null)
  const [intakeData, setIntakeData] = useState([])
  const [duplicates, setDuplicates] = useState([])
  const [riskScores, setRiskScores] = useState([])
  const [dataQuality, setDataQuality] = useState([])
  const [categoryData, setCategoryData] = useState([])

  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [selectedRisk, setSelectedRisk] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

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
        axiosClient.get('/api/v1/reports/data-quality'),
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

  const getAlertColor = (alertLevel) => {
    switch (alertLevel) {
      case 'exceeded': return '#ef4444'
      case 'review': return '#8b5cf6'
      case 'near_limit': return '#f59e0b'
      default: return '#10b981'
    }
  }

  const getRiskBadgeVariant = (level) => {
    switch (level) {
      case 'CRITICAL': return 'danger'
      case 'HIGH': return 'warning'
      case 'MEDIUM': return 'warning'
      default: return 'success'
    }
  }

  const CATEGORY_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']

  const dashboardTabs = [
    { id: 'overview', label: 'National Overview', icon: BarChart3 },
    { id: 'quality', label: 'Data Quality Exceptions', icon: AlertTriangle },
    { id: 'categories', label: 'Category Diversity', icon: PieIcon }
  ]

  if (loading) {
    return (
      <div className="space-y-6 pb-12">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" height="100px" />
          ))}
        </div>
        <Skeleton variant="rectangular" height="350px" />
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Export Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-bold text-purple-800 dark:border-purple-900/60 dark:bg-purple-950/60 dark:text-purple-300 mb-1.5">
            <Landmark className="h-3.5 w-3.5" />
            <span>National Regulatory Command</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            AICTE National Admission Oversight
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Real-time APAAR verification, excess-intake alerts & cross-institution duplicate monitoring.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="xs"
            icon={FileSpreadsheet}
            disabled={exporting}
            onClick={() => handleExport('compliance', 'csv')}
          >
            Export CSV
          </Button>

          <Button
            variant="secondary"
            size="xs"
            icon={FileSpreadsheet}
            disabled={exporting}
            onClick={() => handleExport('compliance', 'xlsx')}
          >
            Excel Sheet
          </Button>

          <Button
            variant="brand"
            size="xs"
            icon={FileText}
            disabled={exporting}
            onClick={() => handleExport('compliance', 'pdf')}
          >
            PDF Compliance Report
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={dashboardTabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        variant="pills"
      />

      {/* ═══════════════ OVERVIEW TAB ═══════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard
              title="Colleges Active"
              value={kpis?.institutions_registered || 0}
              color="blue"
              subtitle="100% Reporting"
              icon={Building2}
            />
            <StatCard
              title="Students Recorded"
              value={kpis?.students_recorded || 0}
              color="indigo"
              subtitle="Live Ingested"
              icon={Users}
            />
            <StatCard
              title="APAAR Verified"
              value={kpis?.verified_apaar || 0}
              color="emerald"
              subtitle={`${kpis?.students_recorded ? Math.round((kpis.verified_apaar / kpis.students_recorded) * 100) : 0}% Genuine`}
              icon={CheckCircle2}
            />
            <StatCard
              title="Flagged Errors"
              value={kpis?.flagged_records || 0}
              color="amber"
              subtitle="Requires Action"
              icon={AlertTriangle}
            />
            <StatCard
              title="Duplicates"
              value={kpis?.duplicate_cases || 0}
              color="purple"
              subtitle="Multi-Seat Overlap"
              icon={Users}
            />
            <StatCard
              title="Excess Intake"
              value={kpis?.programmes_exceeded || 0}
              color="rose"
              subtitle="Quota Breaches"
              icon={Flame}
            />
          </div>

          {/* Main Chart + Risk Board */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            
            {/* Intake Utilization Chart (2 cols) */}
            <Card className="lg:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Approved vs Actual Enrolment Utilization
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Programme intake comparison with AICTE alert threshold colors
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Safe</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Near Cap</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-purple-500" /> Review</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> Exceeded</span>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={intakeData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <XAxis
                      dataKey="programme_name"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      angle={-20}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload
                          return (
                            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900 text-xs space-y-1">
                              <p className="font-bold text-slate-900 dark:text-white">{data.programme_name}</p>
                              <p className="text-slate-500">{data.institution_name}</p>
                              <div className="pt-1 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-[11px]">
                                <span>Approved: <strong>{data.approved_intake}</strong></span>
                                <span>Enrolled: <strong>{data.actual_enrolment}</strong></span>
                              </div>
                              <p className="font-bold text-blue-600 dark:text-blue-400">
                                Utilization: {data.utilization_pct}% ({data.alert_level})
                              </p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar dataKey="actual_enrolment" radius={[6, 6, 0, 0]}>
                      {intakeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getAlertColor(entry.alert_level)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Explainable Risk Index Scoreboard (1 col) */}
            <Card className="flex flex-col justify-between">
              <div>
                <CardHeader
                  title="Anomaly Risk Index"
                  subtitle="Weighted composite risk scoring (0-100)"
                />

                <div className="space-y-3">
                  {riskScores.slice(0, 5).map((r) => (
                    <div
                      key={r.institution_id}
                      onClick={() => setSelectedRisk(r)}
                      className={`p-3 rounded-xl border transition cursor-pointer ${
                        selectedRisk?.institution_id === r.institution_id
                          ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 dark:border-blue-700'
                          : 'border-slate-100 bg-slate-50/60 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-850'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate max-w-[170px]">
                          {r.institution_name}
                        </span>
                        <Badge variant={getRiskBadgeVariant(r.risk_level)} size="xs">
                          {r.composite_score} · {r.risk_level}
                        </Badge>
                      </div>

                      <div className="mt-2 h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            r.composite_score > 75
                              ? 'bg-rose-500'
                              : r.composite_score > 50
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${r.composite_score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedRisk && (
                <div className="mt-4 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] space-y-1">
                  <p className="font-bold text-slate-900 dark:text-white">Risk Factor Weights:</p>
                  <div className="grid grid-cols-2 gap-1 text-slate-600 dark:text-slate-400">
                    <span>Duplicates (30%): {selectedRisk.duplicate_score}</span>
                    <span>Intake Cap (25%): {selectedRisk.intake_score}</span>
                    <span>Data Quality (20%): {selectedRisk.quality_score}</span>
                    <span>Category Mix (15%): {selectedRisk.category_score}</span>
                  </div>
                </div>
              )}
            </Card>

          </div>

          {/* Cross-Institution Duplicate Triage Queue */}
          <Card>
            <CardHeader
              title="Cross-Institution Duplicate Enrolment Queue"
              subtitle="Heuristic multi-college seat collision alert list for regulatory review"
            />

            <DataTable
              columns={[
                {
                  title: 'Student Name',
                  key: 'student_name',
                  render: (val) => <span className="font-bold text-slate-900 dark:text-white">{val}</span>
                },
                {
                  title: 'Masked APAAR ID',
                  key: 'apaar_id',
                  render: (val) => <span className="font-mono text-xs text-blue-700 dark:text-blue-400">{val}</span>
                },
                {
                  title: 'Institution A (Enrolled)',
                  key: 'inst_a_name',
                  render: (val, row) => (
                    <div className="text-xs">
                      <p className="font-semibold">{val}</p>
                      <p className="text-[10px] text-slate-500">{row.prog_a_name}</p>
                    </div>
                  )
                },
                {
                  title: 'Institution B (Duplicate)',
                  key: 'inst_b_name',
                  render: (val, row) => (
                    <div className="text-xs">
                      <p className="font-semibold">{val}</p>
                      <p className="text-[10px] text-slate-500">{row.prog_b_name}</p>
                    </div>
                  )
                },
                {
                  title: 'Severity Status',
                  key: 'status',
                  render: (val) => (
                    <Badge variant={val === 'resolved' ? 'success' : 'danger'} size="xs" dot>
                      {val || 'PENDING TRIAGE'}
                    </Badge>
                  )
                }
              ]}
              data={duplicates}
              emptyMessage="No concurrent cross-college duplicate enrolments detected."
            />
          </Card>

        </div>
      )}

      {/* ═══════════════ DATA QUALITY TAB ═══════════════ */}
      {activeTab === 'quality' && (
        <Card>
          <CardHeader
            title="Institutional Data Quality Exception Metrics"
            subtitle="Aggregated row validation failures, format errors, and pending corrections per college"
          />

          <DataTable
            columns={[
              {
                title: 'College / University',
                key: 'institution_name',
                render: (val) => <span className="font-bold text-slate-900 dark:text-white">{val}</span>
              },
              {
                title: 'Total Ingested',
                key: 'total_records',
                render: (val) => <span className="font-bold">{val}</span>
              },
              {
                title: 'Valid Records',
                key: 'valid_records',
                render: (val) => <span className="text-emerald-600 font-bold">{val}</span>
              },
              {
                title: 'Flagged Errors',
                key: 'error_count',
                render: (val) => (
                  <Badge variant={val > 0 ? 'danger' : 'success'} size="xs">
                    {val}
                  </Badge>
                )
              },
              {
                title: 'Compliance Rating',
                key: 'compliance_rate',
                render: (val) => (
                  <span className="font-bold text-xs">
                    {val ? `${val}%` : '100%'}
                  </span>
                )
              }
            ]}
            data={dataQuality}
            emptyMessage="No data quality metrics available."
          />
        </Card>
      )}

      {/* ═══════════════ CATEGORY DIVERSITY TAB ═══════════════ */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1 flex flex-col justify-between">
            <CardHeader
              title="Category Distribution"
              subtitle="National SC / ST / OBC / General / EWS intake breakdown"
            />

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="count"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px]">
              {categoryData.map((c, i) => (
                <div key={c.category} className="flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                  />
                  <span className="uppercase font-semibold truncate">
                    {c.category}: {c.count}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader
              title="Institutional Category Breakdown"
              subtitle="Quota allocations per institution"
            />

            <DataTable
              columns={[
                {
                  title: 'College',
                  key: 'institution_name',
                  render: (val) => <span className="font-bold text-slate-900 dark:text-white">{val}</span>
                },
                { title: 'General', key: 'general_count' },
                { title: 'OBC', key: 'obc_count' },
                { title: 'SC', key: 'sc_count' },
                { title: 'ST', key: 'st_count' },
                { title: 'EWS', key: 'ews_count' },
                { title: 'NRI Quota', key: 'nri_count' }
              ]}
              data={categoryData}
              emptyMessage="No category breakdown records found."
            />
          </Card>
        </div>
      )}

    </div>
  )
}
