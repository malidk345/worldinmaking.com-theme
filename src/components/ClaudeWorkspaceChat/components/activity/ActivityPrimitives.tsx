import React, { useLayoutEffect, useState } from 'react'
import { IconChevronDown } from '@posthog/icons'

export type ActivityStatus = 'pending' | 'in_progress' | 'completed' | 'failed'

export function ShimmeringContent({ children }: { children: React.ReactNode }): JSX.Element {
    if (typeof children === 'string') {
        return (
            <span
                className="bg-clip-text text-transparent"
                style={{
                    backgroundImage:
                        'linear-gradient(in oklch 90deg, var(--text-primary, currentColor), var(--text-muted, currentColor), var(--text-secondary, currentColor), var(--text-muted, currentColor), var(--text-primary, currentColor))',
                    backgroundSize: '200% 100%',
                    animation: 'wim-thought-shimmer 3s linear infinite',
                }}
            >
                {children}
            </span>
        )
    }
    return (
        <span
            className="inline-flex size-3.5 shrink-0 items-center justify-center"
            style={{ animation: 'wim-thought-shimmer-opacity 3s linear infinite' }}
        >
            {children}
        </span>
    )
}

export function Activity({
    id,
    title,
    subtitle,
    status,
    icon,
    animate = true,
    allowWrap = false,
    compactBody = false,
    substeps = [],
    details = null,
    children = null,
}: {
    id: string
    title: React.ReactNode
    subtitle?: React.ReactNode
    status: ActivityStatus
    icon?: React.ReactNode
    animate?: boolean
    allowWrap?: boolean
    compactBody?: boolean
    substeps?: string[]
    details?: React.ReactNode
    children?: React.ReactNode
}): JSX.Element {
    const hasDetails = substeps.length > 0 || !!details
    const shouldExpand = hasDetails && status !== 'completed' && status !== 'failed'
    const [expanded, setExpanded] = useState(shouldExpand)
    const live = status === 'in_progress'
    const pending = status === 'pending'

    useLayoutEffect(() => {
        setExpanded(shouldExpand)
    }, [shouldExpand])

    const titleInner =
        live && animate ? (
            <ShimmeringContent>{title}</ShimmeringContent>
        ) : (
            <span className={live || pending ? 'text-muted' : ''}>{title}</span>
        )

    return (
        <div
            className="flex flex-col w-full min-w-0 gap-0.5 text-[12px] leading-[18px] text-primary"
            data-activity-id={id}
            style={{ animation: 'wim-activity-fade-in 150ms cubic-bezier(0.215, 0.61, 0.355, 1) both' }}
        >
            <div
                className={`group/activity-header transition-colors duration-500 flex gap-1 select-none min-w-0 ${
                    allowWrap ? 'items-start' : 'items-center'
                } ${hasDetails ? 'cursor-pointer rounded-sm hover:bg-accent' : 'cursor-default'} ${
                    expanded && hasDetails ? 'bg-accent' : ''
                } ${pending || live ? 'text-muted' : ''}`}
                onClick={hasDetails ? () => setExpanded((open) => !open) : undefined}
                onKeyDown={
                    hasDetails
                        ? (event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault()
                                  setExpanded((open) => !open)
                              }
                          }
                        : undefined
                }
                role={hasDetails ? 'button' : undefined}
                tabIndex={hasDetails ? 0 : undefined}
                aria-expanded={hasDetails ? expanded : undefined}
            >
                {icon && (
                    <div className="relative flex size-[18px] shrink-0 items-center justify-center overflow-hidden [&_svg]:size-3.5 [&_svg]:max-w-3.5 [&_svg]:max-h-3.5">
                        <span
                            className={`inline-flex size-3.5 items-center justify-center transition-[color,transform,opacity] duration-200 ease-out ${
                                live ? 'text-muted' : 'text-secondary'
                            } ${
                                hasDetails
                                    ? 'group-hover/activity-header:-translate-x-1 group-hover/activity-header:scale-90 group-hover/activity-header:opacity-0 group-focus-within/activity-header:-translate-x-1 group-focus-within/activity-header:scale-90 group-focus-within/activity-header:opacity-0'
                                    : ''
                            }`}
                        >
                            {live && animate ? <ShimmeringContent>{icon}</ShimmeringContent> : icon}
                        </span>
                        {hasDetails && (
                            <span className="absolute inline-flex size-[18px] items-center justify-center translate-x-1 scale-90 text-muted opacity-0 transition-[color,transform,opacity] duration-200 ease-out group-hover/activity-header:translate-x-0 group-hover/activity-header:scale-100 group-hover/activity-header:text-primary group-hover/activity-header:opacity-100 group-focus-within/activity-header:translate-x-0 group-focus-within/activity-header:scale-100 group-focus-within/activity-header:text-primary group-focus-within/activity-header:opacity-100">
                                <IconChevronDown className="size-3.5" />
                            </span>
                        )}
                    </div>
                )}
                <div className="flex min-h-[18px] min-w-0 flex-1 flex-col justify-center">
                    <div className={`min-w-0 leading-[18px] ${allowWrap ? '' : 'flex min-h-[18px] items-center'}`}>
                        {allowWrap ? (
                            <span
                                className={`whitespace-pre-wrap break-words ${
                                    compactBody ? 'text-[11.5px] leading-[1.4] tracking-tight' : 'leading-[18px]'
                                } ${live ? 'text-muted' : ''}`}
                            >
                                {titleInner}
                            </span>
                        ) : (
                            <span className="inline-flex min-w-0 items-center truncate leading-[18px]">{titleInner}</span>
                        )}
                    </div>
                    {subtitle && <div className="text-muted truncate min-w-0 leading-[18px]">{subtitle}</div>}
                </div>
            </div>
            {expanded && hasDetails && (
                <div className={`space-y-0.5 border-l-2 border-primary ${icon ? 'ml-2 pl-3' : 'pl-3'}`}>
                    {substeps.map((substep, index) => (
                        <p
                            key={`${id}-sub-${index}`}
                            className={`m-0 whitespace-pre-wrap break-words ${
                                compactBody ? 'text-[11.5px] leading-[1.4] tracking-tight' : 'leading-[18px]'
                            } ${status === 'completed' ? 'text-muted' : 'text-secondary'}`}
                            style={{ animation: 'wim-activity-fade-in 150ms cubic-bezier(0.215, 0.61, 0.355, 1) both' }}
                        >
                            {substep}
                        </p>
                    ))}
                    {details}
                </div>
            )}
            {children}
        </div>
    )
}
