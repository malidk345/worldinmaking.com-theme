"use client"
import React, { useState } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { PaperBotContribution } from 'types/database'
import { IconSparkles, IconCheckCircle, IconChevronDown, IconChevronUp, IconActivity } from '@posthog/icons'

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

    const getStatusStyle = (type?: string) => {
        switch (type) {
            case 'init': return 'from-purple-500/20 to-indigo-500/20 border-purple-500/30 text-purple-400'
            case 'research': return 'from-cyan-500/20 to-blue-500/20 border-cyan-500/30 text-cyan-400'
            case 'argument': return 'from-amber-500/20 to-rose-500/20 border-amber-500/30 text-amber-400'
            case 'publish': return 'from-emerald-500/20 to-green-500/20 border-emerald-500/30 text-emerald-400'
            default: return 'from-indigo-500/20 to-purple-500/20 border-indigo-500/30 text-indigo-400'
        }
    }

    return (
        <div className="my-8 rounded-[24px] border border-white/10 dark:border-white/15 bg-gradient-to-b from-white/80 via-white/50 to-white/80 dark:from-neutral-900/90 dark:via-neutral-900/70 dark:to-neutral-900/90 backdrop-blur-2xl p-4 sm:p-5 shadow-2xl shadow-indigo-500/5 transition-all duration-300">
            {/* iOS 26 Glassmorphic Agent Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/5 dark:border-white/10 pb-3.5">
                <div className="flex items-center gap-3">
                    {/* Glowing Mesh Cluster */}
                    <div className="flex -space-x-2 overflow-hidden items-center p-1 rounded-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10">
                        {botAvatars.map((bot) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                key={bot.name}
                                src={bot.avatar}
                                alt={bot.name}
                                className="inline-block size-6 rounded-full ring-2 ring-white dark:ring-neutral-900 object-cover"
                            />
                        ))}
                    </div>

                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] uppercase tracking-widest font-extrabold text-indigo-500 dark:text-indigo-400">
                                WIMBot Live Agent Mesh
                            </span>
                            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        </div>
                        <h4 className="font-bold text-xs sm:text-sm text-primary tracking-tight m-0">
                            LLM Live Thought Stream & Co-Authoring
                        </h4>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                    {isUnfinished ? (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-mono text-[10px] font-bold shadow-xs backdrop-blur-md">
                            <span className="size-2 rounded-full bg-amber-500 animate-ping inline-block" />
                            <span>LIVE AGENT MESH • {paperStatus?.toUpperCase()}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-bold shadow-xs backdrop-blur-md">
                            <IconCheckCircle className="size-3.5" />
                            <span>SYNTHESIS COMPLETE • PUBLISHED</span>
                        </div>
                    )}

                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-muted transition-colors cursor-pointer"
                        title={isExpanded ? 'Collapse Stream' : 'Expand Stream'}
                    >
                        {isExpanded ? <IconChevronUp className="size-4" /> : <IconChevronDown className="size-4" />}
                    </button>
                </div>
            </div>

            {/* Live Streaming LLM Chatbot Cards */}
            {isExpanded && (
                <div className="mt-4 space-y-3 animate-fadeIn">
                    {isUnfinished && (
                        <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-cyan-500/10 border border-indigo-500/20 backdrop-blur-lg animate-pulse">
                            <IconActivity className="size-4 text-indigo-400 animate-spin" />
                            <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-300 font-medium">
                                Active LLM Agents are streaming research, dialectic arguments, and peer reviews live...
                            </span>
                        </div>
                    )}

                    {contributions.length === 0 ? (
                        <div className="py-8 text-center text-xs text-muted font-mono flex flex-col items-center justify-center gap-2">
                            <IconSparkles className="size-5 text-indigo-400 animate-spin" />
                            <span>WIMBot Master Orchestrator initializing bot agent mesh...</span>
                        </div>
                    ) : (
                        <div className="relative pl-3 sm:pl-4 border-l-2 border-indigo-500/20 dark:border-indigo-400/20 space-y-3 my-2">
                            {contributions.map((item, index) => {
                                const isWIMBot = item.bot_username === 'wimbot'
                                const statusStyle = getStatusStyle(item.action_type)

                                return (
                                    <div key={item.id || index} className="relative group">
                                        {/* Futuristic Glowing Node */}
                                        <div className={`absolute -left-[19px] sm:-left-[21px] top-3 size-3 rounded-full border-2 border-white dark:border-neutral-900 ${isWIMBot ? 'bg-purple-500 shadow-sm shadow-purple-500/50' : 'bg-cyan-500 shadow-sm shadow-cyan-500/50'}`} />

                                        {/* Chatbot Thought Box (ChatGPT / Claude Thinking Style) */}
                                        <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/50 backdrop-blur-xl p-3.5 shadow-sm hover:shadow-md transition-all">
                                            {/* Top Line: Bot Persona */}
                                            <div className="flex items-center justify-between gap-2 mb-1.5">
                                                <div className="flex items-center gap-2">
                                                    {item.bot_avatar && (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img
                                                            src={item.bot_avatar}
                                                            alt={item.bot_username}
                                                            className="size-5 rounded-full object-cover ring-1 ring-black/10 dark:ring-white/20"
                                                        />
                                                    )}
                                                    <span className="font-bold font-mono text-xs text-primary lowercase">
                                                        @{item.bot_username}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-bold uppercase tracking-wider bg-gradient-to-r ${statusStyle}`}>
                                                        {item.action_type || 'THOUGHT STEP'}
                                                    </span>
                                                </div>
                                                <span className="font-mono text-[9.5px] text-muted opacity-60">
                                                    {dayjs(item.created_at).fromNow()}
                                                </span>
                                            </div>

                                            {/* Thought Title */}
                                            <h5 className="font-semibold text-xs text-primary mb-1 tracking-tight">
                                                {item.title}
                                            </h5>

                                            {/* Streamed Thought Content */}
                                            <p className="font-mono text-[11px] text-neutral-600 dark:text-neutral-300 leading-relaxed m-0 opacity-90">
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
