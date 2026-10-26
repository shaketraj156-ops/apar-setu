import React from 'react'
import clsx from 'clsx'

export default function Skeleton({
  variant = 'text', // 'text' | 'circular' | 'rectangular'
  width,
  height,
  className = ''
}) {
  const styles = {}
  if (width) styles.width = width
  if (height) styles.height = height

  return (
    <div
      style={styles}
      className={clsx(
        'animate-shimmer bg-slate-200 dark:bg-slate-800 shrink-0',
        variant === 'text' && 'h-4 w-full rounded-md',
        variant === 'circular' && 'rounded-full',
        variant === 'rectangular' && 'rounded-xl',
        className
      )}
    />
  )
}
