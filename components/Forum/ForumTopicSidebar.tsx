"use client"

import React, { useMemo } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { IconMessage } from '@posthog/icons'
import { useCommunity } from 'hooks/useCommunity'
import { useWindow } from 'context/Window'

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
    const { navigate } = useWindow()

    const handleChannelClick = (channelId: number | null, slug?: string) => {
        if (onChannelChange) {
            onChannelChange(channelId)
        } else {
            if (channelId === null) {
                navigate('/questions')
            } else if (slug) {
                navigate(`/questions/topic/${slug}`)
            }
        }
    }

    const latestPostByChannel = useMemo(() => {
        const acc: Record<number, string> = {};
        for (const post of posts) {
            if (post.channel_id) {
                if (!acc[post.channel_id] || post.created_at > acc[post.channel_id]) {
                    acc[post.channel_id] = post.created_at;
                }
            }
        }
        return acc;
    }, [posts]);

    return (
        <aside className="w-full sticky top-10">
            <ul className="m-0 p-0 list-none space-y-1.5">
                <li className="grid grid-cols-12 px-3 py-1.5 items-center text-secondary !text-[10px] bg-accent/30 rounded-[16px] uppercase font-bold tracking-wider mb-2">
                    <div className="col-span-9">Topics</div>
                    <div className="col-span-3 text-right">Last active</div>
                </li>
                
                <li className="list-none px-0">
                    <div className="mb-1">
                        <button
                            onClick={() => handleChannelClick(null)}
                            className={`group flex items-center w-full text-left px-3 py-2 rounded-[16px] border border-transparent transition-all duration-300 hover:scale-[1.02] hover:bg-accent/40 hover:border-black/5 dark:border-white/5 active:scale-[0.98] ${!activeChannelId ? 'bg-accent/80 border-black/5 dark:border-white/5 active-sidebar-item shadow-[0_4px_16px_rgba(0,0,0,0.06)] shadow-black/5' : ''}`}
                        >
                            <div className="grid grid-cols-12 items-center w-full">
                                <div className="col-span-9 flex items-center space-x-2.5">
                                    <IconMessage className={`w-4 h-4 transition-transform group-hover:rotate-6 ${!activeChannelId ? 'text-primary opacity-100' : 'text-primary/60 opacity-60'}`} />
                                    <span className={`text-xs font-semibold lowercase tracking-tight line-clamp-1 ${!activeChannelId ? 'text-primary font-bold' : 'text-primary/80 group-hover:text-primary'}`}>all transmissions</span>
                                </div>
                                <div className="col-span-3 text-right text-xs font-normal text-secondary/60">-</div>
                            </div>
                        </button>
                    </div>

                    {channels.map((channel) => {
                        const isActive = activeChannelId === channel.id;
                        return (
                            <div key={channel.id} className="mb-1">
                                <button
                                    onClick={() => handleChannelClick(channel.id, channel.slug)}
                                    className={`group flex items-center w-full text-left px-3 py-2 rounded-[16px] border border-transparent transition-all duration-300 hover:scale-[1.02] hover:bg-accent/40 hover:border-black/5 dark:border-white/5 active:scale-[0.98] ${isActive ? 'bg-accent/80 border-black/5 dark:border-white/5 active-sidebar-item shadow-[0_4px_16px_rgba(0,0,0,0.06)] shadow-black/5' : ''}`}
                                >
                                    <div className="grid grid-cols-12 items-center w-full">
                                        <div className="col-span-9 flex items-center space-x-2.5">
                                            <IconMessage className={`w-4 h-4 transition-transform group-hover:rotate-6 ${isActive ? 'text-primary opacity-100' : 'text-primary/60 opacity-60'}`} />
                                            <span className={`text-xs font-semibold lowercase tracking-tight line-clamp-1 ${isActive ? 'text-primary font-bold' : 'text-primary/80 group-hover:text-primary'}`}>{channel.name}</span>
                                        </div>
                                        <div className="col-span-3 text-right text-[10px] font-normal text-secondary/60">
                                            {latestPostByChannel[channel.id] ? dayjs(latestPostByChannel[channel.id]).fromNow() : '-'}
                                        </div>
                                    </div>
                                </button>
                            </div>
                        );
                    })}
                </li>
            </ul>
        </aside>
    )
}
