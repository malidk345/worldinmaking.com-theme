import React from 'react'
import { IconMinus, IconSquare, IconExpand45Chevrons, IconCollapse45Chevrons, IconX } from './Icons'

// PostHog style OS Button component - Exact 3D layered effect from PostHog source
const OSButton = ({ children, icon, active, disabled, onClick, className = "", size = "md", tooltip, variant = "default", width = "auto" }) => {
    // Parent wrapper size classes - PostHog exact from OSButton/index.tsx
    const parentSizeClasses = {
        xs: 'border-px top-[0px] rounded-[5px]',
        sm: 'border-[1.5px] top-[0px] rounded-[5px]',
        md: 'border-[1.5px] top-[0px] rounded-[6px]',
        lg: 'border-[1.5px] top-[0px] rounded-[6px]',
        xl: 'border-[1.5px] top-[0px] rounded-[6px]',
    }

    // Child (inner button) size classes with 3D translate effect - PostHog exact
    const childSizeClasses = {
        xs: 'px-1.5 py-0.5 text-[11px] gap-0.5 rounded-[5px] translate-y-[-1px] hover:translate-y-[-2px] active:-translate-y-px border-[1.5px] -mx-px',
        sm: 'px-2 py-0.5 text-xs gap-1 rounded-[5px] translate-y-[-2px] hover:translate-y-[-3px] active:translate-y-[-1.5px] border-[1.5px] mx-[-1.5px]',
        md: 'px-2.5 py-1 gap-1 rounded-[6px] text-[13px] translate-y-[-2px] hover:translate-y-[-3px] active:translate-y-[-1.5px] border-[1.5px] mx-[-1.5px]',
        lg: 'px-3 py-1.5 text-[15px] gap-1 rounded-[6px] translate-y-[-2px] hover:translate-y-[-4px] active:translate-y-[-1px] border-[1.5px] mx-[-1.5px]',
        xl: 'px-4 py-2 text-base gap-1.5 rounded-[6px] translate-y-[-2px] hover:translate-y-[-4px] active:translate-y-[-1px] border-[1.5px] mx-[-1.5px]',
    }

    // Full width adjustments
    const fullWidthChildClasses = {
        xs: 'w-[calc(100%+2px)]',
        sm: 'w-[calc(100%+3px)]',
        md: 'w-[calc(100%+3px)]',
        lg: 'w-[calc(100%+3px)]',
        xl: 'w-[calc(100%+3px)]',
    }

    // Simple size classes for default variant (without 3D effect) - PostHog style
    const simpleSizeClasses = {
        xs: 'px-1 py-0.5 text-xs gap-0.5 rounded',
        sm: 'px-1 py-0.5 text-[13px] gap-1 rounded',
        md: 'px-1.5 py-1 gap-1 rounded text-sm',
        lg: 'px-2 py-1.5 text-[15px] gap-1 rounded-[6px]',
        xl: 'px-2.5 py-2 text-base gap-1.5 rounded-[6px]',
    }

    const iconSizeClasses = {
        xs: 'w-3 h-3',
        sm: 'w-3.5 h-3.5',
        md: 'w-4 h-4',
        lg: 'w-[18px] h-[18px]',
        xl: 'w-5 h-5',
    }

    if (variant === 'primary' || variant === 'secondary') {
        // 3D button with layered effect - PostHog exact from OSButton/index.tsx
        // Primary: bg-button-shadow parent, bg-orange child
        // Secondary: bg-orange parent, bg-white child
        return (
            <button
                onClick={onClick}
                disabled={disabled}
                title={tooltip}
                className={`
          relative items-center border transition-colors text-center group
          ${width === 'full' ? 'flex w-full' : 'inline-flex'}
          ${variant === 'primary'
                        ? 'bg-button-shadow dark:bg-button-shadow-dark border-button'
                        : 'bg-orange dark:bg-button-secondary-shadow-dark border-button dark:border-button-secondary-dark'
                    }
          ${parentSizeClasses[size]}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${className}
        `}
            >
                <span
                    className={`
            flex items-center justify-center no-underline font-bold select-none
            transition-all duration-100
            ${variant === 'primary'
                            ? 'bg-orange text-black hover:text-black dark:text-black dark:hover:text-black border-button dark:border-button-dark dark:bg-orange'
                            : 'bg-white text-primary hover:text-primary dark:text-primary-dark dark:hover:text-primary-dark border-button dark:border-orange dark:bg-dark'
                        }
            ${childSizeClasses[size]}
            ${width === 'full' ? fullWidthChildClasses[size] : ''}
            ${disabled ? '' : 'group-disabled:hover:!translate-y-[-2px]'}
          `}
                >
                    {icon && <span className={iconSizeClasses[size]}>{icon}</span>}
                    {children}
                </span>
            </button>
        )
    }

    // Default variant - simple flat button (PostHog style)
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={tooltip}
            className={`
        relative inline-flex items-center rounded border border-transparent
        text-secondary dark:text-primary-dark/60 transition-colors font-medium
        ${active
                    ? 'font-bold bg-accent/50 dark:bg-accent-dark border-border dark:border-accent-dark text-primary'
                    : 'hover:border-border dark:hover:border-accent-dark hover:text-primary dark:hover:text-primary-dark'
                }
        active:bg-accent/50 dark:active:bg-accent-dark/50
        ${disabled ? 'opacity-40 cursor-not-allowed hover:border-transparent' : 'cursor-pointer'}
        ${simpleSizeClasses[size]}
        ${className}
      `}
        >
            {icon && <span className={iconSizeClasses[size]}>{icon}</span>}
            {children}
        </button>
    )
}

export default OSButton
