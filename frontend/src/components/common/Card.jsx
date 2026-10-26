import React from 'react'
import clsx from 'clsx'

export default function Card({
  children,
  className = '',
  hover = false,
  glass = false,
  padding = 'default', // 'none' | 'sm' | 'default' | 'lg'
  ...props
}) {
  const paddings = {
    none: 'p-0',
    sm: 'p-4',
    default: 'p-5 sm:p-6',
    lg: 'p-6 sm:p-8'
  }

  return (
    <div
      className={clsx(
        'rounded-2xl border transition-all duration-200',
        glass
          ? 'glass-panel'
          : 'bg-white border-slate-200/80 shadow-xs dark:bg-slate-900 dark:border-slate-800 dark:shadow-none',
        hover && 'hover:-translate-y-0.5 hover:shadow-md hover:border-blue-300 dark:hover:border-slate-700',
        paddings[padding] || paddings.default,
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={clsx('flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800', className)}>
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
