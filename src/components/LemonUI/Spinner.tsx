import React, { forwardRef } from 'react'
import clsx from 'clsx'

export interface SpinnerProps {
    textColored?: boolean
    className?: string
    speed?: `${number}s`
    captureTime?: boolean
    size?: 'small' | 'medium' | 'large'
    frozen?: boolean
}

export const Spinner = forwardRef<SVGSVGElement, SpinnerProps>(function Spinner(
    { textColored = false, className, speed = '1s', size = 'small', frozen = false },
    ref
): JSX.Element {
    return (
        <svg
            ref={ref}
            style={{ '--spinner-speed': speed } as React.CSSProperties}
            className={clsx(
                'Spinner',
                textColored && 'Spinner--textColored',
                size && `Spinner--${size}`,
                frozen && 'Spinner--frozen',
                className
            )}
            viewBox="0 0 48 48"
            xmlns="http://www.w3.org/2000/svg"
        >
            <g className="Spinner__layer">
                <circle cx="24" cy="24" r="16" />
            </g>
            <g className="Spinner__layer">
                <circle cx="24" cy="24" r="16" />
            </g>
        </svg>
    )
})

export function SpinnerOverlay({
    sceneLevel,
    visible = true,
    className,
    ...spinnerProps
}: SpinnerProps & {
    sceneLevel?: boolean
    visible?: boolean
}): JSX.Element {
    return (
        <div
            className={clsx('SpinnerOverlay', sceneLevel && 'SpinnerOverlay--scene-level')}
            aria-hidden={!visible}
        >
            <Spinner className={clsx('text-5xl', className)} {...spinnerProps} />
        </div>
    )
}
