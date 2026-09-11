import React, { forwardRef } from 'react'
import clsx from 'clsx'
import { IconX } from '@posthog/icons'

export type LemonTagType =
    | 'primary' | 'option' | 'highlight' | 'warning' | 'danger'
    | 'success' | 'default' | 'muted' | 'completion' | 'caution' | 'none'

export interface LemonTagProps {
    type?: LemonTagType
    children: React.ReactNode
    size?: 'small' | 'medium'
    icon?: React.ReactElement
    closable?: boolean
    onClose?: () => void
    onClick?: (e: React.MouseEvent<HTMLDivElement>) => void
    className?: string
    title?: string
    'data-attr'?: string
}

export const LemonTag = forwardRef<HTMLDivElement, LemonTagProps>(function LemonTag(
    {
        type = 'default',
        children,
        size,
        icon,
        closable,
        onClose,
        onClick,
        className,
        title,
        ...rest
    },
    ref
) {
    return (
        <div
            ref={ref}
            title={title}
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            className={clsx(
                'LemonTag',
                `LemonTag--${type}`,
                size === 'small' && 'LemonTag--small',
                onClick && 'cursor-pointer',
                className
            )}
            {...rest}
        >
            {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
            {children}
            {closable && (
                <span
                    style={{ display: 'flex', alignItems: 'center', marginLeft: 2, cursor: 'pointer' }}
                    onClick={(e) => { e.stopPropagation(); onClose?.() }}
                >
                    <IconX style={{ width: 10, height: 10 }} />
                </span>
            )}
        </div>
    )
})
