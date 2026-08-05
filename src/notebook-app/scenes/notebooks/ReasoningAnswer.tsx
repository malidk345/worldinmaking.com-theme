/**
 * Multi-stage thinking UI (PostHog AI Activity + our 4-step process).
 *
 * Pipeline: Perceive → Frame → Tension → Move
 * - In progress: stages reveal one-by-one with shimmer on the active step
 * - Complete: collapses to "Thought · N steps"; expand shows full left-rail trail
 */
import React, { useEffect, useMemo, useState } from 'react'
import { clsx } from 'clsx'
import { IconBrain, IconChevronDown, IconCheck } from '@posthog/icons'

/** Canonical order of the philosopher thinking process */
export const THINKING_PIPELINE = [
    { id: 'perceive', label: 'Perceive', progress: 'Perceiving…' },
    { id: 'frame', label: 'Frame', progress: 'Framing…' },
    { id: 'tension', label: 'Tension', progress: 'Finding tension…' },
    { id: 'move', label: 'Move', progress: 'Choosing a move…' },
] as const

export type ThinkingStageId = (typeof THINKING_PIPELINE)[number]['id']

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
    /** Optional total latency for "Thought for 2.4s" */
    latencyMs?: number
    className?: string
}

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

function formatDuration(ms?: number): string | null {
    if (ms == null || !Number.isFinite(ms) || ms <= 0) return null
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(ms < 10000 ? 1 : 0)}s`
}

function normalizeStages(stages?: ReasoningStage[], content?: string): ReasoningStage[] {
    if (stages && stages.length > 0) {
        return stages
            .filter((s) => s && typeof s.text === 'string' && s.text.trim())
            .map((s) => ({
                id: String(s.id || 'raw'),
                label: String(s.label || s.id || 'Thought'),
                text: s.text.trim(),
            }))
    }
    if (content?.trim()) {
        return [{ id: 'raw', label: 'Thought', text: content.trim() }]
    }
    return []
}

/**
 * Map API stages onto pipeline order; keep extras at the end.
 */
function orderedStages(stages: ReasoningStage[]): ReasoningStage[] {
    const byId = new Map(stages.map((s) => [s.id.toLowerCase(), s]))
    const ordered: ReasoningStage[] = []
    for (const step of THINKING_PIPELINE) {
        const hit = byId.get(step.id)
        if (hit) {
            ordered.push({ ...hit, label: step.label })
            byId.delete(step.id)
        }
    }
    for (const s of stages) {
        if (!ordered.find((o) => o.id === s.id)) ordered.push(s)
    }
    return ordered
}

export function ReasoningAnswer({
    id,
    completed,
    content = '',
    stages: stagesProp,
    latencyMs,
    className,
}: ReasoningAnswerProps): JSX.Element | null {
    const stages = useMemo(
        () => orderedStages(normalizeStages(stagesProp, content)),
        [stagesProp, content]
    )

    // Simulated progress index while waiting for the model (0..4)
    const [liveStep, setLiveStep] = useState(0)

    useEffect(() => {
        if (completed) return
        setLiveStep(0)
        const timers: ReturnType<typeof setTimeout>[] = []
        // Reveal pipeline steps over ~3.2s while request is in flight
        THINKING_PIPELINE.forEach((_, i) => {
            timers.push(setTimeout(() => setLiveStep(i + 1), 450 + i * 700))
        })
        return () => timers.forEach(clearTimeout)
    }, [completed, id])

    // Complete with nothing → hide
    if (completed && stages.length === 0) {
        return null
    }

    const hasDetails = completed ? stages.length > 0 : true
    const [expanded, setExpanded] = useState(!completed)

    useEffect(() => {
        // Open while thinking; collapse when done (user can re-open)
        setExpanded(!completed)
    }, [completed, id])

    const duration = formatDuration(latencyMs)
    const stepCount = completed ? stages.length : Math.max(liveStep, 1)

    const title = completed
        ? duration
            ? `Thought for ${duration}`
            : stages.length > 1
              ? `Thought · ${stages.length} steps`
              : 'Thought'
        : liveStep === 0
          ? 'Thinking…'
          : liveStep >= THINKING_PIPELINE.length
            ? 'Composing reply…'
            : THINKING_PIPELINE[Math.min(liveStep, THINKING_PIPELINE.length) - 1]!.progress

    // Visible trail while in progress (pipeline placeholders) or completed (real text)
    const trail: Array<{
        key: string
        label: string
        text?: string
        status: 'done' | 'active' | 'pending'
    }> = completed
        ? stages.map((s) => ({
              key: s.id,
              label: s.label,
              text: s.text,
              status: 'done' as const,
          }))
        : THINKING_PIPELINE.map((step, i) => {
              const idx = i + 1
              let status: 'done' | 'active' | 'pending' = 'pending'
              if (idx < liveStep) status = 'done'
              else if (idx === liveStep) status = 'active'
              // After all stages, keep last as done and show composing via title
              if (liveStep > THINKING_PIPELINE.length) status = 'done'
              return {
                  key: step.id,
                  label: step.label,
                  text: status === 'active' ? '…' : status === 'done' ? undefined : undefined,
                  status,
              }
          }).filter((row) => row.status !== 'pending')

    return (
        <div
            className={clsx('flex flex-col rounded w-full min-w-0 gap-1 text-xs', className)}
            data-attr="reasoning-answer"
        >
            {/* Header — PostHog Activity style */}
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
            >
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

                <div className="flex items-center gap-1.5 min-w-0 min-h-[20px] pl-1 font-medium">
                    {!completed ? <ShimmerText>{title}</ShimmerText> : <span>{title}</span>}
                    {!completed && stepCount > 0 && (
                        <span className="text-[10px] font-normal text-muted tabular-nums">
                            {Math.min(liveStep, THINKING_PIPELINE.length)}/{THINKING_PIPELINE.length}
                        </span>
                    )}
                </div>
            </div>

            {/* Multi-stage trail */}
            {expanded && trail.length > 0 && (
                <div className="border-l-2 border-[var(--border-3000,#e2e8f0)] pl-3 ml-[10px] space-y-2 py-0.5">
                    {trail.map((row, i) => {
                        const isActive = row.status === 'active'
                        const isDone = row.status === 'done'
                        return (
                            <div
                                key={`${id}-${row.key}-${i}`}
                                className={clsx(
                                    'flex flex-col gap-0.5 animate-fade-in',
                                    isDone && 'text-muted',
                                    isActive && 'text-secondary'
                                )}
                            >
                                <div className="flex items-center gap-1.5">
                                    <span
                                        className={clsx(
                                            'inline-flex items-center justify-center w-3.5 h-3.5 rounded-full shrink-0 text-[9px] font-bold border',
                                            isDone &&
                                                'border-[var(--border-3000,#ccc)] bg-[var(--color-bg-surface-secondary,#f3f3f3)] text-muted',
                                            isActive &&
                                                'border-[var(--primary-3000,#eb9d2a)] text-[var(--primary-3000,#eb9d2a)]'
                                        )}
                                    >
                                        {isDone ? (
                                            <IconCheck className="w-2.5 h-2.5" />
                                        ) : (
                                            <span>{i + 1}</span>
                                        )}
                                    </span>
                                    <span
                                        className={clsx(
                                            'text-[10px] font-semibold uppercase tracking-wide',
                                            isActive && 'text-primary'
                                        )}
                                    >
                                        {isActive ? (
                                            <ShimmerText>{row.label}</ShimmerText>
                                        ) : (
                                            row.label
                                        )}
                                    </span>
                                </div>
                                {row.text != null && row.text !== '' && (
                                    <p
                                        className={clsx(
                                            'mb-0 pl-5 leading-relaxed whitespace-pre-wrap',
                                            isActive ? 'text-muted italic' : 'text-muted'
                                        )}
                                    >
                                        {isActive ? (
                                            <ShimmerText>{row.text === '…' ? 'working…' : row.text}</ShimmerText>
                                        ) : (
                                            row.text
                                        )}
                                    </p>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
