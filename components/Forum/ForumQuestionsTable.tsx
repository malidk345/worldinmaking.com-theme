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

const Row = React.memo(({
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
                className="group flex items-center relative p-3 md:p-4 rounded-[24px] bg-white/40 dark:bg-black/40 supports-[backdrop-filter]:backdrop-blur-[20px] border border-black/5 dark:border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.02)] hover:bg-white/60 dark:hover:bg-black/60 hover:scale-[1.01] hover:shadow-[0_8px_32px_rgba(0,0,0,0.04)] active:scale-[0.99] transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] !no-underline"
            >
                <div className="grid grid-cols-12 items-center w-full">
                    <div className="col-span-12 md:col-span-8 flex items-center space-x-4">
                        <div className="w-5 flex-shrink-0">
                            <Status resolved={resolved} />
                        </div>

                        <div className="w-full min-w-0">
                            <span className="text-sm font-semibold text-[#000080] dark:text-[#66b2ff] line-clamp-3 md:line-clamp-1 break-words">{subject}</span>

                            <div className="flex justify-between items-center mt-0.5">
                                <div className="text-primary dark:text-primary font-medium opacity-60 group-hover:opacity-100 line-clamp-1 text-sm">
                                    {topics?.[0]?.label || 'Uncategorized'}
                                </div>

                                <div className="md:hidden text-primary dark:text-primary text-sm font-medium opacity-60 line-clamp-1">
                                    {dayjs(sortBy === 'activity' ? activeAt : createdAt).fromNow()}{' '}by {profile?.firstName || 'anonymous'}
                                </div>
                            </div>

                            {showBody && body && (
                                <div className="mt-1 flex-1 min-w-0 text-black dark:text-white text-xs line-clamp-2 break-words">
                                    {body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="hidden md:block md:col-span-1 text-center text-sm font-normal text-secondary">
                        {numReplies}
                    </div>

                    <div className="hidden md:block md:col-span-3 text-sm font-normal text-secondary">
                        <div className="text-primary dark:text-primary font-medium opacity-60 line-clamp-2">
                            {dayjs(sortBy === 'activity' ? activeAt : createdAt).fromNow()}
                            {' '}by {profile?.firstName || 'anonymous'}
                        </div>
                    </div>
                </div>
            </Link>
        </div>
    )
})

Row.displayName = 'Row'

const ForumQuestionsTable = React.memo(({
    questions,
    isLoading,
    sortBy = 'newest',
    showBody,
}: ForumQuestionsTableProps) => {
    return (
        <ul className="m-0 p-0 list-none flex flex-col gap-2">


            {questions.length === 0 && !isLoading ? (
                <li className="py-16 text-center text-secondary/70 text-sm font-bold">No discussions found.</li>
            ) : (
                questions.map((question) => (
                    <li key={question.id} className="list-none">
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
})

ForumQuestionsTable.displayName = 'ForumQuestionsTable'

export default ForumQuestionsTable
