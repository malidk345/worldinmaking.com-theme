"use client"

import React from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { IconMessage } from '@posthog/icons'
import { useCommunity } from 'hooks/useCommunity'

dayjs.extend(relativeTime)

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
                <li className="list-none px-[2px] divide-y divide-primary">
                    <div className="py-2.5">
                        <button
                            onClick={() => onChannelChange?.(null)}
                            className={`group flex items-center relative px-2 py-2.5 -mt-2.5 mx-[-2px] -mb-3 rounded border border-b-3 border-transparent hover:border hover:translate-y-[-1px] active:translate-y-[1px] transition-all w-full text-left ${!activeChannelId ? 'border-primary bg-accent/70' : ''}`}
                        >
                            <div className="grid grid-cols-12 items-center w-full">
                                <div className="col-span-9 flex items-center space-x-3">
                                    <IconMessage className="w-5 opacity-60 text-primary" />
                                    <span className="text-red dark:text-yellow line-clamp-1">all transmissions</span>
                                </div>
                                <div className="col-span-3 text-sm font-normal text-secondary">-</div>
                            </div>
                        </button>
                    </div>

                    {channels.map((channel) => (
                        <div key={channel.id} className="py-2.5">
                            <button
                                onClick={() => onChannelChange?.(channel.id)}
                                className={`group flex items-center relative px-2 py-2.5 -mt-2.5 mx-[-2px] -mb-3 rounded border border-b-3 border-transparent hover:border hover:translate-y-[-1px] active:translate-y-[1px] transition-all w-full text-left ${activeChannelId === channel.id ? 'border-primary bg-accent/70' : ''}`}
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
                        </div>
                    ))}
                </li>
            </ul>
        </aside>
    )
}
