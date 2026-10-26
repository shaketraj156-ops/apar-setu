import React from 'react'
import clsx from 'clsx'

const roleColors = {
  institution_admin: 'bg-blue-600 text-white ring-blue-500/30',
  institution_staff: 'bg-indigo-600 text-white ring-indigo-500/30',
  aicte_officer: 'bg-purple-600 text-white ring-purple-500/30',
  system_admin: 'bg-slate-900 text-white ring-slate-700/30 dark:bg-slate-700',
  auditor: 'bg-amber-600 text-white ring-amber-500/30',
  student: 'bg-emerald-600 text-white ring-emerald-500/30',
  verifier: 'bg-teal-600 text-white ring-teal-500/30'
}

const sizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm font-bold',
  lg: 'h-12 w-12 text-base font-bold'
}

function getInitials(name) {
  if (!name) return 'AS'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function Avatar({
  name = '',
  role = 'student',
  size = 'md',
  className = ''
}) {
  const initials = getInitials(name)
  const roleStyle = roleColors[role] || 'bg-blue-600 text-white'

  return (
    <div
      className={clsx(
        'relative inline-flex shrink-0 items-center justify-center rounded-xl font-bold ring-2 select-none shadow-xs',
        sizes[size] || sizes.md,
        roleStyle,
        className
      )}
      title={`${name} (${role})`}
    >
      <span>{initials}</span>
    </div>
  )
}
