import React, { useState } from 'react'
import clsx from 'clsx'
import { IconChevronDown, IconChevronRight } from '@posthog/icons'
import type { HumanMessage, AssistantMessage, FailureMessage, ThreadMessage, ReasoningStep } from './maxTypes'

// ── Reasoning Steps (mirrors PostHog "thinking" collapsible) ────────────────

interface ReasoningDisplayProps {
    steps: ReasoningStep[]
    defaultOpen?: boolean
}

function ReasoningDisplay({ steps, defaultOpen = true }: ReasoningDisplayProps): JSX.Element {
    const [open, setOpen] = useState(defaultOpen)
    const doneCount = steps.filter((s) => s.status === 'done' || !s.status).length

    return (
        <div className="MaxMessage__reasoning">
            <button className="MaxMessage__reasoning-toggle" onClick={() => setOpen((v) => !v)} type="button">
                <span className="MaxMessage__reasoning-icon">🧠</span>
                <span className="MaxMessage__reasoning-label">
                    Thought for {doneCount} step{doneCount !== 1 ? 's' : ''}
                </span>
                {open ? (
                    <IconChevronDown style={{ width: 14, height: 14, marginLeft: 'auto' }} />
                ) : (
                    <IconChevronRight style={{ width: 14, height: 14, marginLeft: 'auto' }} />
                )}
            </button>
            {open && (
                <div className="MaxMessage__reasoning-steps">
                    {steps.map((step, i) => (
                        <div key={i} className={clsx('MaxMessage__reasoning-step', step.status === 'error' && 'MaxMessage__reasoning-step--error')}>
                            <span className="MaxMessage__reasoning-step-icon">
                                {step.status === 'error' ? '✗' : step.status === 'pending' ? '◌' : '✓'}
                            </span>
                            <span>{step.text}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ── Suggestion Chips ────────────────────────────────────────────────────────

interface SuggestionChipsProps {
    suggestions: string[]
    onSelect: (text: string) => void
}

function SuggestionChips({ suggestions, onSelect }: SuggestionChipsProps): JSX.Element {
    return (
        <div className="MaxMessage__suggestions">
            {suggestions.map((s) => (
                <button key={s} className="MaxMessage__suggestion-chip" onClick={() => onSelect(s)} type="button">
                    {s}
                </button>
            ))}
        </div>
    )
}

// ── Human Message ───────────────────────────────────────────────────────────

interface HumanMessageViewProps {
    message: HumanMessage
}

export function HumanMessageView({ message }: HumanMessageViewProps): JSX.Element {
    return (
        <div className="MaxMessage MaxMessage--human">
            <div className="MaxMessage__avatar MaxMessage__avatar--human">You</div>
            <div className="MaxMessage__body">
                <div className="MaxMessage__bubble MaxMessage__bubble--human">{message.content}</div>
                <span className="MaxMessage__timestamp">{message.timestamp}</span>
            </div>
        </div>
    )
}

// ── AI / Assistant Message ──────────────────────────────────────────────────

interface AssistantMessageViewProps {
    message: AssistantMessage
    philosopher?: string
    philosopherIcon?: string
    onSuggestionSelect?: (text: string) => void
}

export function AssistantMessageView({
    message,
    philosopher = 'Max',
    philosopherIcon = '🦔',
    onSuggestionSelect,
}: AssistantMessageViewProps): JSX.Element {
    return (
        <div className="MaxMessage MaxMessage--ai">
            <div className="MaxMessage__avatar MaxMessage__avatar--ai" title={`${philosopherIcon} ${philosopher}`}>
                {philosopherIcon}
            </div>
            <div className="MaxMessage__body">
                <div className="MaxMessage__author">
                    <span className="MaxMessage__author-name">{philosopher}</span>
                    <span className="MaxMessage__author-badge">AI</span>
                    <span className="MaxMessage__timestamp">{message.timestamp}</span>
                </div>

                {message.reasoning && message.reasoning.length > 0 && (
                    <ReasoningDisplay steps={message.reasoning} />
                )}

                <div className="MaxMessage__bubble MaxMessage__bubble--ai">
                    {message.status === 'streaming' ? (
                        <>
                            {message.content}
                            <span className="MaxMessage__cursor" />
                        </>
                    ) : (
                        message.content
                    )}
                </div>

                {message.suggestions && message.suggestions.length > 0 && onSuggestionSelect && (
                    <SuggestionChips suggestions={message.suggestions} onSelect={onSuggestionSelect} />
                )}

                <span className="MaxMessage__timestamp">{message.timestamp}</span>
            </div>
        </div>
    )
}

// ── Failure Message ─────────────────────────────────────────────────────────

interface FailureMessageViewProps {
    message: FailureMessage
}

export function FailureMessageView({ message }: FailureMessageViewProps): JSX.Element {
    return (
        <div className="MaxMessage MaxMessage--failure">
            <div className="MaxMessage__avatar MaxMessage__avatar--ai">⚠️</div>
            <div className="MaxMessage__body">
                <div className="MaxMessage__bubble MaxMessage__bubble--failure">
                    {message.content || 'Something went wrong. Please try again.'}
                </div>
            </div>
        </div>
    )
}

// ── Streaming Skeleton ──────────────────────────────────────────────────────

interface StreamingSkeletonProps {
    philosopher?: string
    philosopherIcon?: string
}

export function StreamingSkeleton({ philosopher = 'Max', philosopherIcon = '🦔' }: StreamingSkeletonProps): JSX.Element {
    return (
        <div className="MaxMessage MaxMessage--ai MaxMessage--streaming">
            <div className="MaxMessage__avatar MaxMessage__avatar--ai">{philosopherIcon}</div>
            <div className="MaxMessage__body">
                <div className="MaxMessage__author">
                    <span className="MaxMessage__author-name">{philosopher}</span>
                    <span className="MaxMessage__author-badge">AI</span>
                </div>
                <div className="MaxMessage__reasoning">
                    <div className="MaxMessage__reasoning-toggle" style={{ cursor: 'default' }}>
                        <span className="MaxMessage__reasoning-icon">🧠</span>
                        <span className="MaxMessage__reasoning-label MaxMessage__reasoning-label--pulse">Thinking…</span>
                    </div>
                </div>
                <div className="MaxMessage__bubble MaxMessage__bubble--ai MaxMessage__bubble--skeleton">
                    <span className="MaxMessage__skeleton-line" style={{ width: '80%' }} />
                    <span className="MaxMessage__skeleton-line" style={{ width: '60%' }} />
                    <span className="MaxMessage__skeleton-line" style={{ width: '70%' }} />
                </div>
            </div>
        </div>
    )
}
