"use client"

import React from 'react'
import Link from 'components/Link'
import { ForumQuestion } from './types'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { IconMessage } from '@posthog/icons'

dayjs.extend(relativeTime)

interface ForumQuestionsTableProps {
    questions: ForumQuestion[]
    isLoading?: boolean
    className?: string
    sortBy?: 'newest' | 'activity' | 'popular'
    showTopic?: boolean
    showBody?: boolean
    showAuthor?: boolean
    showStatus?: boolean
}

const Row = ({
    question,
    sortBy,
}: {
    question: ForumQuestion
    sortBy?: string
}) => {
    const {
        id,
        subject,
        permalink,
        replies,
        createdAt,
        resolved,
    } = question

    const numReplies = replies.length
    const activeAt = replies.length > 0 ? replies[replies.length - 1].createdAt : createdAt

    return (
        <div className="group border-b border-primary/40 last:border-b-0 hover:bg-accent/5 transition-colors">
            <Link
                to={`/questions/${permalink}`}
                className="flex items-start py-4 px-2 !no-underline group w-full"
            >
                <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                        {resolved && (
                            <span className="text-[10px] font-bold text-green uppercase tracking-wider border border-green/30 px-1 rounded-sm">
                                Resolved
                            </span>
                        )}
                        <span className="text-[10px] font-mono text-primary/30 shrink-0">#{id}</span>
                    </div>
                    <h4 className="text-[15px] font-bold text-primary leading-snug group-hover:text-burnt-orange transition-colors line-clamp-2 m-0">
                        {subject}
                    </h4>
                </div>

                <div className="flex items-center gap-6 shrink-0 mt-1">
                    <div className="flex items-center gap-1.5 text-primary/40 group-hover:text-primary transition-colors">
                        <IconMessage className="size-4" />
                        <span className="text-xs font-bold">{numReplies}</span>
                    </div>
                    <div className="w-24 text-right">
                        <span className="text-xs text-primary/40 font-medium">
                            {dayjs(sortBy === 'activity' ? activeAt : createdAt).fromNow()}
                        </span>
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
}: ForumQuestionsTableProps) {
    return (
        <div className="bg-[#fbfcfa] dark:bg-black border border-primary rounded-md overflow-hidden">
            {questions.length === 0 && !isLoading ? (
                <div className="py-20 text-center opacity-40">
                    <div className="text-sm font-bold">No discussions found.</div>
                </div>
            ) : (
                <div className="divide-y divide-primary">
                    {questions.map((question) => (
                        <Row
                            key={question.id}
                            question={question}
                            sortBy={sortBy}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
