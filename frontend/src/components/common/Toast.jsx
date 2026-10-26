import React from 'react'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'
import clsx from 'clsx'

const toastTypes = {
  success: {
    bg: 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800/70 dark:text-emerald-200',
    icon: CheckCircle2,
    iconColor: 'text-emerald-600 dark:text-emerald-400'
  },
  error: {
    bg: 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-800/70 dark:text-rose-200',
    icon: AlertCircle,
    iconColor: 'text-rose-600 dark:text-rose-400'
  },
  warning: {
    bg: 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800/70 dark:text-amber-200',
    icon: AlertTriangle,
    iconColor: 'text-amber-600 dark:text-amber-400'
  },
  info: {
    bg: 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/40 dark:border-blue-800/70 dark:text-blue-200',
    icon: Info,
    iconColor: 'text-blue-600 dark:text-blue-400'
  }
}

export default function Toast({
  type = 'info',
  title,
  message,
  onClose,
  className = ''
}) {
  const conf = toastTypes[type] || toastTypes.info
  const IconComponent = conf.icon

  return (
    <div
      role="alert"
      className={clsx(
        'flex items-start gap-3 rounded-xl border p-4 shadow-sm transition-all',
        conf.bg,
        className
      )}
    >
      <IconComponent className={clsx('h-5 w-5 shrink-0 mt-0.5', conf.iconColor)} />
      <div className="flex-1 min-w-0">
        {title && <h4 className="text-xs font-bold uppercase tracking-wider">{title}</h4>}
        {message && <p className="text-xs mt-0.5 leading-relaxed font-medium">{message}</p>}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          type="button"
          className="rounded-md p-1 opacity-70 hover:opacity-100 transition-opacity"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
