"use client"
import React, { useState } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { PaperBotContribution } from 'types/database'
import { IconSparkles, IconCheckCircle, IconChevronDown, IconActivity } from '@posthog/icons'

dayjs.extend(relativeTime)

interface PaperBotTimelineProps {
    contributions?: PaperBotContribution[]
    paperStatus?: string
}

export default function PaperBotTimeline({ contributions = [], paperStatus = 'published' }: PaperBotTimelineProps) {
    const [isExpanded, setIsExpanded] = useState(true)
    const isUnfinished = paperStatus !== 'published'

    const botAvatars = [
        { name: 'wimbot', avatar: 'https://res.cloudinary.com/dmukukwp6/image/upload/v1710153303/posthog.com/contents/images/authors/james.png' },
        { name: 'synthia', avatar: 'https://res.cloudinary.com/dmukukwp6/image/upload/v1710153303/posthog.com/contents/images/authors/tim.png' },
        { name: 'nexus', avatar: 'https://res.cloudinary.com/dmukukwp6/image/upload/v1710153303/posthog.com/contents/images/authors/marcus.png' },
        { name: 'logix', avatar: 'https://res.cloudinary.com/dmukukwp6/image/upload/v1710153303/posthog.com/contents/images/authors/charles.png' }
    ]

    const getActionTagStyle = (type?: string) => {
        switch (type) {
            case 'init': return 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20'
            case 'research': return 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20'
            case 'argument': return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
            case 'publish': return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
            default: return 'bg-neutral-500/10 text-neutral-700 dark:text-neutral-300 border-neutral-500/20'
        }
    }

    return (
        <div className="my-6 rounded-xl border border-black/10 dark:border-white/10 bg-[#f9fafb] dark:bg-[#161616] p-4 sm:p-5 shadow-xs font-sans">
            {/* PostHog Editorial Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/10 dark:border-white/10 pb-3 mb-4">
                <div className="flex items-center gap-3">
                    {/* Bot Avatars Stack */}
                    <div className="flex -space-x-1.5 overflow-hidden items-center p-0.5">
                        {botAvatars.map((bot) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                key={bot.name}
                                src={bot.avatar}
                                alt={bot.name}
                                className="inline-block size-5 rounded-full ring-2 ring-[#f9fafb] dark:ring-[#161616] object-cover"
                                onError={(e) => { e.currentTarget.style.display = 'none' }}
                            />
                        ))}
                    </div>

                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] uppercase tracking-wider font-bold text-primary opacity-60">
                                PostHog Agent Engine
                            </span>
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                        </div>
                        <h4 className="font-bold text-xs sm:text-sm text-primary tracking-tight m-0">
                            Synthetic Bot Collaboration Log
                        </h4>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-[10px]">
                    {isUnfinished ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold">
                            <span className="size-1.5 rounded-full bg-amber-500 animate-ping inline-block" />
                            <span>UNFINISHED • {paperStatus?.toUpperCase()}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold">
                            <IconCheckCircle className="size-3.5" />
                            <span>VERIFIED & PUBLISHED BY WIMBOT</span>
                        </div>
                    )}

                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-muted transition-colors cursor-pointer"
                        title={isExpanded ? 'Collapse Log' : 'Expand Log'}
                    >
                        <IconChevronDown className={`size-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                </div>
            </div>

            {/* PostHog Clean Audit / Thought Stream Log */}
            {isExpanded && (
                <div className="mt-3 space-y-3">
                    {isUnfinished && (
                        <div className="flex items-center gap-2 p-2.5 rounded-md bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 font-mono text-[11px] text-muted">
                            <IconActivity className="size-3.5 text-primary opacity-60 animate-spin" />
                            <span>Autonomous bot pipeline actively compiling research & peer review entries...</span>
                        </div>
                    )}

                    {contributions.length === 0 ? (
                        <div className="py-6 text-center text-xs text-muted font-mono flex items-center justify-center gap-2">
                            <IconSparkles className="size-4 opacity-50 animate-spin" />
                            <span>Initializing bot agent collaboration entries...</span>
                        </div>
                    ) : (
                        <div className="relative pl-3.5 border-l border-black/10 dark:border-white/10 space-y-3 my-1">
                            {contributions.map((item, index) => {
                                const tagStyle = getActionTagStyle(item.action_type)

                                return (
                                    <div key={item.id || index} className="relative group">
                                        {/* PostHog Square Bullet Node */}
                                        <div className="absolute -left-[18.5px] top-2.5 size-2 rounded-xs bg-primary/40 group-hover:bg-primary transition-colors" />

                                        <div className="rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-[#1a1a1a] p-3 shadow-2xs">
                                            {/* Top Line: Bot Handle & Action Tag */}
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <div className="flex items-center gap-2">
                                                    {item.bot_avatar && (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img
                                                            src={item.bot_avatar}
                                                            alt={item.bot_username}
                                                            className="size-4 rounded-full object-cover"
                                                            onError={(e) => { e.currentTarget.style.display = 'none' }}
                                                        />
                                                    )}
                                                    <span className="font-bold font-mono text-xs text-primary lowercase">
                                                        @{item.bot_username}
                                                    </span>
                                                    <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-semibold border uppercase tracking-wider ${tagStyle}`}>
                                                        {item.action_type || 'STEP'}
                                                    </span>
                                                </div>
                                                <span className="font-mono text-[10px] text-muted opacity-60">
                                                    {dayjs(item.created_at).fromNow()}
                                                </span>
                                            </div>

                                            {/* Step Title */}
                                            <h5 className="font-bold text-xs text-primary mb-1">
                                                {item.title}
                                            </h5>

                                            {/* Step Content */}
                                            <p className="font-mono text-[11px] text-muted leading-relaxed m-0 opacity-85">
                                                {item.content}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
