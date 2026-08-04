import React, { useState } from 'react'
import { LemonButton, LemonInput, LemonTag, LemonBadge, LemonDivider, ProfilePicture } from '../components/lemon-ui'
import { IconSearch, IconInfo, IconGear, IconPlus, IconChevronRight, IconChevronDown } from '../components/icons'

export interface AIMessage {
    id: string
    sender: 'user' | 'ai'
    authorName: string
    timestamp: string
    content: string
    reasoningSteps?: string[]
    vizQuery?: {
        event: string
        breakdown: string
        dateRange: string
        data: { label: string; count: number; percentage: string }[]
    }
    suggestions?: string[]
}

export interface PostHogAIAppProps {
    onBack?: () => void
    initialContextPath?: string
}

export function PostHogAIApp({ onBack, initialContextPath = '/community' }: PostHogAIAppProps = {}): JSX.Element {
    const [inputPrompt, setInputPrompt] = useState('')
    const [reasoningExpanded, setReasoningExpanded] = useState(true)
    const [selectedPhilosopher, setSelectedPhilosopher] = useState('Nietzsche')
    const [loading, setLoading] = useState(false)

    const PHILOSOPHERS = [
        { name: 'Nietzsche', icon: '⚡' },
        { name: 'Zizek', icon: '🍿' },
        { name: 'Spinoza', icon: '💎' },
        { name: 'Marx', icon: '🛠️' },
        { name: 'Heidegger', icon: '📜' },
    ]

    // 1:1 Monorepo Mock Replica matching PostHog's exact Storybook story: scenes-app-posthog-ai--chat-with-ui-context
    const [messages, setMessages] = useState<AIMessage[]>([
        {
            id: 'human-1',
            sender: 'user',
            authorName: 'You (User)',
            timestamp: 'Just now',
            content: 'What is the relationship between technology and human agency?',
        },
        {
            id: 'ai-thread-1',
            sender: 'ai',
            authorName: `${selectedPhilosopher} (PostHog AI)`,
            timestamp: 'Just now',
            reasoningSteps: [
                `Deconstructing query through ${selectedPhilosopher}'s epistemic stance`,
                'Analyzing structural assumptions & technological enframing',
                'Formulating persona critique & dialectical resolution',
            ],
            content:
                'Technology is not a neutral tool; it is the physical manifestation of the Will to Power, reconfiguring human desire and agency.',
            suggestions: [
                'Deconstruct primary premises',
                'Formulate counter-argument',
                'Synthesize dialectical resolution',
            ],
        },
    ])

    const handleSendPrompt = async (promptText?: string) => {
        const text = (promptText || inputPrompt).trim()
        if (!text || loading) return

        const userMsg: AIMessage = {
            id: `human-${Date.now()}`,
            sender: 'user',
            authorName: 'You (User)',
            timestamp: 'Just now',
            content: text,
        }

        setMessages((prev) => [...prev, userMsg])
        if (!promptText) setInputPrompt('')
        setLoading(true)

        try {
            const res = await fetch('/api/philosopher-bot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: text,
                    philosopher: selectedPhilosopher,
                    taskType: 'community_reply',
                }),
            })
            const data = await res.json()

            const rawThought = data.thought || ''
            const parsedSteps = rawThought
                ? rawThought
                      .split(/\n+|\.\s+/)
                      .map((s: string) => s.replace(/^[-*•\d.]+\s*/, '').trim())
                      .filter((s: string) => s.length > 5)
                : [
                      `Deconstructing premises from ${selectedPhilosopher}'s stance`,
                      'Analyzing ideological contradictions & structural trade-offs',
                  ]

            const aiMsg: AIMessage = {
                id: `ai-${Date.now()}`,
                sender: 'ai',
                authorName: `${data.philosopher || selectedPhilosopher} (PostHog AI)`,
                timestamp: 'Just now',
                reasoningSteps: parsedSteps,
                content: data.reply || 'Knowledge requires active questioning of underlying premises.',
                suggestions: [
                    'Deconstruct primary premises',
                    'Formulate counter-argument',
                    'Synthesize dialectical resolution',
                ],
            }

            setMessages((prev) => [...prev, aiMsg])
        } catch (err) {
            console.error('PostHog AI query error:', err)
        } finally {
            setLoading(false)
        }
    }

    const currentIcon = PHILOSOPHERS.find((p) => p.name === selectedPhilosopher)?.icon || '⚡'

    return (
        <div
            style={{
                minHeight: '100%',
                backgroundColor: 'var(--color-bg-3000)',
                fontFamily: 'var(--font-sans)',
                color: 'var(--text-3000)',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* Main Container */}
            <main
                style={{
                    flex: 1,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'stretch',
                    width: '100%',
                    maxWidth: '920px',
                    margin: '0 auto',
                    padding: '1.25rem 1rem',
                    zIndex: 1,
                }}
            >
                <div
                    className="posthog-glass-panel"
                    style={{
                        width: '100%',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid rgba(0, 0, 0, 0.08)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.06)',
                        backgroundColor: 'var(--color-bg-3000, #ffffff)',
                    }}
                >
                    {/* Storybook 1:1 Header: scenes-app-posthog-ai--chat-with-ui-context */}
                    <header
                        className="posthog-glass"
                        style={{
                            padding: '0.875rem 1.25rem',
                            borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {onBack && (
                                <LemonButton size="small" type="tertiary" onClick={onBack}>
                                    ← Back
                                </LemonButton>
                            )}
                            <div
                                style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    backgroundColor: 'var(--color-posthog-3000-50, #f5f5f4)',
                                    border: '1px solid var(--border-3000)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1.25rem',
                                }}
                            >
                                🦔
                            </div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                    <span
                                        style={{ fontWeight: 800, fontSize: '1rem', fontFamily: 'var(--font-title)' }}
                                    >
                                        Max ({selectedPhilosopher} AI)
                                    </span>
                                    <LemonBadge status="success" />
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                                    Storybook: <code>scenes-app-posthog-ai--chat-with-ui-context</code>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <LemonTag type="highlight">UI Context Active</LemonTag>
                            <span
                                style={{
                                    fontSize: '0.75rem',
                                    fontFamily: 'monospace',
                                    padding: '0.2rem 0.5rem',
                                    backgroundColor: 'rgba(0,0,0,0.05)',
                                    borderRadius: '4px',
                                }}
                            >
                                📄 {initialContextPath}
                            </span>
                        </div>
                    </header>

                    {/* Philosopher Persona Selector Bar */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.375rem',
                            padding: '0.5rem 1.25rem',
                            borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                            backgroundColor: 'rgba(0, 0, 0, 0.02)',
                            overflowX: 'auto',
                        }}
                    >
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                            Persona:
                        </span>
                        {PHILOSOPHERS.map((p) => (
                            <button
                                key={p.name}
                                onClick={() => setSelectedPhilosopher(p.name)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    padding: '0.25rem 0.625rem',
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    fontWeight: selectedPhilosopher === p.name ? 700 : 500,
                                    backgroundColor:
                                        selectedPhilosopher === p.name
                                            ? 'var(--color-accent, #1d4ed8)'
                                            : 'rgba(0,0,0,0.05)',
                                    color: selectedPhilosopher === p.name ? '#ffffff' : 'inherit',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                <span>{p.icon}</span>
                                <span>{p.name}</span>
                            </button>
                        ))}
                    </div>

                    {/* Messages Stream */}
                    <div
                        style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '1.25rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1.25rem',
                            minHeight: '380px',
                            maxHeight: '480px',
                        }}
                    >
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.5rem',
                                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                                    maxWidth: '88%',
                                }}
                            >
                                {/* Header */}
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                                    }}
                                >
                                    {msg.sender === 'ai' && <span style={{ fontSize: '1rem' }}>🦔</span>}
                                    <span style={{ fontWeight: 700, fontSize: '0.8125rem' }}>{msg.authorName}</span>
                                    <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>
                                        {msg.timestamp}
                                    </span>
                                    {msg.sender === 'user' && (
                                        <ProfilePicture name="User" email="user@posthog.com" size="xs" />
                                    )}
                                </div>

                                {/* 1:1 Storybook AI Reasoning Step Box */}
                                {msg.reasoningSteps && msg.reasoningSteps.length > 0 && (
                                    <div
                                        className="posthog-glass"
                                        style={{
                                            borderRadius: 'var(--radius, 8px)',
                                            padding: '0.625rem 0.875rem',
                                            fontSize: '0.75rem',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.375rem',
                                            border: '1px solid rgba(0,0,0,0.06)',
                                        }}
                                    >
                                        <div
                                            onClick={() => setReasoningExpanded(!reasoningExpanded)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                cursor: 'pointer',
                                                fontWeight: 600,
                                                color: 'var(--color-text-secondary)',
                                                userSelect: 'none',
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                                <span>🧠</span>
                                                <span>AI Reasoning Steps ({msg.reasoningSteps.length})</span>
                                            </div>
                                            <span>{reasoningExpanded ? '▲' : '▼'}</span>
                                        </div>

                                        {reasoningExpanded && (
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '0.25rem',
                                                    marginTop: '0.25rem',
                                                }}
                                            >
                                                {msg.reasoningSteps.map((step, idx) => (
                                                    <div
                                                        key={idx}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'flex-start',
                                                            gap: '0.375rem',
                                                            fontSize: '0.75rem',
                                                            color: 'var(--text-3000)',
                                                        }}
                                                    >
                                                        <span
                                                            style={{
                                                                color: 'var(--color-accent, #1d4ed8)',
                                                                fontWeight: 700,
                                                                lineHeight: 1,
                                                            }}
                                                        >
                                                            ✓
                                                        </span>
                                                        <span>{step}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Text Content */}
                                <div
                                    className="posthog-glass"
                                    style={{
                                        padding: '0.875rem 1.125rem',
                                        borderRadius: 'var(--radius-lg)',
                                        fontSize: '0.875rem',
                                        lineHeight: 1.5,
                                        color: 'var(--text-3000)',
                                        border:
                                            msg.sender === 'user'
                                                ? '1px solid var(--color-accent, #1d4ed8)'
                                                : '1px solid rgba(0,0,0,0.08)',
                                        backgroundColor:
                                            msg.sender === 'user'
                                                ? 'rgba(29, 78, 216, 0.04)'
                                                : 'rgba(255, 255, 255, 0.78)',
                                        whiteSpace: 'pre-wrap',
                                    }}
                                >
                                    {msg.content}
                                </div>

                                {/* Suggestions */}
                                {msg.suggestions && msg.suggestions.length > 0 && (
                                    <div
                                        style={{
                                            display: 'flex',
                                            gap: '0.375rem',
                                            flexWrap: 'wrap',
                                            marginTop: '0.25rem',
                                        }}
                                    >
                                        {msg.suggestions.map((sug) => (
                                            <LemonButton
                                                key={sug}
                                                size="xsmall"
                                                type="tertiary"
                                                onClick={() => handleSendPrompt(sug)}
                                                style={{
                                                    border: '1px solid rgba(0,0,0,0.08)',
                                                    backgroundColor: 'rgba(255,255,255,0.7)',
                                                }}
                                            >
                                                ✨ {sug}
                                            </LemonButton>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}

                        {loading && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '88%' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>🦔</span>
                                    <span style={{ fontWeight: 700, fontSize: '0.8125rem' }}>
                                        {selectedPhilosopher} (PostHog AI)
                                    </span>
                                </div>
                                <div
                                    className="posthog-glass"
                                    style={{
                                        borderRadius: 'var(--radius, 8px)',
                                        padding: '0.625rem 0.875rem',
                                        fontSize: '0.75rem',
                                        color: 'var(--color-accent, #1d4ed8)',
                                        fontStyle: 'italic',
                                    }}
                                >
                                    🧠 Processing query via Vercel AI SDK...
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Storybook 1:1 Fixed AI Input Bar at Bottom */}
                    <div
                        className="posthog-glass"
                        style={{
                            padding: '1rem 1.25rem',
                            borderTop: '1px solid rgba(0, 0, 0, 0.08)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.625rem',
                        }}
                    >
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                                <LemonInput
                                    placeholder={`Ask ${selectedPhilosopher} AI about ${initialContextPath}...`}
                                    value={inputPrompt}
                                    onChange={setInputPrompt}
                                    onPressEnter={() => handleSendPrompt()}
                                />
                            </div>
                            <LemonButton
                                type="primary"
                                disabled={!inputPrompt.trim() || loading}
                                onClick={() => handleSendPrompt()}
                            >
                                Send
                            </LemonButton>
                        </div>

                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                fontSize: '0.75rem',
                                color: 'var(--color-text-secondary)',
                            }}
                        >
                            <span>
                                Model: <strong>Claude 3.5 Sonnet / Vercel AI SDK</strong>
                            </span>
                            <span>Press Enter to send</span>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
