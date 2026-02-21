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
    className?: string
    sortBy?: 'newest' | 'activity' | 'popular'
    showTopic?: boolean
    showBody?: boolean
    showAuthor?: boolean
    showStatus?: boolean
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
        id,
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
        <div className="py-2.5">
            <Link
                to={`/questions/${permalink}`}
                className="group flex items-center relative px-2 py-1.5 -mt-1.5 mx-[-2px] -mb-3 rounded active:bg-light dark:active:bg-dark border-primary border-b-3 border-transparent hover:border hover:translate-y-[-1px] active:translate-y-[1px] active:transition-all active:before:h-[2px] active:before:bg-light dark:active:before:bg-dark active:before:absolute active:before:content-[''] active:before:top-[-3px] active:before:left-0 active:before:right-0 !no-underline"
            >
                <div className="grid grid-cols-12 items-center w-full">
                    <div className="col-span-12 md:col-span-8 flex items-center space-x-4">
                        <div className="w-5 flex-shrink-0">
                            <Status resolved={resolved} />
                        </div>

                        <div className="w-full">
                            <span className="text-sm text-red dark:text-yellow line-clamp-1">{subject}</span>

                            <div className="flex justify-between items-center">
                                <div className="text-primary dark:text-primary font-medium opacity-60 group-hover:opacity-100 line-clamp-1 text-sm">
                                    {topics?.[0]?.label || 'Uncategorized'}
                                </div>

                                <div className="md:hidden text-primary dark:text-primary text-sm font-medium opacity-60 line-clamp-2">
                                    {dayjs(sortBy === 'activity' ? activeAt : createdAt).fromNow()}
                                </div>
                            </div>

                            {showBody && body && (
                                <div className="items-baseline flex flex-1 min-w-0 whitespace-nowrap overflow-hidden text-primary/70 text-xs">
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
}

export default function ForumQuestionsTable({
    questions,
    isLoading,
    sortBy = 'newest',
    showBody,
}: ForumQuestionsTableProps) {
    return (
        <ul className="m-0 p-0 list-none">
            <li className="grid grid-cols-12 pl-2 pr-3 py-1.5 items-center text-secondary !text-sm bg-accent rounded">
                <div className="col-span-12 md:col-span-8 pl-8">Question / Topic</div>
                <div className="hidden md:block md:col-span-1 text-center">Replies</div>
                <div className="hidden md:block md:col-span-3">{sortBy === 'activity' ? 'Last active' : 'Created'}</div>
            </li>

            {questions.length === 0 && !isLoading ? (
                <li className="py-16 text-center text-secondary/70 text-sm font-bold">No discussions found.</li>
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
