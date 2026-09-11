import React, { useState, useLayoutEffect } from 'react'
import clsx from 'clsx'
import { IconBrain, IconChevronDown, IconChevronRight } from '@posthog/icons'

export type ActivityStatus = 'pending' | 'in_progress' | 'completed' | 'failed'

export function ShimmeringContent({ children }: { children: React.ReactNode }): JSX.Element {
    const isTextContent = typeof children === 'string'
    if (isTextContent) {
        return (
            <span
                className="bg-clip-text text-transparent"
                style={{
                    backgroundImage:
                        'linear-gradient(90deg, var(--lemon-text-primary, #1d1f26), var(--lemon-text-muted, #888), var(--lemon-text-primary, #1d1f26))',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 3s linear infinite',
                }}
            >
                {children}
            </span>
        )
    }
    return <span className="inline-flex min-w-0 max-w-full animate-pulse">{children}</span>
}

export function Activity({
    id,
    title,
    subtitle,
    status = 'completed',
    icon = <IconBrain />,
    substeps = [],
    details = null,
}: {
    id: string
    title: React.ReactNode
    subtitle?: React.ReactNode
    status?: ActivityStatus
    icon?: React.ReactNode
    substeps?: string[]
    details?: React.ReactNode
}): JSX.Element {
    const hasDetails = substeps.length > 0 || !!details
    const [isDetailsExpanded, setIsDetailsExpanded] = useState(status !== 'completed' && status !== 'failed')

    useLayoutEffect(() => {
        setIsDetailsExpanded(status !== 'completed' && status !== 'failed')
    }, [status])

    return (
        <div className="flex flex-col rounded w-full min-w-0 gap-1 text-xs font-sans my-1">
            <div
                className="group/activity-header flex items-center gap-1.5 cursor-pointer select-none py-0.5"
                onClick={() => hasDetails && setIsDetailsExpanded(!isDetailsExpanded)}
            >
                {icon && (
                    <div className="relative flex items-center justify-center shrink-0 w-4 h-4 text-slate-500">
                        {status === 'in_progress' ? <ShimmeringContent>{icon}</ShimmeringContent> : icon}
                        {hasDetails && (
                            <span className="absolute inline-flex translate-x-1 scale-90 text-slate-400 opacity-0 transition-all duration-200 group-hover/activity-header:translate-x-0 group-hover/activity-header:scale-100 group-hover/activity-header:opacity-100">
                                <IconChevronDown className="w-4 h-4" />
                            </span>
                        )}
                    </div>
                )}
                <div className="flex items-center gap-1 flex-1 min-w-0">
                    <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center gap-1 min-w-0 font-medium text-slate-700 dark:text-slate-300">
                            {status === 'in_progress' ? <ShimmeringContent>{title}</ShimmeringContent> : <span>{title}</span>}
                        </div>
                        {subtitle && <div className="text-slate-400 truncate min-w-0">{subtitle}</div>}
                    </div>
                </div>
            </div>

            {isDetailsExpanded && hasDetails && (
                <div className="space-y-1 border-l-2 border-slate-200 dark:border-slate-800 pl-3.5 ml-1.5 text-slate-500">
                    {substeps.map((substep, idx) => (
                        <div key={idx} className="leading-relaxed text-[11px] font-mono">
                            {substep}
                        </div>
                    ))}
                    {details}
                </div>
            )}
        </div>
    )
}

export function ReasoningAnswer({
    content,
    completed = true,
    id,
}: {
    content: string
    completed?: boolean
    id: string
}): JSX.Element {
    return (
        <Activity
            id={id}
            title={completed ? 'Thought' : content}
            substeps={completed ? [content] : []}
            status={completed ? 'completed' : 'in_progress'}
            icon={<IconBrain className="w-4 h-4 text-blue-600" />}
        />
    )
}
