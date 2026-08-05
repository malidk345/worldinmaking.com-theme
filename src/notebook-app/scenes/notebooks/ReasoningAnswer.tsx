/**
 * PostHog AI–style thinking UI (from products/posthog_ai ReasoningAnswer + ActivityPrimitives).
 *
 * - In progress: brain icon + shimmering "Thinking…"
 * - Complete: collapses to "Thought"; expand shows substeps with left rail
 */
import { useLayoutEffect, useState, type ReactNode } from 'react'
import clsx from 'clsx'
import { IconBrain, IconChevronDown } from '@posthog/icons'

export type ReasoningStatus = 'in_progress' | 'completed'

function ShimmeringContent({ children }: { children: ReactNode }): JSX.Element {
    const isText = typeof children === 'string'
    if (isText) {
        return (
            <span
                className="bg-clip-text text-transparent"
                style={{
                    backgroundImage:
                        'linear-gradient(in oklch 90deg, var(--text-3000, currentColor), var(--muted-3000, #8b8b8b), var(--trace-3000, #c0c0c0), var(--muted-3000, #8b8b8b), var(--text-3000, currentColor))',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 3s linear infinite',
                }}
            >
                {children}
            </span>
        )
    }
    return (
        <span className="inline-flex min-w-0 max-w-full" style={{ animation: 'shimmer-opacity 3s linear infinite' }}>
            {children}
        </span>
    )
}

export interface ReasoningAnswerProps {
    /** Full thought body (shown when expanded / as substeps) */
    content?: string
    /** Structured stages — preferred when present */
    stages?: Array<{ id: string; label: string; text: string }>
    completed: boolean
    id: string
    /** Live label while in progress (defaults to "Thinking…") */
    progressLabel?: string
    /** Completed collapsed title (defaults to "Thought") */
    completedLabel?: string
    className?: string
}

export function ReasoningAnswer({
    content = '',
    stages,
    completed,
    id,
    progressLabel = 'Thinking…',
    completedLabel = 'Thought',
    className,
}: ReasoningAnswerProps): JSX.Element | null {
    const substeps =
        stages && stages.length > 0
            ? stages.map((s) => (s.label && s.id !== 'raw' ? `**${s.label}.** ${s.text}` : s.text))
            : content.trim()
              ? [content.trim()]
              : []

    // Nothing to show when complete with empty body
    if (completed && substeps.length === 0) {
        return null
    }

    const hasDetails = substeps.length > 0
    const shouldExpand = hasDetails && !completed
    const [expanded, setExpanded] = useState(shouldExpand)

    useLayoutEffect(() => {
        setExpanded(shouldExpand)
    }, [shouldExpand, id])

    const title = completed ? completedLabel : progressLabel
    const status: ReasoningStatus = completed ? 'completed' : 'in_progress'

    return (
        <div className={clsx('flex flex-col rounded w-full min-w-0 gap-1 text-xs', className)} data-attr="reasoning-answer">
            <div
                className={clsx(
                    'group/activity-header transition-colors duration-500 flex select-none min-w-0',
                    status === 'in_progress' && 'text-muted',
                    status === 'completed' && 'text-default',
                    hasDetails ? 'cursor-pointer' : 'cursor-default',
                    hasDetails && 'rounded px-1 -mx-1 hover:bg-[var(--color-bg-fill-button-tertiary-hover,rgba(0,0,0,0.04))]',
                    hasDetails &&
                        expanded &&
                        'bg-[var(--color-bg-fill-button-tertiary-active,rgba(0,0,0,0.06))]'
                )}
                onClick={hasDetails ? () => setExpanded((v) => !v) : undefined}
                onKeyDown={
                    hasDetails
                        ? (e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  setExpanded((v) => !v)
                              }
                          }
                        : undefined
                }
                role={hasDetails ? 'button' : undefined}
                tabIndex={hasDetails ? 0 : undefined}
                aria-expanded={hasDetails ? expanded : undefined}
                aria-label={hasDetails ? (expanded ? 'Collapse thought' : 'Expand thought') : undefined}
            >
                <div className="relative flex items-center justify-center size-5 shrink-0 overflow-hidden">
                    <span
                        className={clsx(
                            'inline-flex transition-[color,transform,opacity] duration-200 ease-out',
                            status === 'in_progress' && 'text-muted',
                            hasDetails &&
                                'group-hover/activity-header:-translate-x-1 group-hover/activity-header:scale-90 group-hover/activity-header:opacity-0 group-focus-within/activity-header:-translate-x-1 group-focus-within/activity-header:scale-90 group-focus-within/activity-header:opacity-0'
                        )}
                    >
                        {status === 'in_progress' ? (
                            <ShimmeringContent>
                                <IconBrain className="size-4" />
                            </ShimmeringContent>
                        ) : (
                            <IconBrain className="size-4" />
                        )}
                    </span>
                    {hasDetails && (
                        <span className="absolute inline-flex translate-x-1 scale-90 text-tertiary opacity-0 transition-[color,transform,opacity] duration-200 ease-out group-hover/activity-header:translate-x-0 group-hover/activity-header:scale-100 group-hover/activity-header:text-primary group-hover/activity-header:opacity-100 group-focus-within/activity-header:translate-x-0 group-focus-within/activity-header:scale-100 group-focus-within/activity-header:text-primary group-focus-within/activity-header:opacity-100">
                            <IconChevronDown className="size-5" />
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1 flex-1 min-w-0 min-h-5 pl-1">
                    {status === 'in_progress' ? (
                        <ShimmeringContent>{title}</ShimmeringContent>
                    ) : (
                        <span className="inline-flex font-medium">{title}</span>
                    )}
                </div>
            </div>

            {expanded && hasDetails && (
                <div
                    className={clsx(
                        'space-y-1.5 border-l-2 border-[var(--border-3000,#e2e8f0)] pl-3.5 ml-[calc(0.775rem)]'
                    )}
                >
                    {substeps.map((step, i) => {
                        const isLast = i === substeps.length - 1
                        // Simple **Label.** prefix rendering without full markdown
                        const boldMatch = step.match(/^\*\*(.+?)\.\*\*\s*([\s\S]*)$/)
                        return (
                            <div
                                key={`${id}-step-${i}`}
                                className={clsx(
                                    'leading-relaxed whitespace-pre-wrap',
                                    completed || !isLast ? 'text-muted' : 'text-secondary'
                                )}
                            >
                                {boldMatch ? (
                                    <>
                                        <span className="font-semibold text-secondary">{boldMatch[1]}.</span>{' '}
                                        <span>{boldMatch[2]}</span>
                                    </>
                                ) : (
                                    step
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
