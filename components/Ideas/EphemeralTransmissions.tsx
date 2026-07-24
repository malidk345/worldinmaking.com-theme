"use client"

import React, { useState, useEffect, useRef } from 'react'
import { IconClock, IconSend, IconTerminal } from '@posthog/icons';
import ScrollArea from 'components/RadixUI/ScrollArea'
import { LemonButton } from '@/components/LemonUI'

interface Transmission {
    id: string
    text: string
    timestamp: number
    expiresAt: number
}

const INITIAL_TRANSMISSIONS: Transmission[] = [
    {
        id: 't1',
        text: 'Thinking about how API design is basically modern philosophy. You are defining the ontology of a system.',
        timestamp: Date.now() - 3600000 * 2, // 2 hours ago
        expiresAt: Date.now() + 3600000 * 22 // Expires in 22 hours
    },
    {
        id: 't2',
        text: 'Just finished reading the new paper on Agentic AI. We need to rethink the "SuperWorker" model.',
        timestamp: Date.now() - 3600000 * 5,
        expiresAt: Date.now() + 3600000 * 19
    }
]

export default function EphemeralTransmissions() {
    const [transmissions, setTransmissions] = useState<Transmission[]>(INITIAL_TRANSMISSIONS)
    const [input, setInput] = useState('')
    const scrollRef = useRef<HTMLDivElement>(null)

    // Simulate real-time expiration check
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now()
            setTransmissions(prev => prev.filter(t => t.expiresAt > now))
        }, 60000) // check every minute
        return () => clearInterval(interval)
    }, [])

    const handleSend = () => {
        if (!input.trim()) return

        const newT: Transmission = {
            id: `t_${Date.now()}`,
            text: input.trim(),
            timestamp: Date.now(),
            expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
        }

        setTransmissions(prev => [newT, ...prev])
        setInput('')
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const formatTimeLeft = (expiresAt: number) => {
        const diff = expiresAt - Date.now()
        if (diff <= 0) return 'Expired'

        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

        if (hours > 0) return `${hours}h left`
        return `${minutes}m left`
    }

    return (
        <div className="h-full overflow-y-auto custom-scrollbar bg-white dark:bg-[#121214] text-primary flex flex-col">
            {/* Header */}
            <div className="max-w-7xl mx-auto w-full px-4 md:px-6 pt-6 pb-2 border-b border-black/5 dark:border-white/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary/50">
                        SIGNAL STREAM // 24H AUTO-PURGE
                    </span>
                </div>
            </div>

            {/* Transmissions Stream */}
            <div className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-6 py-6 overflow-y-auto custom-scrollbar">
                <div className="space-y-4">
                    {transmissions.length === 0 ? (
                        <div className="text-center text-xs text-secondary/60 py-12">
                            No active signals. The ether is quiet.
                        </div>
                    ) : (
                        transmissions.map(t => (
                            <div
                                key={t.id}
                                className="bg-white/60 dark:bg-[#121214]/60 backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-[24px] shadow-sm p-5 transition-all"
                            >
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-primary">@Local_User</span>
                                    <span className="text-[10px] font-mono text-secondary px-2 py-0.5 bg-black/5 dark:bg-white/5 rounded-full">
                                        {formatTimeLeft(t.expiresAt)}
                                    </span>
                                </div>
                                <p className="text-xs md:text-sm text-primary leading-relaxed break-words">
                                    {t.text}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Input Composer Area */}
            <div className="p-4 border-t border-black/5 dark:border-white/5 bg-white/60 dark:bg-[#121214]/60 backdrop-blur-xl shrink-0">
                <div className="max-w-7xl mx-auto flex gap-3 items-center">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Broadcast a thought to the network... (disappears in 24h)"
                        className="flex-1 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-[16px] px-4 py-2.5 outline-none resize-none text-xs text-primary placeholder:text-secondary/50"
                        rows={1}
                    />
                    <LemonButton
                        type="primary"
                        onClick={handleSend}
                        className="h-10 px-4 rounded-[16px] flex items-center gap-1.5"
                    >
                        <IconSend className="size-4" />
                        <span>Send</span>
                    </LemonButton>
                </div>
            </div>
        </div>
    )
}
