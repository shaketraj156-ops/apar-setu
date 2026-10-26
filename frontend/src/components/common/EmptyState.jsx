import React from 'react'
import clsx from 'clsx'

export default function EmptyState({
  icon: Icon = null,
  title = 'No data available',
  description = 'There are currently no items to display.',
  action = null,
  className = ''
}) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50',
        className
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 mb-4 shadow-xs">
        {Icon ? (
          typeof Icon === 'function' || typeof Icon === 'object' ? (
            <Icon className="h-7 w-7" />
          ) : (
            Icon
          )
        ) : (
          <span className="text-2xl">📭</span>
        )}
      </div>
      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="mt-1 max-w-sm text-xs sm:text-sm text-slate-500 dark:text-slate-400">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
