import React from 'react'
import clsx from 'clsx'

export interface LemonDividerProps {
    thick?: boolean
    vertical?: boolean
    dashed?: boolean
    className?: string
    label?: string | React.ReactElement
}

export function LemonDivider({ thick, vertical, dashed, className, label }: LemonDividerProps): JSX.Element {
    if (label) {
        return <div className={clsx('LemonDivider', 'LemonDivider--label', className)}>{label}</div>
    }
    return (
        <hr
            className={clsx(
                'LemonDivider',
                vertical ? 'LemonDivider--vertical' : 'LemonDivider--horizontal',
                thick && 'LemonDivider--thick',
                dashed && 'LemonDivider--dashed',
                className
            )}
        />
    )
}
