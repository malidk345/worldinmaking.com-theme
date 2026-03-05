"use client"

import React from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { IconMessage } from '@posthog/icons'
import { useCommunity } from 'hooks/useCommunity'

dayjs.extend(relativeTime)

interface ForumTopicSidebarProps {
    activeChannelId?: number | null
    onChannelChange?: (id: number | null) => void
}

export default function ForumTopicSidebar({
    activeChannelId,
    onChannelChange
}: ForumTopicSidebarProps) {
    const { channels, posts } = useCommunity()

    const getLastActive = (channelId: number) => {
        const channelPosts = posts.filter((post) => post.channel_id === channelId)
        if (!channelPosts.length) return null

        const latest = channelPosts.reduce((acc, current) => {
            return new Date(current.created_at).getTime() > new Date(acc.created_at).getTime() ? current : acc
        })

        return dayjs(latest.created_at).fromNow()
    }

    return (
        <aside className="w-full sticky top-10">
            <div className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-primary/50 border-b border-dashed border-primary/20 pb-2 px-2">
                Directory
            </div>

            <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
                <li className="list-none">
                    <button
                        onClick={() => onChannelChange?.(null)}
                        className={`group flex flex-col px-3 py-2.5 rounded-lg border transition-all w-full text-left relative overflow-hidden ${!activeChannelId
                                ? 'bg-primary/5 border-primary/30 shadow-sm'
                                : 'bg-transparent border-transparent hover:bg-black/5 dark:hover:bg-white/5'
                            }`}
                    >
                        {!activeChannelId && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/40 rounded-l-lg" />
                        )}
                        <div className="flex items-center space-x-2.5">
                            <IconMessage className={`w-4 ${!activeChannelId ? 'text-primary' : 'text-primary/40 group-hover:text-primary/70 transition-colors'}`} />
                            <span className={`text-[13px] font-bold line-clamp-1 ${!activeChannelId ? 'text-primary' : 'text-primary/70'}`}>all transmissions</span>
                        </div>
                    </button>
                </li>

                {channels.map((channel) => (
                    <li key={channel.id} className="list-none">
                        <button
                            onClick={() => onChannelChange?.(channel.id)}
                            className={`group flex flex-col px-3 py-2.5 rounded-lg border transition-all w-full text-left relative overflow-hidden ${activeChannelId === channel.id
                                    ? 'bg-primary/5 border-primary/30 shadow-sm'
                                    : 'bg-transparent border-transparent hover:bg-black/5 dark:hover:bg-white/5'
                                }`}
                        >
                            {activeChannelId === channel.id && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/40 rounded-l-lg" />
                            )}
                            <div className="flex items-center space-x-2.5 mb-1">
                                <IconMessage className={`w-4 ${activeChannelId === channel.id ? 'text-primary' : 'text-primary/40 group-hover:text-primary/70 transition-colors'}`} />
                                <span className={`text-[13px] font-bold line-clamp-1 ${activeChannelId === channel.id ? 'text-primary' : 'text-primary/70 group-hover:text-primary'}`}>{channel.name}</span>
                            </div>

                            <div className="pl-6.5 text-[10px] font-medium text-primary/40 group-hover:text-primary/50 flex justify-between items-center w-full">
                                <span>Signal activity:</span>
                                <span>{getLastActive(channel.id) || 'dormant'}</span>
                            </div>
                        </button>
                    </li>
                ))}
            </ul>
        </aside>
    )
}
