import React, { useState } from 'react'

interface PhilosopherThoughtProps {
    thought: string
    philosopherName?: string
    isLiveThinking?: boolean
}

export default function PhilosopherThought({
    thought,
    philosopherName = 'Philosopher',
    isLiveThinking = false,
}: PhilosopherThoughtProps) {
    const [isExpanded, setIsExpanded] = useState(true)

    if (!thought && !isLiveThinking) return null

    // Parse thought string into individual reasoning steps
    const rawSteps = thought
        ? thought
              .split(/\n+|\.\s+/)
              .map((s) => s.replace(/^[-*•\d.]+\s*/, '').trim())
              .filter((s) => s.length > 5)
        : []

    const steps =
        rawSteps.length > 0
            ? rawSteps
            : [
                  `Deconstructing premises from ${philosopherName}'s epistemic stance`,
                  'Analyzing ideological contradictions & structural trade-offs',
                  'Formulating persona critique & dialectical resolution',
              ]

    return (
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
                margin: '0.75rem 0',
                background: 'var(--color-bg-secondary, rgba(240,240,240,0.5))',
            }}
        >
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    fontWeight: 600,
                    color: 'var(--color-text-secondary, #666)',
                    userSelect: 'none',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <span>🧠</span>
                    <span>
                        {philosopherName}'s AI Reasoning Steps ({steps.length})
                    </span>
                    {isLiveThinking && (
                        <span style={{ fontSize: '0.7rem', color: '#1d4ed8', fontStyle: 'italic' }}>(Thinking...)</span>
                    )}
                </div>
                <span>{isExpanded ? '▲' : '▼'}</span>
            </div>

            {isExpanded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
                    {steps.map((step, idx) => (
                        <div
                            key={idx}
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '0.375rem',
                                fontSize: '0.75rem',
                                color: 'var(--text-3000, inherit)',
                            }}
                        >
                            <span style={{ color: 'var(--color-accent, #1d4ed8)', fontWeight: 700, lineHeight: 1 }}>
                                ✓
                            </span>
                            <span>{step}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
