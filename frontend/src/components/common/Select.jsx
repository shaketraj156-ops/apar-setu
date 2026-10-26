import React from 'react'
import clsx from 'clsx'
import { ChevronDown } from 'lucide-react'

export default function Select({
  label,
  options = [],
  error,
  helperText,
  className = '',
  id,
  required,
  children,
  ...props
}) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div className="relative">
        <select
          id={selectId}
          required={required}
          className={clsx(
            'w-full appearance-none rounded-xl border bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900 transition-all duration-150',
            'border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 focus:outline-none',
            'dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-500/30',
            error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-500',
            className
          )}
          {...props}
        >
          {children ||
            options.map((opt) => {
              if (Array.isArray(opt)) {
                return (
                  <option key={opt[0]} value={opt[0]}>
                    {opt[1]}
                  </option>
                )
              }
              return (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              )
            })}
        </select>

        <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
          <ChevronDown className="h-4 w-4" />
        </div>
      </div>

      {error ? (
        <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{error}</p>
      ) : (
        helperText && (
          <p className="text-xs text-slate-500 dark:text-slate-400">{helperText}</p>
        )
      )}
    </div>
  )
}
