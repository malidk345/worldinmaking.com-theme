import React, { useEffect, useRef, useState } from 'react'
import { IconX } from '@posthog/icons'
import { LemonButton } from 'components/LemonUI/LemonButton'
import { LemonTag } from 'components/LemonUI/LemonTag'
import { HumanMessageView, AssistantMessageView, FailureMessageView, StreamingSkeleton } from './MaxMessage'
import { MaxInput } from './MaxInput'
import type {
    ThreadMessage,
    HumanMessage,
    AssistantMessage,
    FailureMessage,
    MaxAIChatProps,
    PhilosopherKey,
} from './maxTypes'
import { PHILOSOPHER_PERSONAS } from './maxTypes'

// ── Conversation Starters ───────────────────────────────────────────────────
const CONVERSATION_STARTERS = [
    'What is the Will to Power?',
    'Explain ideology in simple terms',
    'Is free will an illusion?',
    'What is the nature of consciousness?',
    'How does capitalism shape desire?',
]

// ── MaxChat — main chat component ──────────────────────────────────────────

function MaxChatContent({ onClose, initialQuestion, context, onSubmit }: MaxAIChatProps): JSX.Element {
    const [messages, setMessages] = useState<ThreadMessage[]>([])
    const [input, setInput] = useState(initialQuestion || '')
    const [loading, setLoading] = useState(false)
    const [selectedPersona, setSelectedPersona] = useState<PhilosopherKey>('nietzsche')
    const threadRef = useRef<HTMLDivElement>(null)

    const currentPersona = PHILOSOPHER_PERSONAS.find((p) => p.key === selectedPersona) ?? PHILOSOPHER_PERSONAS[0]
    const contextPath = context?.[0]?.value?.path || (typeof window !== 'undefined' ? window?.location?.pathname : '/')

    // Auto-scroll to bottom
    useEffect(() => {
        if (threadRef.current) {
            threadRef.current.scrollTop = threadRef.current.scrollHeight
        }
    }, [messages, loading])

    // Auto-submit initialQuestion
    useEffect(() => {
        if (initialQuestion?.trim()) {
            void handleSubmit(initialQuestion)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleSubmit = async (overrideText?: string) => {
        const text = (overrideText ?? input).trim()
        if (!text || loading) return

        const humanMsg: HumanMessage = {
            type: 'human',
            id: `human-${Date.now()}`,
            content: text,
            timestamp: 'Just now',
        }

        setMessages((prev) => [...prev, humanMsg])
        setInput('')
        setLoading(true)

        try {
            if (onSubmit) {
                // Parent controls the API call
                const aiMsg = await onSubmit(text, context)
                setMessages((prev) => [...prev, aiMsg])
            } else {
                // Default: mock response (UI-only mode)
                await new Promise((r) => setTimeout(r, 1200))
                const aiMsg: AssistantMessage = {
                    type: 'ai',
                    id: `ai-${Date.now()}`,
                    content: `[${currentPersona.label}] This is a UI-only preview. Connect the API via the onSubmit prop to get real responses.`,
                    timestamp: 'Just now',
                    status: 'done',
                    reasoning: [
                        { text: `Analyzing query through ${currentPersona.label}'s epistemic lens`, status: 'done' },
                        { text: 'Formulating dialectical response', status: 'done' },
                        { text: 'Synthesizing philosophical argument', status: 'done' },
                    ],
                    suggestions: ['Tell me more', 'Give an example', 'Critique this view'],
                }
                setMessages((prev) => [...prev, aiMsg])
            }
        } catch (err) {
            const failMsg: FailureMessage = {
                type: 'ai/failure',
                id: `fail-${Date.now()}`,
                content: 'Something went wrong. Please try again.',
                timestamp: 'Just now',
            }
            setMessages((prev) => [...prev, failMsg])
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="MaxChat">
            {/* ── Header ── */}
            <header className="MaxChat__header">
                <div className="MaxChat__header-identity">
                    <div className="MaxChat__header-avatar">{currentPersona.icon}</div>
                    <div>
                        <div className="MaxChat__header-name">
                            Max AI
                            <span className="MaxChat__header-online" title="Online" />
                        </div>
                        <div className="MaxChat__header-meta">
                            Powered by {currentPersona.label} · {currentPersona.description}
                        </div>
                    </div>
                </div>

                <div className="MaxChat__header-actions">
                    <div className="MaxChat__header-context">
                        <LemonTag type="primary" size="small">
                            UI Context Active
                        </LemonTag>
                        <LemonTag type="muted" size="small">
                            📄 {contextPath}
                        </LemonTag>
                    </div>
                    <LemonButton
                        type="tertiary"
                        size="xsmall"
                        icon={<IconX style={{ width: 14, height: 14 }} />}
                        onClick={onClose}
                        noPadding
                        style={{ width: 28, height: 28, borderRadius: '50%' }}
                    />
                </div>
            </header>

            {/* ── Persona Bar ── */}
            <div className="MaxChat__personas">
                <span className="MaxChat__personas-label">Persona</span>
                {PHILOSOPHER_PERSONAS.map((p) => (
                    <button
                        key={p.key}
                        type="button"
                        onClick={() => setSelectedPersona(p.key)}
                        className={`MaxChat__persona-btn${
                            selectedPersona === p.key ? ' MaxChat__persona-btn--active' : ''
                        }`}
                    >
                        <span>{p.icon}</span>
                        <span>{p.label}</span>
                    </button>
                ))}
            </div>

            {/* ── Thread ── */}
            <div className="MaxChat__thread" ref={threadRef}>
                {messages.length === 0 && !loading ? (
                    <div className="MaxChat__empty">
                        <div className="MaxChat__empty-icon">{currentPersona.icon}</div>
                        <div className="MaxChat__empty-title">Ask {currentPersona.label} anything</div>
                        <div className="MaxChat__empty-subtitle">
                            Explore philosophy, analyze ideas, or ask about your product data.
                        </div>
                        <div className="MaxChat__empty-starters">
                            {CONVERSATION_STARTERS.map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    className="MaxChat__starter-chip"
                                    onClick={() => handleSubmit(s)}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {messages.map((msg) => {
                            if (msg.type === 'human') {
                                return <HumanMessageView key={msg.id} message={msg} />
                            }
                            if (msg.type === 'ai') {
                                return (
                                    <AssistantMessageView
                                        key={msg.id}
                                        message={msg}
                                        philosopher={currentPersona.label}
                                        philosopherIcon={currentPersona.icon}
                                        onSuggestionSelect={(text) => handleSubmit(text)}
                                    />
                                )
                            }
                            if (msg.type === 'ai/failure') {
                                return <FailureMessageView key={msg.id} message={msg} />
                            }
                            return null
                        })}

                        {loading && (
                            <StreamingSkeleton
                                philosopher={currentPersona.label}
                                philosopherIcon={currentPersona.icon}
                            />
                        )}
                    </>
                )}
            </div>

            {/* ── Input ── */}
            <div className="MaxChat__input-area">
                <MaxInput
                    value={input}
                    onChange={setInput}
                    onSubmit={handleSubmit}
                    loading={loading}
                    placeholder={`Ask ${currentPersona.label} anything…`}
                />
            </div>
        </div>
    )
}

// ── MaxChat Overlay (modal wrapper) ────────────────────────────────────────
export function MaxChatOverlay(props: MaxAIChatProps): JSX.Element {
    return (
        <div className="MaxChat__overlay" onClick={(e) => e.target === e.currentTarget && props.onClose?.()}>
            <div className="MaxChat__panel">
                <MaxChatContent {...props} />
            </div>
        </div>
    )
}

// Default export for embedded use (no overlay)
export { MaxChatContent as MaxChat }
