"use client"

import React from 'react'
import Link from 'components/Link'
import Tooltip from 'components/Tooltip'
import { ForumQuestion } from './types'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { IconCheckCircle } from '@posthog/icons'

dayjs.extend(relativeTime)

interface ForumQuestionsTableProps {
    questions: ForumQuestion[]
    isLoading?: boolean
    sortBy?: 'newest' | 'activity' | 'popular'
    showBody?: boolean
}

const Skeleton = () => {
    return (
        <div className="grid grid-cols-12 items-center w-full mt-4">
            <div className="col-span-12 md:col-span-8 flex items-center space-x-4">
                <div className="w-5 flex-shrink-0" />
                <div className="w-full space-y-1">
                    <div className="animate-pulse bg-accent h-[18px] rounded-md w-2/3" />
                    <div className="animate-pulse bg-accent h-[18px] rounded-md" />
                </div>
            </div>
            <div className="hidden md:flex md:col-span-1 items-start justify-center h-full">
                <div className="animate-pulse bg-accent h-[18px] rounded-md w-[18px]" />
            </div>
            <div className="hidden md:flex md:col-span-3 items-start justify-center h-full">
                <div className="animate-pulse bg-accent h-[18px] rounded-md w-full" />
            </div>
        </div>
    )
}

const Status = ({ resolved }: { resolved: boolean }) => {
    if (!resolved) return null

    return (
        <Tooltip content="Resolved">
            <span className="relative text-green">
                <IconCheckCircle />
            </span>
        </Tooltip>
    )
}

const Row = ({
    question,
    sortBy,
    showBody,
}: {
    question: ForumQuestion
    sortBy?: string
    showBody?: boolean
}) => {
    const {
        subject,
        permalink,
        topics,
        body,
        profile,
        replies,
        createdAt,
        resolved,
    } = question

    const numReplies = replies.length
    const activeAt = replies.length > 0 ? replies[replies.length - 1].createdAt : createdAt

    return (
        <div className="py-1">
            <Link
                to={`/questions/${permalink}`}
                newWindow
                className="group flex items-center relative px-4 py-4 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 border border-transparent hover:border-primary/20 transition-all duration-300 !no-underline"
            >
                <div className="grid grid-cols-12 items-center w-full gap-4">
                    <div className="col-span-12 md:col-span-8 flex items-start space-x-4">
                        <div className="w-5 flex-shrink-0 pt-0.5">
                            <Status resolved={resolved} />
                        </div>

                        <div className="w-full min-w-0">
                            <span className="text-[15px] font-bold text-primary opacity-90 group-hover:opacity-100 transition-opacity line-clamp-2 break-words leading-tight">{subject}</span>

                            <div className="flex justify-between items-center mt-2 group-hover:opacity-100 opacity-60 transition-opacity">
                                <div className="text-[10px] uppercase tracking-widest font-black text-primary/80 bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                                    {topics?.[0]?.label || 'Uncategorized'}
                                </div>

                                <div className="md:hidden text-[11px] font-medium opacity-80 line-clamp-1 italic">
                                    {dayjs(sortBy === 'activity' ? activeAt : createdAt).fromNow()}{' '}by <span className="font-bold not-italic">{profile?.firstName || 'anonymous'}</span>
                                </div>
                            </div>

                            {showBody && body && (
                                <div className="mt-2.5 flex-1 min-w-0 text-primary/70 text-[13px] leading-relaxed line-clamp-2 break-words">
                                    {body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="hidden md:flex md:col-span-1 justify-center items-center">
                        <div className={`text-[12px] font-bold px-3 py-1 rounded-full border ${numReplies > 0 ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-transparent border-primary/10 text-primary/40'}`}>
                            {numReplies}
                        </div>
                    </div>

                    <div className="hidden md:flex md:col-span-3 items-center pl-4 border-l border-primary/10 h-full">
                        <div className="text-[11px] text-primary/60 font-medium">
                            <div className="opacity-70 group-hover:opacity-100 transition-opacity">
                                {dayjs(sortBy === 'activity' ? activeAt : createdAt).fromNow()}
                            </div>
                            <div className="mt-0.5 opacity-50">
                                by <span className="font-bold text-primary/80">{profile?.firstName || 'anonymous'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </Link>
        </div>
    )
}

export default function ForumQuestionsTable({
    questions,
    isLoading,
    sortBy = 'newest',
    showBody,
}: ForumQuestionsTableProps) {
    return (
        <ul className="m-0 p-0 list-none">
            <li className="grid grid-cols-12 px-4 py-2 mb-4 items-center text-[10px] font-black uppercase tracking-widest text-primary/50 border-b border-dashed border-primary/20">
                <div className="col-span-12 md:col-span-8">Transmissions / Topic</div>
                <div className="hidden md:block md:col-span-1 text-center">Responses</div>
                <div className="hidden md:block md:col-span-3 pl-4">{sortBy === 'activity' ? 'Last Broadcast' : 'Originated'}</div>
            </li>

            {questions.length === 0 && !isLoading ? (
                <li className="py-24 text-center">
                    <div className="inline-block border border-dashed border-primary/30 rounded-lg px-8 py-6 bg-primary/5 text-primary/60 text-[11px] font-black uppercase tracking-widest">
                        No active signals detected in this channel.
                    </div>
                </li>
            ) : (
                questions.map((question) => (
                    <li key={question.id} className="list-none px-[2px] divide-y divide-primary">
                        <Row
                            question={question}
                            sortBy={sortBy}
                            showBody={showBody}
                        />
                    </li>
                ))
            )}

            {isLoading && <Skeleton />}
        </ul>
    )
}
