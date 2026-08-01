import React, { forwardRef } from 'react'
import clsx from 'clsx'
import { IconX } from '@posthog/icons'
import { LemonButton } from './LemonButton'

export interface LemonCardProps {
    hoverEffect?: boolean
    className?: string
    children?: React.ReactNode
    onClick?: () => void
    focused?: boolean
    'data-attr'?: string
    closeable?: boolean
    onClose?: () => void
    style?: React.CSSProperties
}

export const LemonCard = forwardRef<HTMLDivElement, LemonCardProps>(function LemonCard(
    { hoverEffect = true, className, children, onClick, focused, closeable, onClose, style, ...props },
    ref
): JSX.Element {
    return (
        <div
            ref={ref}
            className={clsx(
                'LemonCard',
                hoverEffect && 'LemonCard--hoverEffect',
                focused && 'LemonCard--focused',
                onClick && !focused && 'LemonCard--clickable',
                className
            )}
            onClick={onClick}
            style={style}
            {...props}
        >
            {closeable ? (
                <div className="LemonCard__close">
                    <LemonButton
                        icon={<IconX />}
                        onClick={(e) => {
                            e.stopPropagation()
                            onClose?.()
                        }}
                        type="tertiary"
                        size="xsmall"
                    />
                </div>
            ) : null}
            {children}
        </div>
    )
})
