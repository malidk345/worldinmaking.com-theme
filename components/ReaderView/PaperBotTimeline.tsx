"use client"
import React, { useLayoutEffect, useState, useEffect } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { PaperBotContribution } from 'types/database'
import {
    IconBrain,
    IconChevronDown,
    IconCheckCircle,
    IconSparkles,
    IconSearch,
    IconBolt,
    IconMessage,
} from '@posthog/icons'

dayjs.extend(relativeTime)

/* ── PostHog THINKING_MESSAGES (birebir thinkingMessages.ts) ── */
const THINKING_MESSAGES = [
    'Booping', 'Crunching', 'Digging', 'Fetching', 'Inferring', 'Indexing',
    'Juggling', 'Noodling', 'Peeking', 'Percolating', 'Poking', 'Pondering',
    'Scanning', 'Scrambling', 'Sifting', 'Sniffing', 'Spelunking', 'Tinkering',
    'Unraveling', 'Decoding', 'Trekking', 'Sorting', 'Trimming', 'Mulling',
    'Surfacing', 'Rummaging', 'Scouting', 'Scouring', 'Threading', 'Hunting',
    'Swizzling', 'Grokking', 'Hedging', 'Scheming', 'Unfurling', 'Puzzling',
    'Dissecting', 'Stacking', 'Hashing', 'Clustering', 'Merging', 'Snooping',
    'Rewiring', 'Linking', 'Mapping', 'Tracing', 'Framing', 'Sharpening', 'Thinking',
]

function getRandomThinkingMessage(): string {
    return THINKING_MESSAGES[Math.floor(Math.random() * THINKING_MESSAGES.length)] + '...'
}

/* ── ShimmeringContent (birebir ActivityPrimitives.tsx) ── */
function ShimmeringContent({ children }: { children: React.ReactNode }) {
    const isText = typeof children === 'string'
    if (isText) {
        return (
            <span
                className="bg-clip-text text-transparent select-none"
                style={{
                    backgroundImage: 'linear-gradient(90deg,currentColor 0%,rgba(0,0,0,0.25) 35%,currentColor 65%,rgba(0,0,0,0.25) 90%,currentColor 100%)',
                    backgroundSize: '200% 100%',
                    animation: 'ph-shimmer 3s linear infinite',
                }}
            >
                {children}
            </span>
        )
    }
    return (
        <span className="inline-flex min-w-0 max-w-full" style={{ animation: 'ph-shimmer-opacity 3s linear infinite' }}>
            {children}
        </span>
    )
}

type ActivityStatus = 'pending' | 'in_progress' | 'completed' | 'failed'

/* ── ActivityHeader (birebir ActivityPrimitives.tsx) ── */
function ActivityHeader({
    title,
    status,
    icon,
    animate = true,
    hasDetails,
    isDetailsExpanded,
    onToggleDetails,
}: {
    title: React.ReactNode
    status: ActivityStatus
    icon?: React.ReactNode
    animate?: boolean
    hasDetails: boolean
    isDetailsExpanded: boolean
    onToggleDetails: () => void
}) {
    const isInProgress = status === 'in_progress'
    const isPending = status === 'pending'
    const isFailed = status === 'failed'

    const titleNode = (
        <div className="min-w-0 min-h-5 flex items-center">
            {isInProgress && animate
                ? <ShimmeringContent>{title as string}</ShimmeringContent>
                : <span className={`inline-flex ${isInProgress ? 'text-muted' : ''}`}>{title}</span>
            }
        </div>
    )

    return (
        <div
            className={[
                'group/activity-header transition-colors duration-500 flex select-none min-w-0',
                isPending ? 'text-muted' : '',
                isFailed ? 'text-danger' : '',
                !isInProgress && !isPending && !isFailed ? '' : '',
                hasDetails ? 'cursor-pointer rounded px-1 -mx-1 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]' : 'cursor-default',
                hasDetails && isDetailsExpanded ? 'bg-black/[0.04] dark:bg-white/[0.06]' : '',
            ].filter(Boolean).join(' ')}
            onClick={hasDetails ? onToggleDetails : undefined}
            role={hasDetails ? 'button' : undefined}
            tabIndex={hasDetails ? 0 : undefined}
            aria-expanded={hasDetails ? isDetailsExpanded : undefined}
            onKeyDown={hasDetails ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleDetails() }
            } : undefined}
        >
            {/* Icon slot with chevron swap on hover — birebir PostHog */}
            {icon && (
                <div className="relative flex items-center justify-center size-5 shrink-0 overflow-hidden mr-1.5">
                    <span className={[
                        'inline-flex transition-[color,transform,opacity] duration-200 ease-out',
                        isInProgress ? 'text-muted' : 'text-muted',
                        hasDetails
                            ? 'group-hover/activity-header:-translate-x-1 group-hover/activity-header:scale-90 group-hover/activity-header:opacity-0 group-focus-within/activity-header:-translate-x-1 group-focus-within/activity-header:scale-90 group-focus-within/activity-header:opacity-0'
                            : '',
                    ].filter(Boolean).join(' ')}>
                        {isInProgress && animate ? <ShimmeringContent>{icon}</ShimmeringContent> : icon}
                    </span>
                    {hasDetails && (
                        <span className="absolute inline-flex translate-x-1 scale-90 text-tertiary opacity-0 transition-[color,transform,opacity] duration-200 ease-out group-hover/activity-header:translate-x-0 group-hover/activity-header:scale-100 group-hover/activity-header:text-primary group-hover/activity-header:opacity-100 group-focus-within/activity-header:translate-x-0 group-focus-within/activity-header:scale-100 group-focus-within/activity-header:text-primary group-focus-within/activity-header:opacity-100">
                            <IconChevronDown className="size-5" />
                        </span>
                    )}
                </div>
            )}
            <div className="flex items-center gap-1 flex-1 min-w-0">
                {titleNode}
            </div>
        </div>
    )
}

/* ── ActivityDetails + ActivitySubsteps (birebir ActivityPrimitives.tsx) ── */
function ActivityDetails({ children, hasIcon }: { children: React.ReactNode; hasIcon: boolean }) {
    return (
        <div className={`space-y-1 border-l-2 border-black/10 dark:border-white/10 ${hasIcon ? 'pl-3.5 ml-[calc(0.775rem)]' : ''}`}>
            {children}
        </div>
    )
}

function activitySubstepText(content: string, isInProgress: boolean): string {
    if (content.startsWith('[') && content.endsWith(')')) return content
    if (!content.endsWith('...') && !content.endsWith('…') && !content.endsWith('.') && isInProgress) return content + '...'
    if ((content.endsWith('...') || content.endsWith('…')) && !isInProgress) return content.replace(/…/g, '').replace(/\./g, '')
    return content
}

function ActivitySubsteps({ substeps, status }: { substeps: string[]; status: ActivityStatus }) {
    const isCompleted = status === 'completed'
    const isFailed = status === 'failed'
    return (
        <>
            {substeps.map((substep, i) => {
                const isCurrentSubstep = i === substeps.length - 1
                const isCompletedSubstep = i < substeps.length - 1 || isCompleted
                return (
                    <div key={i} className="leading-relaxed text-xs">
                        <span className={[
                            isFailed ? 'text-danger' : '',
                            !isFailed && isCompletedSubstep ? 'text-muted' : '',
                            !isFailed && isCurrentSubstep && !isCompleted ? 'text-secondary' : '',
                        ].filter(Boolean).join(' ')}>
                            {activitySubstepText(substep ?? '', status === 'in_progress')}
                        </span>
                    </div>
                )
            })}
        </>
    )
}

/* ── Activity (birebir ActivityPrimitives.tsx Activity) ── */
function Activity({
    id,
    title,
    status,
    icon,
    animate = true,
    substeps = [],
}: {
    id: string
    title: React.ReactNode
    status: ActivityStatus
    icon?: React.ReactNode
    animate?: boolean
    substeps?: string[]
}) {
    const hasDetails = substeps.length > 0
    const shouldExpandDetails = hasDetails && status !== 'completed' && status !== 'failed'
    const [isDetailsExpanded, setIsDetailsExpanded] = useState(shouldExpandDetails)

    useLayoutEffect(() => {
        setIsDetailsExpanded(shouldExpandDetails)
    }, [shouldExpandDetails])

    return (
        <div className="flex flex-col rounded w-full min-w-0 gap-1 text-xs">
            <ActivityHeader
                title={title}
                status={status}
                icon={icon}
                animate={animate}
                hasDetails={hasDetails}
                isDetailsExpanded={isDetailsExpanded}
                onToggleDetails={() => setIsDetailsExpanded(v => !v)}
            />
            {isDetailsExpanded && hasDetails && (
                <ActivityDetails hasIcon={!!icon}>
                    <ActivitySubsteps substeps={substeps} status={status} />
                </ActivityDetails>
            )}
        </div>
    )
}

/* ── ThinkingIndicator (birebir ThreadView.tsx ThinkingIndicator) ── */
function ThinkingIndicator() {
    const [message, setMessage] = useState(() => getRandomThinkingMessage())

    useEffect(() => {
        const interval = setInterval(() => setMessage(getRandomThinkingMessage()), 5000)
        return () => clearInterval(interval)
    }, [])

    return (
        <Activity
            id="thinking"
            icon={<IconBrain className="size-4" />}
            title={message}
            status="in_progress"
            animate={true}
        />
    )
}

/* ── Icon map ── */
const ACTION_ICONS: Record<string, React.ReactNode> = {
    init:     <IconSparkles className="size-4" />,
    research: <IconSearch className="size-4" />,
    argument: <IconMessage className="size-4" />,
    publish:  <IconCheckCircle className="size-4" />,
    thinking: <IconBrain className="size-4" />,
}
function getIcon(type?: string): React.ReactNode {
    return ACTION_ICONS[type ?? ''] ?? <IconBolt className="size-4" />
}

/* ── Props ── */
interface PaperBotTimelineProps {
    contributions?: PaperBotContribution[]
    paperStatus?: string
}

/* ── Main component ── */
export default function PaperBotTimeline({ contributions = [], paperStatus = 'published' }: PaperBotTimelineProps) {
    const [open, setOpen] = useState(false)
    const isUnfinished = paperStatus !== 'published'

    return (
        <>
            {/* ── shimmer keyframes injected once ── */}
            <style>{`
                @keyframes ph-shimmer {
                    0%   { background-position: 200% 0 }
                    100% { background-position: -200% 0 }
                }
                @keyframes ph-shimmer-opacity {
                    0%,100% { opacity: 1 }
                    50%     { opacity: 0.4 }
                }
            `}</style>

            {/*
              ── Outer accordion header — not a PostHog element, just a minimal
                 expand/collapse for the whole section. Styled as a plain muted line.
            */}
            <button
                onClick={() => setOpen(v => !v)}
                className="flex items-center gap-1.5 text-muted hover:text-primary transition-colors text-xs mb-1.5 cursor-pointer select-none"
            >
                <IconBrain className="size-3.5" />
                <span className="font-medium">Bot research process</span>
                <span className="opacity-40">·</span>
                <span className="opacity-50 font-mono">{contributions.length} steps</span>
                <IconChevronDown className={`size-3.5 ml-0.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>

            {/* ── Thread-style activity list — no border, no background, just gap-1.5 flex col ── */}
            {open && (
                <div className="flex flex-col gap-1.5 mb-4">
                    {contributions.length === 0 ? (
                        <ThinkingIndicator />
                    ) : (
                        <>
                            {contributions.map((item, index) => (
                                <Activity
                                    key={item.id || index}
                                    id={String(item.id || index)}
                                    icon={getIcon(item.action_type)}
                                    title={
                                        <span className="text-muted">
                                            {item.title || item.action_type || 'Step'}
                                            <span className="font-mono opacity-50 ml-2">
                                                @{item.bot_username} · {dayjs(item.created_at).fromNow()}
                                            </span>
                                        </span>
                                    }
                                    status="completed"
                                    animate={false}
                                    substeps={item.content ? [item.content] : []}
                                />
                            ))}
                            {isUnfinished && <ThinkingIndicator />}
                        </>
                    )}
                </div>
            )}
        </>
    )
}
