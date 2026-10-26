import React from 'react'
import clsx from 'clsx'

const variants = {
  primary: 'bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-sm hover:from-blue-700 hover:to-blue-800 hover:shadow active:scale-[0.99] border border-blue-800 focus-visible:ring-2 focus-visible:ring-blue-500',
  secondary: 'bg-white text-slate-800 border border-slate-300 shadow-xs hover:bg-slate-50 hover:border-slate-400 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-700 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-slate-400',
  outline: 'bg-transparent text-blue-700 border border-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-500 dark:hover:bg-blue-950/40 focus-visible:ring-2 focus-visible:ring-blue-500',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100 focus-visible:ring-2 focus-visible:ring-slate-400',
  danger: 'bg-gradient-to-b from-rose-600 to-rose-700 text-white shadow-sm hover:from-rose-700 hover:to-rose-800 border border-rose-800 focus-visible:ring-2 focus-visible:ring-rose-500',
  success: 'bg-gradient-to-b from-emerald-600 to-emerald-700 text-white shadow-sm hover:from-emerald-700 hover:to-emerald-800 border border-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-500',
  brand: 'bg-gradient-to-b from-indigo-600 to-indigo-700 text-white shadow-sm hover:from-indigo-700 hover:to-indigo-800 border border-indigo-800 focus-visible:ring-2 focus-visible:ring-indigo-500'
}

const sizes = {
  xs: 'px-2.5 py-1 text-xs rounded-md gap-1.5',
  sm: 'px-3.5 py-1.5 text-xs font-semibold rounded-lg gap-1.5',
  md: 'px-4 py-2 text-sm font-semibold rounded-xl gap-2',
  lg: 'px-5 py-2.5 text-base font-semibold rounded-xl gap-2.5'
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon = null,
  iconRight: IconRight = null,
  children,
  className = '',
  disabled = false,
  type = 'button',
  ...props
}) {
  const isActuallyDisabled = disabled || loading

  return (
    <button
      type={type}
      disabled={isActuallyDisabled}
      className={clsx(
        'inline-flex items-center justify-center font-medium transition-all duration-150 select-none cursor-pointer',
        'disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none',
        variants[variant] || variants.primary,
        sizes[size] || sizes.md,
        className
      )}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin -ml-0.5 h-4 w-4 shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : Icon ? (
        typeof Icon === 'function' || typeof Icon === 'object' ? <Icon className="h-4 w-4 shrink-0" /> : Icon
      ) : null}
      
      {children && <span>{children}</span>}

      {!loading && IconRight && (
        typeof IconRight === 'function' || typeof IconRight === 'object' ? <IconRight className="h-4 w-4 shrink-0" /> : IconRight
      )}
    </button>
  )
}
