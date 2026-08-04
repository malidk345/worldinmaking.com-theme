import React, { useContext, forwardRef } from 'react'
import clsx from 'clsx'
import { IconChevronDown } from '@posthog/icons'

export interface LemonButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
    children?: React.ReactNode
    /** Visual variant */
    type?: 'primary' | 'secondary' | 'tertiary'
    status?: 'default' | 'alt' | 'danger'
    size?: 'xxsmall' | 'xsmall' | 'small' | 'medium' | 'large'
    icon?: React.ReactElement | null
    sideIcon?: React.ReactElement | null
    loading?: boolean
    active?: boolean
    disabled?: boolean
    disabledReason?: React.ReactNode | null | false
    fullWidth?: boolean
    center?: boolean
    noPadding?: boolean
    to?: string
    targetBlank?: boolean
    tooltip?: React.ReactNode
    htmlType?: 'button' | 'submit' | 'reset'
    'data-attr'?: string
    'aria-label'?: string
}

export const LemonButton = forwardRef<HTMLButtonElement, LemonButtonProps>(function LemonButton(
    {
        children,
        type = 'tertiary',
        status = 'default',
        size = 'medium',
        icon,
        sideIcon,
        loading = false,
        active = false,
        disabled = false,
        disabledReason,
        fullWidth = false,
        center = false,
        noPadding = false,
        to,
        targetBlank,
        htmlType = 'button',
        className,
        onClick,
        style,
        ...rest
    },
    ref
) {
    const isDisabled = disabled || !!disabledReason || loading

    const btn = (
        <button
            ref={ref}
            type={htmlType}
            disabled={isDisabled}
            onClick={isDisabled ? undefined : onClick}
            style={noPadding ? { padding: 0, ...style } : style}
            className={clsx(
                'LemonButton',
                `LemonButton--${type}`,
                `LemonButton--${size}`,
                status !== 'default' && `LemonButton--${status}`,
                active && 'LemonButton--active',
                fullWidth && 'LemonButton--fullWidth',
                center && 'LemonButton--center',
                isDisabled && 'LemonButton--disabled',
                className
            )}
            {...rest}
        >
            {loading ? (
                <span className="LemonButton__icon">
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        style={{ animation: 'spin 0.8s linear infinite' }}
                    >
                        <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                        <path d="M12 2 a10 10 0 0 1 10 10" />
                    </svg>
                </span>
            ) : icon ? (
                <span className="LemonButton__icon">{icon}</span>
            ) : null}
            {children && <span className="LemonButton__content">{children}</span>}
            {sideIcon && <span className="LemonButton__icon">{sideIcon}</span>}
        </button>
    )

    if (to) {
        return (
            <a
                href={to}
                target={targetBlank ? '_blank' : undefined}
                rel={targetBlank ? 'noopener noreferrer' : undefined}
                className={clsx(
                    'LemonButton',
                    `LemonButton--${type}`,
                    `LemonButton--${size}`,
                    status !== 'default' && `LemonButton--${status}`,
                    active && 'LemonButton--active',
                    fullWidth && 'LemonButton--fullWidth',
                    center && 'LemonButton--center',
                    className
                )}
                style={style}
            >
                {icon && <span className="LemonButton__icon">{icon}</span>}
                {children && <span className="LemonButton__content">{children}</span>}
                {sideIcon && <span className="LemonButton__icon">{sideIcon}</span>}
            </a>
        )
    }

    return btn
})
