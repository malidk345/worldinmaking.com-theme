"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Send, Terminal, Clock } from 'lucide-react'
import ScrollArea from 'components/RadixUI/ScrollArea'
import OSButton from 'components/OSButton'

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
        <div className="flex flex-col h-full bg-[#0a0a0a] text-[#00ff00] font-mono text-sm">
            {/* Header */}
            <div className="p-3 border-b border-[#00ff00]/30 flex items-center justify-between bg-[#000000]">
                <div className="flex items-center gap-2">
                    <Terminal className="size-4" />
                    <span className="font-bold tracking-widest uppercase text-xs">Signal_Stream // 24h</span>
                </div>
                <div className="flex items-center gap-1 text-[#00ff00]/50 text-xs">
                    <Clock className="size-3" />
                    <span>Auto-purge active</span>
                </div>
            </div>

            {/* Transmissions Area */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="flex flex-col-reverse gap-6 min-h-full justify-end">
                    {transmissions.length === 0 ? (
                        <div className="text-center opacity-50 py-10">
                            No active signals. The ether is quiet.
                        </div>
                    ) : (
                        transmissions.map(t => (
                            <div key={t.id} className="relative pl-4 border-l-2 border-[#00ff00]/30 animate-in fade-in slide-in-from-bottom-2">
                                <div className="absolute -left-[5px] top-0 w-2 h-2 bg-[#00ff00] rounded-full" />
                                <div className="flex justify-between items-start mb-1 opacity-60 text-xs">
                                    <span>User_Local</span>
                                    <span>{formatTimeLeft(t.expiresAt)}</span>
                                </div>
                                <p className="text-[#00ff00]/90 leading-relaxed break-words">
                                    {t.text}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 border-t border-[#00ff00]/30 bg-[#000000]">
                <div className="flex gap-2">
                    <span className="text-[#00ff00] font-bold mt-2">{'>'}</span>
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Broadcast a thought to the network... (disappears in 24h)"
                        className="flex-1 bg-transparent border-none outline-none resize-none text-[#00ff00] placeholder:text-[#00ff00]/30 min-h-[44px] py-2"
                        rows={1}
                    />
                    <OSButton
                        variant="primary"
                        onClick={handleSend}
                        className="bg-[#00ff00]/10 text-[#00ff00] border-[#00ff00]/30 hover:bg-[#00ff00]/20 h-fit self-end"
                    >
                        <Send className="size-4" />
                    </OSButton>
                </div>
            </div>
        </div>
    )
}
