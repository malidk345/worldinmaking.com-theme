/**
 * Multi-stage thinking UI — PostHog AI Activity trail with distinct icons per step.
 *
 * Header: IconBrain ("Thought") — same as PostHog ReasoningAnswer
 * Steps (like tool cards): each stage has its own icon, not a number badge only
 *
 * Pipeline: Perceive → Frame → Tension → Move
 */
import React, { useEffect, useMemo, useState, type ComponentType } from 'react'
import { clsx } from 'clsx'
import {
    IconBrain,
    IconChevronDown,
    IconCheck,
    IconEye,
    IconBook,
    IconWarning,
    IconMagicWand,
    IconSearch,
    IconSparkles,
} from '@posthog/icons'

type IconComp = ComponentType<{ className?: string }>

/** Canonical order + PostHog-style icons for each stage */
export const THINKING_PIPELINE: Array<{
    id: string
    label: string
    progress: string
    Icon: IconComp
}> = [
    {
        id: 'perceive',
        label: 'Perceive',
        progress: 'Perceiving…',
        // Read / look carefully — like PostHog "Read" / search glance
        Icon: IconEye as IconComp,
    },
    {
        id: 'frame',
        label: 'Frame',
        progress: 'Framing…',
        // Stance / lens — book / knowledge frame
        Icon: (IconBook as IconComp) || (IconSearch as IconComp),
    },
    {
        id: 'tension',
        label: 'Tension',
        progress: 'Finding tension…',
        // Conflict / warning — PostHog failure/attention icon language
        Icon: IconWarning as IconComp,
    },
    {
        id: 'move',
        label: 'Move',
        progress: 'Choosing a move…',
        // Action / craft — PostHog MagicWand tool vibe
        Icon: (IconMagicWand as IconComp) || (IconSparkles as IconComp),
    },
]

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

function iconForStageId(stageId: string): IconComp {
    const hit = THINKING_PIPELINE.find((p) => p.id === stageId.toLowerCase())
    if (hit?.Icon) return hit.Icon
    // Fallbacks for raw / unknown steps — PostHog generic tool = wrench-ish → sparkles/brain
    if (stageId === 'raw') return IconBrain as IconComp
    return IconSparkles as IconComp
}

function SafeIcon({
    Icon,
    className,
    shimmer,
}: {
    Icon: IconComp | undefined
    className?: string
    shimmer?: boolean
}): JSX.Element {
    const Comp = Icon && typeof Icon === 'function' ? Icon : (IconBrain as IconComp)
    const node = <Comp className={className || 'w-3.5 h-3.5'} />
    return shimmer ? <ShimmerIcon>{node}</ShimmerIcon> : node
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

    const [liveStep, setLiveStep] = useState(0)

    useEffect(() => {
        if (completed) return
        setLiveStep(0)
        const timers: ReturnType<typeof setTimeout>[] = []
        THINKING_PIPELINE.forEach((_, i) => {
            timers.push(setTimeout(() => setLiveStep(i + 1), 450 + i * 700))
        })
        return () => timers.forEach(clearTimeout)
    }, [completed, id])

    if (completed && stages.length === 0) {
        return null
    }

    const hasDetails = completed ? stages.length > 0 : true
    const [expanded, setExpanded] = useState(!completed)

    useEffect(() => {
        setExpanded(!completed)
    }, [completed, id])

    const duration = formatDuration(latencyMs)

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

    // Active header icon: brain when done / idle; active stage icon while running
    const HeaderIcon: IconComp =
        !completed && liveStep > 0 && liveStep <= THINKING_PIPELINE.length
            ? THINKING_PIPELINE[liveStep - 1]!.Icon
            : (IconBrain as IconComp)

    type TrailRow = {
        key: string
        label: string
        text?: string
        status: 'done' | 'active' | 'pending'
        Icon: IconComp
    }

    const trail: TrailRow[] = completed
        ? stages.map((s) => ({
              key: s.id,
              label: s.label,
              text: s.text,
              status: 'done' as const,
              Icon: iconForStageId(s.id),
          }))
        : THINKING_PIPELINE.map((step, i) => {
              const idx = i + 1
              let status: 'done' | 'active' | 'pending' = 'pending'
              if (liveStep > THINKING_PIPELINE.length) status = 'done'
              else if (idx < liveStep) status = 'done'
              else if (idx === liveStep) status = 'active'
              return {
                  key: step.id,
                  label: step.label,
                  text: status === 'active' ? '…' : undefined,
                  status,
                  Icon: step.Icon,
              }
          }).filter((row) => row.status !== 'pending')

    return (
        <div
            className={clsx('flex flex-col rounded w-full min-w-0 gap-1.5 text-xs', className)}
            data-attr="reasoning-answer"
        >
            {/* Header — PostHog ReasoningAnswer: brain + Thought */}
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
                        <SafeIcon Icon={HeaderIcon} className="w-4 h-4" shimmer={!completed} />
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
                    {!completed && liveStep > 0 && (
                        <span className="text-[10px] font-normal text-muted tabular-nums">
                            {Math.min(liveStep, THINKING_PIPELINE.length)}/{THINKING_PIPELINE.length}
                        </span>
                    )}
                </div>
            </div>

            {/* Multi-stage trail — each row is its own mini Activity with distinct icon */}
            {expanded && trail.length > 0 && (
                <div className="flex flex-col gap-1.5 pl-0.5">
                    {trail.map((row, i) => {
                        const isActive = row.status === 'active'
                        const isDone = row.status === 'done'
                        return (
                            <div
                                key={`${id}-${row.key}-${i}`}
                                className={clsx(
                                    'flex flex-col gap-0.5 min-w-0 animate-fade-in',
                                    isDone && 'text-muted',
                                    isActive && 'text-secondary'
                                )}
                            >
                                {/* Row header like PostHog ToolActivity */}
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <span
                                        className={clsx(
                                            'relative inline-flex items-center justify-center w-5 h-5 shrink-0 rounded',
                                            isActive && 'text-[var(--primary-3000,#1d4ed8)]',
                                            isDone && 'text-muted'
                                        )}
                                    >
                                        <SafeIcon
                                            Icon={row.Icon}
                                            className="w-3.5 h-3.5"
                                            shimmer={isActive}
                                        />
                                        {isDone && completed && (
                                            <span className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center w-2.5 h-2.5 rounded-full bg-[var(--color-bg-surface-primary,#fff)]">
                                                <IconCheck className="w-2 h-2 text-muted" />
                                            </span>
                                        )}
                                    </span>
                                    <span
                                        className={clsx(
                                            'text-[11px] font-semibold min-w-0 truncate',
                                            isActive && 'text-primary'
                                        )}
                                    >
                                        {isActive ? <ShimmerText>{row.label}</ShimmerText> : row.label}
                                    </span>
                                </div>

                                {/* Substep body with left rail under the icon (PostHog ActivityDetails) */}
                                {row.text != null && row.text !== '' && (
                                    <div className="ml-[9px] border-l-2 border-[var(--border-3000,#e2e8f0)] pl-3">
                                        <p
                                            className={clsx(
                                                'mb-0 leading-relaxed whitespace-pre-wrap text-[11px]',
                                                isActive ? 'text-muted italic' : 'text-muted'
                                            )}
                                        >
                                            {isActive && row.text === '…' ? (
                                                <ShimmerText>working…</ShimmerText>
                                            ) : (
                                                row.text
                                            )}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
