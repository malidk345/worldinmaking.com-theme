import React, { useState } from 'react'
import { IconChevronDown, IconChevronRight } from '@posthog/icons'

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
        <div className="my-3 rounded-lg border border-primary/20 bg-secondary/30 backdrop-blur-md overflow-hidden text-xs transition-all shadow-sm">
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 bg-primary/40 hover:bg-primary/70 text-primary font-medium text-left select-none transition-colors"
            >
                <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 relative">
                        {isLiveThinking ? (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent/80 opacity-75"></span>
                        ) : null}
                        <span
                            className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                                isLiveThinking ? 'bg-accent' : 'bg-primary/60'
                            }`}
                        ></span>
                    </span>
                    <span className="font-semibold tracking-wide text-xs">
                        🧠 {philosopherName}'s AI Reasoning Steps ({steps.length})
                    </span>
                    {isLiveThinking && (
                        <span className="text-[10px] text-accent animate-pulse font-normal italic">
                            (Thinking...)
                        </span>
                    )}
                </div>
                <div className="text-secondary hover:text-primary transition-transform">
                    {isExpanded ? <IconChevronDown className="w-4 h-4" /> : <IconChevronRight className="w-4 h-4" />}
                </div>
            </button>

            {isExpanded && (
                <div className="p-3 border-t border-primary/10 bg-primary/20 space-y-2 text-xs font-mono">
                    {steps.map((step, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-secondary leading-snug">
                            <span className="text-accent font-bold mt-0.5 select-none">✓</span>
                            <span className="flex-1">{step}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
