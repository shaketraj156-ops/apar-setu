import React from 'react'
import clsx from 'clsx'

export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'No records found',
  keyField = 'id',
  onRowClick,
  className = ''
}) {
  return (
    <div className={clsx('overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900', className)}>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200/80 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/60">
              {columns.map((col, idx) => (
                <th
                  key={col.key || idx}
                  className={clsx(
                    'px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center',
                    col.headerClassName
                  )}
                >
                  {col.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {loading ? (
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={`skel-${rIdx}`} className="animate-pulse">
                  {columns.map((col, cIdx) => (
                    <td key={`skel-c-${cIdx}`} className="px-4 py-4">
                      <div className="h-4 w-3/4 rounded-md bg-slate-200 dark:bg-slate-800" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400"
                >
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <span className="text-2xl">📋</span>
                    <p className="font-medium">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, rIdx) => (
                <tr
                  key={row[keyField] || rIdx}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={clsx(
                    'transition-colors duration-150',
                    rIdx % 2 === 1 && 'bg-slate-50/40 dark:bg-slate-850/30',
                    'hover:bg-blue-50/60 dark:hover:bg-slate-800/60',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {columns.map((col, cIdx) => {
                    const value = col.accessor
                      ? typeof col.accessor === 'function'
                        ? col.accessor(row)
                        : row[col.accessor]
                      : row[col.key]

                    return (
                      <td
                        key={col.key || cIdx}
                        className={clsx(
                          'px-4 py-3.5 text-slate-700 dark:text-slate-300 font-medium',
                          col.align === 'right' && 'text-right',
                          col.align === 'center' && 'text-center',
                          col.className
                        )}
                      >
                        {col.render ? col.render(value, row, rIdx) : value ?? '—'}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
