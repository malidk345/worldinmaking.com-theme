"use client"

import React from 'react'
import Link from 'components/Link'
import Tooltip from 'components/Tooltip'
import { ForumQuestion } from './types'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { IconCheckCircle, IconMessage } from '@posthog/icons'
import ForumAvatar from './ForumAvatar'

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
        replyCount,
        createdAt,
        resolved,
    } = question

    const numReplies = replyCount ?? replies.length
    const activeAt = replies.length > 0 ? replies[replies.length - 1].createdAt : createdAt

    return (
        <div className="py-2.5">
            <Link
                to={`/questions/${permalink}`}
                newWindow
                className="group flex items-center relative px-2 py-1.5 -mt-1.5 mx-[-2px] -mb-3 rounded active:bg-light dark:active:bg-dark border-primary border-b-3 border-transparent hover:border hover:translate-y-[-1px] active:translate-y-[1px] active:transition-all active:before:h-[2px] active:before:bg-light dark:active:before:bg-dark active:before:absolute active:before:content-[''] active:before:top-[-3px] active:before:left-0 active:before:right-0 !no-underline"
            >
                <div className="grid grid-cols-12 items-center w-full">
                    <div className="col-span-12 md:col-span-8 flex items-center space-x-3.5">
                        <div className="relative shrink-0 flex items-center justify-center">
                            <ForumAvatar
                                className="size-7 rounded-full border border-black/10 dark:border-white/10"
                                image={profile?.avatar}
                            />
                            {resolved && (
                                <span className="absolute -bottom-1 -right-1 bg-white dark:bg-[#121214] rounded-full p-[1.5px] shadow-sm">
                                    <Status resolved={resolved} />
                                </span>
                            )}
                        </div>

                        <div className="w-full min-w-0">
                            <span className="text-sm font-semibold text-[#000080] dark:text-[#66b2ff] line-clamp-3 md:line-clamp-1 break-words">{subject}</span>

                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-xs text-primary/60 dark:text-primary/60">
                                <span className="font-semibold text-primary dark:text-primary opacity-80 group-hover:opacity-100">
                                    {topics?.[0]?.label || 'Uncategorized'}
                                </span>
                                <span>•</span>
                                <span className="font-semibold text-[#000080] dark:text-[#66b2ff] inline-flex items-center gap-x-0.5">
                                    <IconMessage className="size-3.5" />
                                    <span>{numReplies} {numReplies === 1 ? 'reply' : 'replies'}</span>
                                </span>
                                <span>•</span>
                                <span>
                                    {dayjs(sortBy === 'activity' ? activeAt : createdAt).fromNow()} by {profile?.firstName || 'anonymous'}
                                </span>
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
        <ul className="m-0 p-0 list-none">
            <li className="grid grid-cols-12 pl-2 pr-3 py-1.5 items-center text-secondary !text-sm bg-accent rounded">
                <div className="col-span-12 md:col-span-8 pl-[42px]">Question / Topic</div>
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
})

ForumQuestionsTable.displayName = 'ForumQuestionsTable'

export default ForumQuestionsTable
