import React from 'react'
import clsx from 'clsx'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

const colorStyles = {
  blue: {
    bg: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border-blue-200 dark:border-blue-900/50',
    iconBg: 'bg-blue-600 text-white shadow-blue-500/20'
  },
  indigo: {
    bg: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/50',
    iconBg: 'bg-indigo-600 text-white shadow-indigo-500/20'
  },
  emerald: {
    bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50',
    iconBg: 'bg-emerald-600 text-white shadow-emerald-500/20'
  },
  amber: {
    bg: 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200 dark:border-amber-900/50',
    iconBg: 'bg-amber-500 text-white shadow-amber-500/20'
  },
  purple: {
    bg: 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400 border-purple-200 dark:border-purple-900/50',
    iconBg: 'bg-purple-600 text-white shadow-purple-500/20'
  },
  rose: {
    bg: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border-rose-200 dark:border-rose-900/50',
    iconBg: 'bg-rose-600 text-white shadow-rose-500/20'
  }
}

export default function StatCard({
  title,
  value,
  delta,
  trend = 'neutral', // 'up' | 'down' | 'neutral'
  icon: Icon = null,
  color = 'blue',
  subtitle,
  onClick,
  className = ''
}) {
  const theme = colorStyles[color] || colorStyles.blue

  return (
    <div
      onClick={onClick}
      className={clsx(
        'relative overflow-hidden rounded-2xl border p-5 transition-all duration-200',
        'bg-white border-slate-200/80 shadow-xs dark:bg-slate-900 dark:border-slate-800',
        onClick && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
            {title}
          </p>
          <p className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            {value}
          </p>
        </div>

        {Icon && (
          <div
            className={clsx(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-md',
              theme.iconBg
            )}
          >
            {typeof Icon === 'function' || typeof Icon === 'object' ? (
              <Icon className="h-5 w-5" />
            ) : (
              Icon
            )}
          </div>
        )}
      </div>

      {(delta || subtitle) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          {delta && (
            <span
              className={clsx(
                'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold',
                trend === 'up' && 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
                trend === 'down' && 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
                trend === 'neutral' && 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              )}
            >
              {trend === 'up' && <TrendingUp className="h-3 w-3" />}
              {trend === 'down' && <TrendingDown className="h-3 w-3" />}
              {trend === 'neutral' && <Minus className="h-3 w-3" />}
              {delta}
            </span>
          )}
          {subtitle && (
            <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  )
}
