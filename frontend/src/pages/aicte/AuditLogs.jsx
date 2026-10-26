import React, { useState, useEffect, useCallback } from 'react'
import {
  History,
  Search,
  Filter,
  Download,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  User,
  Clock
} from 'lucide-react'
import axiosClient from '../../api/axiosClient'
import {
  Card,
  CardHeader,
  Button,
  Badge,
  Input,
  Select,
  Skeleton
} from '../../components/common'

const getActionBadgeVariant = (action) => {
  if (!action) return 'neutral'
  const a = action.toUpperCase()
  if (a.includes('DELETE') || a.includes('SUBMIT')) return 'info'
  if (a.includes('CREATE')) return 'success'
  if (a.includes('PATCH') || a.includes('UPDATE') || a.includes('CORRECT')) return 'warning'
  if (a.includes('VERIFY') || a.includes('CREDENTIAL')) return 'purple'
  if (a.includes('CONSENT') || a.includes('GRANT') || a.includes('REVOKE')) return 'brand'
  return 'neutral'
}

const formatTs = (ts) => {
  if (!ts) return '—'
  try {
    return new Date(ts).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    })
  } catch {
    return ts
  }
}

export default function AuditLogs() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    actor_email: '',
    action: '',
    entity_type: '',
    date_from: '',
    date_to: ''
  })
  const [actionTypes, setActionTypes] = useState([])
  const [expandedRow, setExpandedRow] = useState(null)

  const PAGE_SIZE = 50

  useEffect(() => {
    axiosClient.get('/api/v1/audit/logs/actions')
      .then(res => setActionTypes(res.data?.actions || []))
      .catch(() => setActionTypes([]))
  }, [])

  const fetchLogs = useCallback(async (currentPage = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', currentPage)
      params.set('page_size', PAGE_SIZE)
      if (filters.actor_email) params.set('actor_email', filters.actor_email)
      if (filters.action) params.set('action', filters.action)
      if (filters.entity_type) params.set('entity_type', filters.entity_type)
      if (filters.date_from) params.set('date_from', filters.date_from)
      if (filters.date_to) params.set('date_to', filters.date_to)

      const res = await axiosClient.get(`/api/v1/audit/logs?${params.toString()}`)
      setLogs(res.data?.items || [])
      setTotal(res.data?.total || 0)
    } catch (err) {
      console.error('Failed to load audit logs', err)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchLogs(page)
  }, [fetchLogs, page])

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-bold text-purple-800 dark:border-purple-900/60 dark:bg-purple-950/60 dark:text-purple-300 mb-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Forensic Accountability Trail</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            Immutable Audit Trail
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Append-only record of all batch uploads, inline corrections, consent decisions, and verification actions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="purple" size="sm" dot>
            {total} Total Audit Records
          </Badge>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 text-xs">
          <Input
            placeholder="Search by actor email…"
            value={filters.actor_email}
            onChange={(e) => setFilters({ ...filters, actor_email: e.target.value })}
            icon={Search}
          />

          <Select
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
          >
            <option value="">All Action Types</option>
            {actionTypes.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </Select>

          <Input
            placeholder="Entity (e.g. student, batch)"
            value={filters.entity_type}
            onChange={(e) => setFilters({ ...filters, entity_type: e.target.value })}
          />

          <Input
            type="date"
            placeholder="From Date"
            value={filters.date_from}
            onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
          />

          <Input
            type="date"
            placeholder="To Date"
            value={filters.date_to}
            onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
          />
        </div>
      </Card>

      {/* Audit Log Table */}
      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/60">
                <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Timestamp</th>
                <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Actor</th>
                <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Action</th>
                <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Entity</th>
                <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">IP Address</th>
                <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-4 py-3.5">
                      <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-800" />
                    </td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    No audit records matching your filter parameters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isExpanded = expandedRow === log.id
                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={() => setExpandedRow(isExpanded ? null : log.id)}
                        className={`transition cursor-pointer ${
                          isExpanded
                            ? 'bg-blue-50/60 dark:bg-slate-800'
                            : 'hover:bg-slate-50/80 dark:hover:bg-slate-850'
                        }`}
                      >
                        <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                          {formatTs(log.created_at)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                          {log.actor_email || log.actor_id?.slice(0, 8) || 'System'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={getActionBadgeVariant(log.action)} size="xs">
                            {log.action}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                            {log.entity_type} {log.entity_id && `(#${log.entity_id.slice(0, 6)})`}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                          {log.ip_address || '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Diff Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80 dark:bg-slate-850/80 border-t border-slate-100 dark:border-slate-800">
                          <td colSpan={6} className="p-4 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                <span className="font-sans font-bold text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                                  Previous State
                                </span>
                                <pre className="text-[11px] overflow-x-auto text-slate-600 dark:text-slate-300">
                                  {log.old_values ? JSON.stringify(log.old_values, null, 2) : 'null'}
                                </pre>
                              </div>

                              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                <span className="font-sans font-bold text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                                  Updated State
                                </span>
                                <pre className="text-[11px] overflow-x-auto text-slate-600 dark:text-slate-300">
                                  {log.new_values ? JSON.stringify(log.new_values, null, 2) : 'null'}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200/80 dark:border-slate-800 text-xs">
          <span className="text-slate-500">
            Page {page} of {totalPages}
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="xs"
              icon={ChevronLeft}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="xs"
              iconRight={ChevronRight}
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
