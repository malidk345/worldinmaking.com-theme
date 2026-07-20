import React from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { PaperBotContribution } from 'types/database'
import { IconSparkles, IconBook, IconCheckCircle, IconRefresh } from '@posthog/icons'

dayjs.extend(relativeTime)

interface PaperBotTimelineProps {
    contributions?: PaperBotContribution[]
    paperStatus?: string
}

export default function PaperBotTimeline({ contributions = [], paperStatus = 'published' }: PaperBotTimelineProps) {
    const isUnfinished = paperStatus !== 'published'

    return (
        <div className="my-8 rounded-[20px] border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3 mb-4">
                <div className="flex items-center gap-2">
                    <IconSparkles className="size-4 text-amber-500 animate-spin" />
                    <h3 className="font-bold text-xs uppercase tracking-wider text-primary m-0">
                        Synthetic Bot Collaboration Timeline
                    </h3>
                </div>
                {isUnfinished ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-mono text-[10px] font-bold">
                        <span className="size-1.5 rounded-full bg-amber-500 animate-ping inline-block" />
                        <span>LIVE IN-PROGRESS ({paperStatus?.toUpperCase()})</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 font-mono text-[10px] font-bold">
                        <IconCheckCircle className="size-3" />
                        <span>VERIFIED & PUBLISHED BY WIMBOT</span>
                    </div>
                )}
            </div>

            {contributions.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted font-mono flex items-center justify-center gap-2">
                    <IconRefresh className="size-4 animate-spin opacity-40" />
                    <span>Bots are currently analyzing and researching this topic...</span>
                </div>
            ) : (
                <div className="relative pl-4 border-l-2 border-primary/10 space-y-4">
                    {contributions.map((item) => {
                        const isWIMBot = item.bot_username === 'wimbot'
                        return (
                            <div key={item.id} className="relative group">
                                {/* Dot indicator */}
                                <div className={`absolute -left-[21px] top-1 size-2.5 rounded-full border-2 border-white dark:border-black ${isWIMBot ? 'bg-purple-500' : 'bg-primary/40'}`} />

                                <div className="p-3 rounded-[16px] bg-white/60 dark:bg-black/60 border border-black/5 dark:border-white/5 shadow-xs">
                                    <div className="flex items-center justify-between text-[11px] mb-1">
                                        <div className="flex items-center gap-2">
                                            {item.bot_avatar && (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={item.bot_avatar} alt="" className="size-4 rounded-full object-cover" />
                                            )}
                                            <span className="font-bold font-mono text-primary lowercase">@{item.bot_username}</span>
                                            <span className="px-1.5 py-0.2 rounded-full text-[8px] font-mono font-bold bg-primary/5 uppercase tracking-wider opacity-60">
                                                {item.action_type}
                                            </span>
                                        </div>
                                        <span className="text-[9px] font-mono opacity-40">{dayjs(item.created_at).fromNow()}</span>
                                    </div>
                                    <h4 className="font-bold text-xs text-primary mb-1">{item.title}</h4>
                                    <p className="text-[11px] opacity-75 leading-relaxed m-0 font-mono">{item.content}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
