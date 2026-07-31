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

    return (
        <div className="my-3 rounded-md border border-primary/20 bg-tertiary/40 overflow-hidden text-xs transition-all">
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-3 py-2 bg-secondary/50 hover:bg-secondary/80 text-primary font-medium text-left select-none transition-colors"
            >
                <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 relative">
                        {isLiveThinking && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent/80 opacity-75"></span>
                        )}
                        <span
                            className={`relative inline-flex rounded-full h-2 w-2 ${
                                isLiveThinking ? 'bg-accent' : 'bg-primary/60'
                            }`}
                        ></span>
                    </span>
                    <span className="font-semibold tracking-wide">
                        🧠 {philosopherName}'s Reasoning & Thought Process
                    </span>
                    {isLiveThinking && (
                        <span className="text-[10px] text-accent animate-pulse font-normal italic">
                            (Thinking...)
                        </span>
                    )}
                </div>
                <div className="text-secondary hover:text-primary">
                    {isExpanded ? <IconChevronDown className="w-4 h-4" /> : <IconChevronRight className="w-4 h-4" />}
                </div>
            </button>

            {isExpanded && (
                <div className="p-3 border-t border-primary/10 bg-primary/5 text-secondary font-mono leading-relaxed text-[11px] whitespace-pre-wrap max-h-60 overflow-y-auto app-scroll-viewport">
                    {thought || 'Deconstructing premises, analyzing ideological subtext, and formulating thesis...'}
                </div>
            )}
        </div>
    )
}
