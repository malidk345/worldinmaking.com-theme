import React from 'react'
import { clsx } from 'clsx'

export interface LemonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  type?: 'primary' | 'secondary' | 'tertiary' | 'stealth' | 'danger'
  size?: 'xsmall' | 'small' | 'medium' | 'large'
  icon?: React.ReactNode
  sideIcon?: React.ReactNode
  active?: boolean
  loading?: boolean
  fullWidth?: boolean
  tooltip?: string
  status?: string
  disabledReason?: string
  'data-attr'?: string
}

export const LemonButton = React.forwardRef<HTMLButtonElement, LemonButtonProps>(
  (
    {
      type = 'secondary',
      size = 'medium',
      icon,
      sideIcon,
      active = false,
      loading = false,
      fullWidth = false,
      disabledReason,
      children,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium border transition-colors rounded-md select-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'

    const sizeStyles = {
      xsmall: 'text-xs px-1.5 py-0.5 gap-1 min-h-[22px]',
      small: 'text-xs px-2.5 py-1 gap-1.5 min-h-[28px]',
      medium: 'text-sm px-3 py-1.5 gap-2 min-h-[34px]',
      large: 'text-base px-4 py-2 gap-2 min-h-[42px]',
    }

    const typeStyles = {
      primary:
        'bg-[#1d4ed8] text-white border-transparent hover:bg-blue-700 active:bg-blue-800 shadow-xs dark:bg-blue-600 dark:hover:bg-blue-500',
      secondary:
        'bg-white dark:bg-[#23252c] text-[#1d1f27] dark:text-slate-100 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 active:bg-slate-100 dark:active:bg-slate-700 shadow-2xs',
      tertiary:
        'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-transparent hover:bg-slate-200 dark:hover:bg-slate-700',
      stealth:
        'bg-transparent text-slate-700 dark:text-slate-300 border-transparent hover:bg-slate-100 dark:hover:bg-[#262830] active:bg-slate-200 dark:active:bg-slate-700',
      danger:
        'bg-rose-600 text-white border-transparent hover:bg-rose-700 active:bg-rose-800 shadow-xs',
    }

    const activeStyle = active
      ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-semibold'
      : ''

    return (
      <button
        ref={ref}
        disabled={disabled || !!disabledReason || loading}
        title={disabledReason || props.title}
        className={clsx(
          baseStyles,
          sizeStyles[size],
          typeStyles[type],
          activeStyle,
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="animate-spin text-current">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </span>
        ) : (
          icon && <span className="flex items-center shrink-0">{icon}</span>
        )}
        {children && <span className="truncate">{children}</span>}
        {sideIcon && <span className="flex items-center shrink-0 ml-auto">{sideIcon}</span>}
      </button>
    )
  }
)

LemonButton.displayName = 'LemonButton'
