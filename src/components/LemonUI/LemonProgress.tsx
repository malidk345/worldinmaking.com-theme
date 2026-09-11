import React, { forwardRef } from 'react'
import clsx from 'clsx'

export type LemonProgressProps = React.HTMLAttributes<HTMLDivElement> & {
    size?: 'medium' | 'large'
    bgColor?: string
    strokeColor?: string
    percent: number
    smoothing?: boolean
    children?: React.ReactNode
    className?: string
}

export const LemonProgress = forwardRef<HTMLDivElement, LemonProgressProps>(function LemonProgress(
    {
        size = 'medium',
        percent,
        smoothing = true,
        bgColor = 'var(--lemon-bg-muted)',
        strokeColor = 'var(--lemon-primary)',
        children,
        className,
        style,
        ...rest
    },
    ref
): JSX.Element {
    const width = isNaN(percent) ? 0 : Math.max(Math.min(percent, 100), 0)

    return (
        <div
            ref={ref}
            className={clsx(
                'LemonProgress',
                `LemonProgress--${size}`,
                className
            )}
            style={{ backgroundColor: bgColor, ...style }}
            {...rest}
        >
            <span
                className={clsx('LemonProgress__track', smoothing && 'LemonProgress__track--smoothing')}
                style={{ width: `${width}%`, backgroundColor: strokeColor }}
            >
                {children}
            </span>
        </div>
    )
})
