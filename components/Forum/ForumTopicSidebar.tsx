"use client"

import React from 'react'
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
            <ul className="m-0 p-0 list-none">
                <li className="grid grid-cols-12 pb-1 items-center text-secondary text-sm">
                    <div className="col-span-9">Topics</div>
                    <div className="col-span-3">Last active</div>
                </li>
                <li className="list-none px-[2px] flex flex-col gap-1.5">
                    <button
                            onClick={() => handleChannelClick(null)}
                            className={`group flex items-center relative px-3 py-2.5 rounded-[20px] border border-transparent hover:bg-white/20 dark:hover:bg-black/20 hover:scale-[1.02] transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] w-full text-left ${!activeChannelId ? 'bg-white/60 dark:bg-black/60 supports-[backdrop-filter]:backdrop-blur-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.02)] !border-black/5 dark:!border-white/5 active-sidebar-item' : ''}`}
                        >
                            <div className="grid grid-cols-12 items-center w-full">
                                <div className="col-span-9 flex items-center space-x-3">
                                    <IconMessage className="w-5 opacity-60 text-primary" />
                                    <span className="text-red dark:text-yellow line-clamp-1">all transmissions</span>
                                </div>
                                <div className="col-span-3 text-sm font-normal text-secondary">-</div>
                            </div>
                        </button>

                    {channels.map((channel) => (
                        <button key={channel.id}
                                onClick={() => handleChannelClick(channel.id, channel.slug)}
                                className={`group flex items-center relative px-3 py-2.5 rounded-[20px] border border-transparent hover:bg-white/20 dark:hover:bg-black/20 hover:scale-[1.02] transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] w-full text-left ${activeChannelId === channel.id ? 'bg-white/60 dark:bg-black/60 supports-[backdrop-filter]:backdrop-blur-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.02)] !border-black/5 dark:!border-white/5 active-sidebar-item' : ''}`}
                            >
                                <div className="grid grid-cols-12 items-center w-full">
                                    <div className="col-span-9 flex items-center space-x-3">
                                        <IconMessage className="w-5 opacity-60 text-primary" />
                                        <span className="text-red dark:text-yellow line-clamp-1">{channel.name}</span>
                                    </div>
                                    <div className="col-span-3 text-sm font-normal text-secondary">
                                        {getLastActive(channel.id) || '-'}
                                    </div>
                                </div>
                            </button>
                    ))}
                </li>
            </ul>
        </aside>
    )
}
