"use client"

import React from 'react'
import Tooltip from 'components/RadixUI/Tooltip'
import Link from 'components/Link'
import ZoomHover from 'components/ZoomHover'
import { ExternalLink, ChevronRight } from 'lucide-react'
import type { LinkState } from 'components/Link'

// basic usage
// <osbutton>click me</osbutton>

interface OSButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
    children?: React.ReactNode
    variant?: 'default' | 'primary' | 'secondary' | 'underline' | 'underlineOnHover' | 'ghost'
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
    icon?: React.ReactNode
    iconClassName?: string
    tooltip?: string | React.ReactNode
    tooltipDelay?: number
    label?: string
    chip?: string
    chipColor?: string
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
    hover?: 'border' | 'background'
}

const OSButton = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, OSButtonProps>(
    (
        {
            children,
            variant = 'default',
            size = 'lg',
            icon,
            iconClassName,
            tooltip,
            tooltipDelay = 0,
            label,
            chip,
            chipColor,
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
            hover = 'border',
            ...props
        },
        ref
    ) => {
        const baseClasses =
            'relative items-center rounded border text-primary transition-colors transition-[font-size,line-height,padding] transition-50 hover:transition-none disabled:text-muted disabled:cursor-not-allowed select-none'

        const parentSizeClasses = {
            xs: 'border-px top-[0px] rounded-[5px]',
            sm: 'border-[1.5px] top-[0px] rounded-[5px]',
            md: 'border-[1.5px] top-[0px] rounded-[6px]',
            lg: 'border-[1.5px] top-[0px] rounded-[6px]',
            xl: 'border-[1.5px] top-[0px] rounded-[6px]',
        }

        const childSizeClasses = {
            xs: 'px-1.5 py-0.5 text-[11px] gap-0.5 rounded-[5px] translate-y-[-1px] hover:translate-y-[-2px] active:translate-y-[0px] border-[1.5px] -mx-px group-disabled:hover:!translate-y-[-1px]',
            sm: 'px-2 py-0.5 text-xs gap-1 rounded-[5px] translate-y-[-2px] hover:translate-y-[-3px] active:translate-y-[0px] border-[1.5px] mx-[-1.5px] group-disabled:hover:!translate-y-[-2px]',
            md: 'px-2.5 py-1 gap-1 rounded-[6px] text-[13px] translate-y-[-2px] hover:translate-y-[-3px] active:translate-y-[0px] border-[1.5px] mx-[-1.5px] group-disabled:hover:!translate-y-[-2px]',
            lg: 'px-3 py-1.5 text-[15px] gap-1 rounded-[6px] translate-y-[-2px] hover:translate-y-[-4px] active:translate-y-[0px] border-[1.5px] mx-[-1.5px] group-disabled:hover:!translate-y-[-2px]',
            xl: 'px-4 py-2 text-base gap-1.5 rounded-[6px] translate-y-[-2px] hover:translate-y-[-4px] active:translate-y-[0px] border-[1.5px] mx-[-1.5px] group-disabled:hover:!translate-y-[-2px]',
        }

        const simpleSizeClasses = {
            xs: 'px-1.5 py-0.5 text-[11px] gap-0.5',
            sm: 'px-2 py-0.5 text-xs gap-1',
            md: 'px-2.5 py-1 gap-1 text-[13px]',
            lg: 'px-3 py-1.5 text-[15px] gap-1',
            xl: 'px-4 py-2 text-base gap-1.5',
        }

        const iconSizeClasses = {
            xs: 'size-3',
            sm: 'size-3.5',
            md: 'size-4',
            lg: 'size-5',
            xl: 'size-6',
        }

        const variantClasses = {
            default: `bg-transparent border-transparent ${active
                ? 'bg-accent/50 dark:bg-accent border-primary'
                : 'hover:border-primary'
                }`,
            primary: {
                parent: 'bg-button-shadow dark:bg-button-shadow-dark border-button-border text-primary text-center group disabled:opacity-50 disabled:cursor-not-allowed',
                child: 'flex items-center justify-center bg-accent text-primary border-button-border font-bold active:transition-all active:duration-100',
            },
            secondary: {
                parent: 'bg-primary dark:bg-button-secondary-shadow-dark text-primary border-primary text-center group disabled:opacity-50 disabled:cursor-not-allowed',
                child: 'flex items-center justify-center bg-accent dark:bg-accent text-primary border-primary font-bold active:transition-all active:duration-100',
            },
            underline: 'underline border-transparent hover:no-underline !p-0',
            underlineOnHover: 'hover:underline border-transparent !p-0',
            ghost: 'bg-transparent border-transparent hover:bg-accent',
        }

        const buttonContent = (
            <>
                {variant === 'primary' || variant === 'secondary' ? (
                    <span
                        className={`${variantClasses[variant].child} ${childSizeClasses[size]} ${width === 'full' ? 'w-full' : ''
                            }`}
                    >
                        {icon && iconPosition === 'left' && <span className={iconSizeClasses[size]}>{icon}</span>}
                        {children}
                        {external && <ExternalLink className="size-3.5 opacity-50 ml-1" />}
                        {icon && iconPosition === 'right' && <span className={iconSizeClasses[size]}>{icon}</span>}
                    </span>
                ) : (
                    <span className="flex items-center gap-2">
                        {icon && iconPosition === 'left' && <span className={iconSizeClasses[size]}>{icon}</span>}
                        {children}
                        {external && <ExternalLink className="size-3.5 opacity-50" />}
                        {icon && iconPosition === 'right' && <span className={iconSizeClasses[size]}>{icon}</span>}
                    </span>
                )}
            </>
        )

        const commonClasses = `${baseClasses} ${width === 'full' ? 'flex w-full' : 'inline-flex'} ${variant === 'primary' || variant === 'secondary'
            ? `${parentSizeClasses[size]} ${variantClasses[variant].parent}`
            : `${simpleSizeClasses[size]} ${variantClasses[variant as keyof typeof variantClasses]
            } ${disabled ? 'disabled:hover:bg-transparent' : ''}`
            } ${align === 'center' ? 'justify-center' : 'justify-start text-left'} ${className}`

        const buttonElement = asLink ? (
            <Link to={to || ''} className={commonClasses} state={state} ref={ref as React.Ref<HTMLAnchorElement>}>
                {buttonContent}
            </Link>
        ) : (
            <button
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
    }
)

OSButton.displayName = 'OSButton'

export default OSButton
