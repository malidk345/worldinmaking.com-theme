import React from 'react'
import clsx from 'clsx'

export interface LemonSkeletonProps {
    className?: string
    repeat?: number
    fade?: boolean
    active?: boolean
}

function LemonSkeletonItem({
    className,
    active = true,
}: Pick<LemonSkeletonProps, 'className' | 'active'>): JSX.Element {
    return (
        <span
            className={clsx('LemonSkeleton', className)}
            style={active ? undefined : { animationPlayState: 'paused' }}
        />
    )
}

export function LemonSkeleton({ className, repeat = 1, fade = false, active = true }: LemonSkeletonProps): JSX.Element {
    return (
        <>
            {Array.from({ length: repeat }, (_, i) => (
                <LemonSkeletonItem
                    key={i}
                    active={active}
                    className={clsx(className, fade && i > 0 && `opacity-${Math.max(10, 100 - i * 20)}`)}
                />
            ))}
        </>
    )
}

// Named sub-variants
LemonSkeleton.Row = function LemonSkeletonRow({ className }: { className?: string }) {
    return <LemonSkeletonItem className={clsx('LemonSkeleton--row', className)} />
}
LemonSkeleton.Title = function LemonSkeletonTitle({ className }: { className?: string }) {
    return <LemonSkeletonItem className={clsx('LemonSkeleton--title', className)} />
}
LemonSkeleton.Button = function LemonSkeletonButton({ className }: { className?: string }) {
    return <LemonSkeletonItem className={clsx('LemonSkeleton--button', className)} />
}
LemonSkeleton.Circle = function LemonSkeletonCircle({ className, size = 40 }: { className?: string; size?: number }) {
    return (
        <LemonSkeletonItem
            className={clsx('LemonSkeleton--circle', className)}
            style={{ width: size, height: size } as React.CSSProperties}
        />
    )
}
