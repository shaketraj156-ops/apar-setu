import React, { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import clsx from 'clsx'

export default function Input({
  label,
  error,
  helperText,
  icon: Icon = null,
  rightElement = null,
  type = 'text',
  className = '',
  id,
  required,
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        {Icon && (
          <div className="pointer-events-none absolute left-3.5 text-slate-400 dark:text-slate-500">
            {typeof Icon === 'function' || typeof Icon === 'object' ? (
              <Icon className="h-4 w-4" />
            ) : (
              Icon
            )}
          </div>
        )}

        <input
          id={inputId}
          type={inputType}
          required={required}
          className={clsx(
            'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-all duration-150',
            'border-slate-300 placeholder:text-slate-400',
            'focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 focus:outline-none',
            'dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-500 dark:focus:ring-blue-500/30',
            Icon && 'pl-10',
            (isPassword || rightElement) && 'pr-10',
            error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-500',
            className
          )}
          {...props}
        />

        {isPassword ? (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((p) => !p)}
            className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        ) : (
          rightElement && <div className="absolute right-3">{rightElement}</div>
        )}
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
