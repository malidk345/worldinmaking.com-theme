import React from 'react'
import { clsx } from 'clsx'

export interface LemonTagProps {
  type?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'completion' | 'option'
  size?: 'small' | 'medium'
  children: React.ReactNode
  className?: string
  icon?: React.ReactNode
}

export const LemonTag: React.FC<LemonTagProps> = ({
  type = 'default',
  size = 'small',
  children,
  className,
  icon,
}) => {
  const typeStyles = {
    default: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    primary: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    success: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    warning: 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    danger: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    completion: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    option: 'bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  }

  const sizeStyles = {
    small: 'text-[11px] px-1.5 py-0.5 rounded font-mono font-medium border',
    medium: 'text-xs px-2 py-1 rounded-md font-mono font-medium border',
  }

  return (
    <span className={clsx('inline-flex items-center gap-1 leading-none select-none', sizeStyles[size], typeStyles[type], className)}>
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  )
}
