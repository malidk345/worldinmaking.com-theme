"use client"

import React from 'react'
import Tooltip from 'components/RadixUI/Tooltip'
import Link from 'components/Link'
import ZoomHover from 'components/ZoomHover'
import { IconExternal } from '@posthog/icons';
import type { LinkState } from 'components/Link'

// basic usage
// <osbutton>click me</osbutton>

interface OSButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
    children?: React.ReactNode
    variant?: 'default' | 'primary' | 'secondary' | 'underline' | 'underlineOnHover' | 'ghost'
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
    icon?: React.ReactNode
    tooltip?: string | React.ReactNode
    tooltipDelay?: number
    className?: string
    active?: boolean
    disabled?: boolean
    align?: 'left' | 'center'
    width?: 'auto' | 'full'
    asLink?: boolean
    external?: boolean
    to?: string
    iconPosition?: 'left' | 'right'
    onClick?: (e: React.MouseEvent<HTMLButtonElement> | React.MouseEvent<HTMLAnchorElement>) => void
    state?: LinkState
    zoomHover?: boolean | 'xs' | 'sm' | 'md' | 'lg'
}

const OSButton = React.memo(React.forwardRef<HTMLButtonElement | HTMLAnchorElement, OSButtonProps>(
    (
        {
            children,
            variant = 'default',
            size = 'lg',
            icon,
            tooltip,
            tooltipDelay = 0,
            className = '',
            active = false,
            disabled = false,
            align = 'center',
            width = 'auto',
            asLink = false,
            external = false,
            to,
            iconPosition = 'left',
            onClick,
            state = {},
            zoomHover,
            ...props
        },
        ref
    ) => {
        const baseClasses =
            'relative items-center justify-center font-bold tracking-tight rounded-full transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20'

        const sizeClasses = {
            xs: 'px-2.5 py-1.5 text-[11px] gap-1',
            sm: 'px-3 py-1.5 text-xs gap-1',
            md: 'px-4 py-2 text-[13px] gap-1.5',
            lg: 'px-5 py-2.5 text-[15px] gap-1.5',
            xl: 'px-6 py-3 text-base gap-2',
        }

        const iconSizeClasses = {
            xs: 'size-3',
            sm: 'size-3.5',
            md: 'size-4',
            lg: 'size-5',
            xl: 'size-6',
        }

        const variantClasses = {
            default: `bg-transparent text-[#1d1d1f] dark:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:scale-[1.04] ${active ? 'bg-black/[0.04] dark:bg-white/[0.06]' : ''}`,
            primary: 'bg-[#1d1d1f] text-[#fdfdf8] dark:bg-[#fdfdf8] dark:text-[#1d1d1f] shadow-[0_4px_14px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)] hover:scale-[1.04] hover:-translate-y-0.5',
            secondary: `bg-white dark:bg-[#1C1C1E] text-[#1d1d1f] dark:text-white border border-black/5 dark:border-white/5 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:scale-[1.04] hover:-translate-y-0.5 ${active ? 'bg-gray-50 dark:bg-[#2C2C2E]' : ''}`,
            underline: 'underline border-transparent hover:no-underline !p-0 !bg-transparent text-[#1d1d1f] dark:text-white hover:scale-100 active:scale-100 active:translate-y-0',
            underlineOnHover: 'hover:underline border-transparent !p-0 !bg-transparent text-[#1d1d1f] dark:text-white hover:scale-100 active:scale-100 active:translate-y-0',
            ghost: `bg-transparent text-[#1d1d1f] dark:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.08] ${active ? 'bg-black/[0.05] dark:bg-white/[0.08]' : ''}`,
        }

        const buttonContent = (
            <span className="flex items-center justify-center gap-[inherit]">
                {icon && iconPosition === 'left' && <span className={iconSizeClasses[size]}>{icon}</span>}
                {children}
                {external && <IconExternal className="size-3.5 opacity-50 ml-1" />}
                {icon && iconPosition === 'right' && <span className={iconSizeClasses[size]}>{icon}</span>}
            </span>
        )

        // Determine if variant is simple link style which doesn't need flex/padding from sizeClasses
        const isLinkVariant = variant === 'underline' || variant === 'underlineOnHover';

        const commonClasses = `${baseClasses} ${width === 'full' ? 'flex w-full' : 'inline-flex'} ${!isLinkVariant ? sizeClasses[size] : ''} ${variantClasses[variant as keyof typeof variantClasses]} ${align === 'center' ? 'text-center' : 'text-left'} ${className}`

        const buttonElement = asLink ? (
            <Link
                to={to || ''}
                className={commonClasses}
                state={state}
                ref={ref as React.Ref<HTMLAnchorElement>}
                {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
            >
                {buttonContent}
            </Link>
        ) : (
            <button
                type="button"
                className={commonClasses}
                onClick={onClick}
                disabled={disabled}
                ref={ref as React.Ref<HTMLButtonElement>}
                {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
            >
                {buttonContent}
            </button>
        )

        // Apply ZoomHover if requested
        const finalElement = zoomHover ? (
            <ZoomHover size={typeof zoomHover === 'string' ? zoomHover : 'md'}>{buttonElement}</ZoomHover>
        ) : (
            buttonElement
        )

        return tooltip ? (
            <Tooltip delay={tooltipDelay} trigger={finalElement}>
                {tooltip}
            </Tooltip>
        ) : (
            finalElement
        )
    })
)

OSButton.displayName = 'OSButton'

export default OSButton
