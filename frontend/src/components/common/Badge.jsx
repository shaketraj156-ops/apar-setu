import React from 'react'
import clsx from 'clsx'

const variants = {
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
  warning: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
  danger: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
  info: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60',
  purple: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60',
  brand: 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
}

const dotColors = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  info: 'bg-blue-500',
  purple: 'bg-purple-500',
  brand: 'bg-indigo-500',
  neutral: 'bg-slate-400'
}

const sizes = {
  xs: 'px-2 py-0.5 text-[10px] leading-tight font-semibold',
  sm: 'px-2.5 py-0.5 text-xs font-semibold',
  md: 'px-3 py-1 text-xs font-bold'
}

export default function Badge({
  variant = 'neutral',
  size = 'sm',
  dot = false,
  children,
  className = ''
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border tracking-wide transition-colors',
        variants[variant] || variants.neutral,
        sizes[size] || sizes.sm,
        className
      )}
    >
      {dot && (
        <span
          className={clsx(
            'h-1.5 w-1.5 rounded-full shrink-0 animate-pulse',
            dotColors[variant] || dotColors.neutral
          )}
        />
      )}
      {children}
    </span>
  )
}
