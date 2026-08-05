/**
 * PostHog AI–style thinking UI
 * (mirrors products/posthog_ai ReasoningAnswer + ActivityPrimitives)
 *
 * - In progress: brain icon + shimmering "Thinking…"
 * - Complete: collapsible "Thought" with left-rail substeps
 */
import React, { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { IconBrain, IconChevronDown } from '@posthog/icons'

function ShimmerText({ children }: { children: string }): JSX.Element {
    return (
        <span
            className="bg-clip-text text-transparent"
            style={{
                backgroundImage:
                    'linear-gradient(90deg, var(--text-3000, #111) 0%, var(--muted-3000, #888) 40%, var(--text-3000, #111) 80%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 3s linear infinite',
            }}
        >
            {children}
        </span>
    )
}

function ShimmerIcon({ children }: { children: React.ReactNode }): JSX.Element {
    return (
        <span className="inline-flex" style={{ animation: 'shimmer-opacity 3s linear infinite' }}>
            {children}
        </span>
    )
}

export interface ReasoningStage {
    id: string
    label: string
    text: string
}

export interface ReasoningAnswerProps {
    id: string
    completed: boolean
    content?: string
    stages?: ReasoningStage[]
    progressLabel?: string
    completedLabel?: string
    className?: string
}

export function ReasoningAnswer({
    id,
    completed,
    content = '',
    stages,
    progressLabel = 'Thinking…',
    completedLabel = 'Thought',
    className,
}: ReasoningAnswerProps): JSX.Element | null {
    const substeps: Array<{ label?: string; text: string }> =
        stages && stages.length > 0
            ? stages
                  .filter((s) => s && typeof s.text === 'string' && s.text.trim())
                  .map((s) => ({
                      label: s.id !== 'raw' && s.label ? s.label : undefined,
                      text: s.text.trim(),
                  }))
            : content.trim()
              ? [{ text: content.trim() }]
              : []

    // Complete with nothing to show → hide
    if (completed && substeps.length === 0) {
        return null
    }

    const hasDetails = substeps.length > 0
    // Expand while streaming; collapse when done (PostHog Max behavior)
    const [expanded, setExpanded] = useState(!completed && hasDetails)

    useEffect(() => {
        setExpanded(!completed && hasDetails)
    }, [completed, hasDetails, id])

    const title = completed ? completedLabel : progressLabel

    return (
        <div
            className={clsx('flex flex-col rounded w-full min-w-0 gap-1 text-xs', className)}
            data-attr="reasoning-answer"
        >
            <div
                className={clsx(
                    'group/thought-header flex select-none min-w-0 items-center transition-colors duration-300 rounded px-1 -mx-1',
                    !completed && 'text-muted',
                    completed && 'text-primary',
                    hasDetails && 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5',
                    hasDetails && expanded && 'bg-black/5 dark:bg-white/5'
                )}
                onClick={
                    hasDetails
                        ? (e) => {
                              e.stopPropagation()
                              setExpanded((v) => !v)
                          }
                        : undefined
                }
                onKeyDown={
                    hasDetails
                        ? (e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  e.stopPropagation()
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
                {/* Icon → chevron swap on hover (PostHog Activity header) */}
                <div className="relative flex items-center justify-center w-5 h-5 shrink-0 overflow-hidden">
                    <span
                        className={clsx(
                            'inline-flex items-center justify-center transition-all duration-200',
                            hasDetails &&
                                'group-hover/thought-header:opacity-0 group-hover/thought-header:scale-90 group-hover/thought-header:-translate-x-0.5'
                        )}
                    >
                        {!completed ? (
                            <ShimmerIcon>
                                <IconBrain className="w-4 h-4" />
                            </ShimmerIcon>
                        ) : (
                            <IconBrain className="w-4 h-4 opacity-70" />
                        )}
                    </span>
                    {hasDetails && (
                        <span
                            className={clsx(
                                'absolute inline-flex items-center justify-center opacity-0 scale-90 translate-x-0.5 transition-all duration-200',
                                'group-hover/thought-header:opacity-100 group-hover/thought-header:scale-100 group-hover/thought-header:translate-x-0'
                            )}
                        >
                            <IconChevronDown className="w-4 h-4" />
                        </span>
                    )}
                </div>

                <div className="flex items-center min-w-0 min-h-[20px] pl-1 font-medium">
                    {!completed ? <ShimmerText>{title}</ShimmerText> : <span>{title}</span>}
                </div>
            </div>

            {expanded && hasDetails && (
                <div className="space-y-1.5 border-l-2 border-[var(--border-3000,#e2e8f0)] pl-3 ml-[10px]">
                    {substeps.map((step, i) => (
                        <div
                            key={`${id}-step-${i}`}
                            className="leading-relaxed whitespace-pre-wrap text-muted"
                        >
                            {step.label ? (
                                <>
                                    <span className="font-semibold text-secondary">{step.label}.</span>{' '}
                                    <span>{step.text}</span>
                                </>
                            ) : (
                                step.text
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
