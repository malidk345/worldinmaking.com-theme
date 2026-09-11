import React, { forwardRef } from 'react'
import clsx from 'clsx'

interface LemonBadgePropsBase {
    size?: 'xsmall' | 'small' | 'medium' | 'large'
    position?: 'none' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
    className?: string
    status?: 'primary' | 'success' | 'warning' | 'danger' | 'muted' | 'data'
    active?: boolean
    style?: React.CSSProperties
    title?: string
}

export interface LemonBadgeProps extends LemonBadgePropsBase {
    content?: string | React.ReactElement
    visible?: boolean
}

export interface LemonBadgeNumberProps extends LemonBadgePropsBase {
    count: number
    maxDigits?: number
    showZero?: boolean
    forcePlus?: boolean
}

export const LemonBadge = forwardRef<HTMLSpanElement, LemonBadgeProps>(function LemonBadge(
    { content, visible = true, size = 'medium', position = 'none', status = 'primary', className, style, title },
    ref
) {
    if (!visible) return null
    return (
        <span
            ref={ref}
            title={title}
            style={style}
            className={clsx(
                'LemonBadge',
                `LemonBadge--${size}`,
                `LemonBadge--${status}`,
                position !== 'none' && `LemonBadge--position-${position}`,
                className
            )}
        >
            {content}
        </span>
    )
})

export const LemonBadgeNumber = forwardRef<HTMLSpanElement, LemonBadgeNumberProps>(function LemonBadgeNumber(
    { count, maxDigits = 1, showZero = false, forcePlus = false, size = 'medium', position = 'none', status = 'primary', className, style, title },
    ref
) {
    if (!showZero && count === 0) return null
    const maxCount = Math.pow(10, maxDigits) - 1
    const displayCount = count > maxCount ? `${maxCount}+` : forcePlus ? `${count}+` : String(count)

    return (
        <span
            ref={ref}
            title={title}
            style={style}
            className={clsx(
                'LemonBadge',
                `LemonBadge--${size}`,
                `LemonBadge--${status}`,
                position !== 'none' && `LemonBadge--position-${position}`,
                className
            )}
        >
            {displayCount}
        </span>
    )
})
