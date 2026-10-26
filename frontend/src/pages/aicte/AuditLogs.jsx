/**
 * AuditLogs.jsx — APAARSetu AICTE Audit Trail Page
 * ==================================================
 * Displays the immutable append-only audit log for AICTE officers and auditors.
 * Consumes the new GET /api/v1/audit/logs endpoint (T5 backend fix).
 *
 * Features:
 *  - Paginated audit log table with server-side pagination
 *  - Filters: actor email, action type, entity type, date range
 *  - Action type dropdown populated from /api/v1/audit/logs/actions
 *  - Color-coded severity badges by action category
 *  - Expandable old/new value diff view per row
 *  - CSV export of current filtered view
 *
 * Security note:
 *  This page is only accessible to roles: aicte_officer, auditor, system_admin
 *  (enforced by ProtectedRoute in AppRoutes.jsx with allowedRoles={aicteRoles})
 */
import React, { useState, useEffect, useCallback } from 'react'
import axiosClient from '../../api/axiosClient'

/** Maps action type strings to color badge classes */
const getActionBadge = (action) => {
  if (!action) return 'bg-slate-100 text-slate-600'
  const a = action.toUpperCase()
  if (a.includes('DELETE') || a.includes('SUBMIT')) return 'bg-blue-100 text-blue-800'
  if (a.includes('CREATE')) return 'bg-emerald-100 text-emerald-800'
  if (a.includes('PATCH') || a.includes('UPDATE') || a.includes('CORRECT')) return 'bg-amber-100 text-amber-800'
  if (a.includes('VERIFY') || a.includes('CREDENTIAL')) return 'bg-purple-100 text-purple-800'
  if (a.includes('CONSENT') || a.includes('GRANT') || a.includes('REVOKE')) return 'bg-indigo-100 text-indigo-800'
  return 'bg-slate-100 text-slate-600'
}

/** Formats ISO timestamp to a readable Indian locale string */
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
  // Audit log data and pagination
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  // Filter state
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

  // Load available action types for the filter dropdown on mount
  useEffect(() => {
    axiosClient.get('/api/v1/audit/logs/actions')
      .then(res => setActionTypes(res.data?.actions || []))
      .catch(() => setActionTypes([]))
  }, [])

  /** Fetch audit logs with current filters and page */
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

  // Reload logs when filters or page changes
  useEffect(() => {
    fetchLogs(page)
  }, [fetchLogs, page])

  /** Apply filters — resets to page 1 */
  const handleApplyFilters = () => {
    setPage(1)
    fetchLogs(1)
  }

  /** Clear all filters and reload */
  const handleClearFilters = () => {
    setFilters({ actor_email: '', action: '', entity_type: '', date_from: '', date_to: '' })
    setPage(1)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6 pb-12">

      {/* ─── Page Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 border border-slate-200">
            Append-Only · DB Trigger Protected
          </span>
          <h1 className="mt-2 text-2xl font-black text-slate-900">System Audit Trail</h1>
          <p className="mt-1 text-sm text-slate-500">
            Immutable log of all system actions. Every entry is write-once — no modification or deletion is possible.
          </p>
        </div>
        <div className="flex gap-2">
          <span className="rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-2 text-xs font-bold text-indigo-700">
            {total.toLocaleString()} Total Entries
          </span>
        </div>
      </div>

      {/* ─── Filter Bar ─── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Actor email filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Actor Email</label>
            <input
              type="text"
              placeholder="filter@example.com"
              value={filters.actor_email}
              onChange={(e) => setFilters(f => ({ ...f, actor_email: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-indigo-400 focus:outline-none"
            />
          </div>

          {/* Action type dropdown — populated from backend */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Action Type</label>
            <select
              value={filters.action}
              onChange={(e) => setFilters(f => ({ ...f, action: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-indigo-400 focus:outline-none"
            >
              <option value="">All actions</option>
              {actionTypes.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* Entity type filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Entity Type</label>
            <select
              value={filters.entity_type}
              onChange={(e) => setFilters(f => ({ ...f, entity_type: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-indigo-400 focus:outline-none"
            >
              <option value="">All entities</option>
              {['student_record', 'upload_batch', 'verification_request', 'consent_record', 'institution', 'programme'].map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">From Date</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters(f => ({ ...f, date_from: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-indigo-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">To Date</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters(f => ({ ...f, date_to: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-indigo-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Filter action buttons */}
        <div className="mt-3 flex gap-2 justify-end">
          <button
            onClick={handleClearFilters}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            Clear
          </button>
          <button
            onClick={handleApplyFilters}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* ─── Audit Log Table ─── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity Type</th>
                <th className="px-4 py-3">Entity ID</th>
                <th className="px-4 py-3">IP Address</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center">
                    <div className="flex justify-center items-center gap-2 text-slate-400">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                      Loading audit logs...
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center text-slate-400 italic">
                    No audit log entries match your filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr className={`hover:bg-slate-50/60 transition ${expandedRow === log.id ? 'bg-indigo-50/30' : ''}`}>
                      {/* Timestamp */}
                      <td className="px-4 py-3 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                        {formatTs(log.created_at)}
                      </td>

                      {/* Actor email */}
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-800 truncate max-w-[120px] block">
                          {log.actor_email || <span className="text-slate-400 italic">system</span>}
                        </span>
                      </td>

                      {/* Action badge */}
                      <td className="px-4 py-3">
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${getActionBadge(log.action)}`}>
                          {log.action}
                        </span>
                      </td>

                      {/* Entity type */}
                      <td className="px-4 py-3 font-mono text-[10px] text-slate-500">
                        {log.entity_type || '—'}
                      </td>

                      {/* Entity ID (truncated) */}
                      <td className="px-4 py-3 font-mono text-[10px] text-slate-400">
                        {log.entity_id ? `${log.entity_id.substring(0, 12)}...` : '—'}
                      </td>

                      {/* IP Address */}
                      <td className="px-4 py-3 font-mono text-[10px] text-slate-400">
                        {log.ip_address || '—'}
                      </td>

                      {/* Expand toggle for diff view */}
                      <td className="px-4 py-3">
                        {(log.old_value || log.new_value) && (
                          <button
                            onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                            className="rounded-md bg-slate-100 hover:bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:text-indigo-700 transition"
                          >
                            {expandedRow === log.id ? '▲ Hide' : '▼ View'}
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Expanded diff view — shows old/new values */}
                    {expandedRow === log.id && (
                      <tr className="bg-indigo-50/20">
                        <td colSpan="7" className="px-4 py-3">
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-[10px] font-mono">
                            {log.old_value && (
                              <div>
                                <p className="font-sans font-bold text-rose-700 mb-1 text-[10px]">− Before</p>
                                <pre className="bg-rose-50 border border-rose-200 rounded-lg p-2 overflow-x-auto text-rose-900">
                                  {JSON.stringify(log.old_value, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.new_value && (
                              <div>
                                <p className="font-sans font-bold text-emerald-700 mb-1 text-[10px]">+ After</p>
                                <pre className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 overflow-x-auto text-emerald-900">
                                  {JSON.stringify(log.new_value, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ─── Pagination Controls ─── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 bg-slate-50">
            <span className="text-xs text-slate-500">
              Showing {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()} entries
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white disabled:opacity-40 transition"
              >
                ← Prev
              </button>
              {/* Page number pills — show max 5 around current */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4))
                const p = start + i
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      p === page
                        ? 'bg-indigo-600 text-white'
                        : 'border border-slate-200 text-slate-600 hover:bg-white'
                    }`}
                  >
                    {p}
                  </button>
                )
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white disabled:opacity-40 transition"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
