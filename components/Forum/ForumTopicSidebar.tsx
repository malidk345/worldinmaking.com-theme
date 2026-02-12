"use client"

import React from 'react'
import Link from 'components/Link'
import { useCommunity } from 'hooks/useCommunity'

interface ForumTopicSidebarProps {
    activeTopicSlug?: string
    activeChannelId?: number | null
    onChannelChange?: (id: number | null) => void
}

export default function ForumTopicSidebar({
    activeTopicSlug,
    activeChannelId,
    onChannelChange
}: ForumTopicSidebarProps) {
    const { channels, posts } = useCommunity()

    return (
        <aside className="w-full">
            <div className="sticky top-10 space-y-8">
                <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-black/20 mb-6 flex items-center gap-2">
                        <span className="size-1 bg-burnt-orange rounded-full" />
                        Transmissions
                    </h3>

                    <div className="space-y-1">
                        <button
                            onClick={() => onChannelChange?.(null)}
                            className={`w-full text-left px-4 py-2.5 rounded-sm transition-all duration-300 text-[13px] font-black lowercase relative group
                                ${!activeChannelId
                                    ? 'bg-black text-white shadow-[0_4px_12px_rgba(0,0,0,0.1)]'
                                    : 'text-black/50 hover:bg-black/5 hover:text-black'}
                            `}
                        >
                            <span className="relative z-10 flex items-center justify-between">
                                <span>all transmissions</span>
                                {!activeChannelId && (
                                    <span className="text-[10px] opacity-40 font-mono">00</span>
                                )}
                            </span>
                        </button>

                        {channels.map((channel) => (
                            <button
                                key={channel.id}
                                onClick={() => onChannelChange?.(channel.id)}
                                className={`w-full text-left px-4 py-2.5 rounded-sm transition-all duration-300 text-[13px] font-black lowercase relative group
                                    ${activeChannelId === channel.id
                                        ? 'bg-black text-white shadow-[0_4px_12px_rgba(0,0,0,0.1)]'
                                        : 'text-black/50 hover:bg-black/5 hover:text-black'}
                                `}
                            >
                                <span className="relative z-10 flex items-center justify-between">
                                    <span>{channel.name}</span>
                                    {activeChannelId === channel.id && (
                                        <span className="text-[10px] opacity-40 font-mono">
                                            {channel.id.toString().padStart(2, '0')}
                                        </span>
                                    )}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="pt-8">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-black/10 mb-4">Metadata</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-[11px] font-bold lowercase opacity-40">
                            <span>active nodes</span>
                            <span>{channels.length}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-bold lowercase opacity-40">
                            <span>signal strength</span>
                            <span className="text-green-500">100%</span>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    )
}
