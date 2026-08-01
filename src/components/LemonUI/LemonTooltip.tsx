import React from 'react'

export type TooltipTitle = string | React.ReactNode | (() => string)

export interface LemonTooltipProps {
    children: React.ReactElement | React.ReactNode
    title?: TooltipTitle
    docLink?: string
    placement?: string
    className?: string
    visible?: boolean
    [key: string]: any
}

export function LemonTooltip({ children, title }: LemonTooltipProps): JSX.Element {
    const titleString = typeof title === 'string' ? title : typeof title === 'function' ? title() : undefined
    if (React.isValidElement(children)) {
        return React.cloneElement(children as React.ReactElement<any>, {
            title: titleString || (children.props as any)?.title,
        })
    }
    return <span title={titleString}>{children}</span>
}

export const Tooltip = LemonTooltip
