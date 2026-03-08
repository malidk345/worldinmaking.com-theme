"use client"

import React, { useState } from 'react'
import ForumDays from './ForumDays'
import ForumMarkdown from './ForumMarkdown'
import { ForumReply } from './types'
import ForumAvatar from './ForumAvatar'
import OSButton from 'components/OSButton'
import VotePicker from 'components/VotePicker'
import { IconThumbsUp, IconPencil } from '@posthog/icons'
import Link from 'components/Link'

interface ForumReplyCardProps {
    reply: ForumReply
    isInForum?: boolean
    questionAuthorId?: string | number
}

export default function ForumReplyCard({ reply, isInForum = false, questionAuthorId }: ForumReplyCardProps) {
    const [upvoted, setUpvoted] = useState(false)
    const [upvotes, setUpvotes] = useState(reply.upvotes || 0)

    const handleUpvote = () => {
        if (upvoted) {
            setUpvotes(v => v - 1)
            setUpvoted(false)
        } else {
            setUpvotes(v => v + 1)
            setUpvoted(true)
        }
    }

    const isAuthor = questionAuthorId && reply.profile.id === questionAuthorId
    const isAI = reply.profile?.firstName?.toLowerCase().includes('ai')

    return (
        <div className="flex flex-col w-full text-primary mt-2">
            <div className={`pb-1 flex flex-wrap sm:flex-nowrap items-center space-x-2 ${isInForum ? 'pr-3 sm:pr-8' : ''}`}>
                <Link
                    to={`/profile/${reply.profile.firstName}`}
                    className="flex items-center text-primary hover:!underline !no-underline"
                >
                    <div className="mr-2 relative ml-[-2px]">
                        <ForumAvatar
                            className={`${isInForum ? 'size-[32px] sm:size-[40px]' : 'size-[25px]'} rounded-full`}
                            image={reply.profile.avatar}
                            isTeamMember={isAI}
                        />
                    </div>
                    <strong>{reply.profile.firstName || 'anonymous'}</strong>
                </Link>

                {isAuthor && (
                    <span className="bg-accent text-primary text-[10px] px-1.5 py-0.5 rounded font-bold lowercase tracking-widest ml-1">
                        author
                    </span>
                )}
                {isAI && (
                    <span className="bg-accent text-primary text-[10px] px-1.5 py-0.5 rounded font-bold lowercase tracking-widest ml-1">
                        AI
                    </span>
                )}

                <ForumDays created={reply.createdAt} />

                <div className="!ml-auto hidden sm:flex items-center space-x-1 opacity-60 hover:opacity-100 transition-opacity">
                    <OSButton
                        size="sm"
                        tooltip="edit reply"
                        onClick={() => { }}
                        icon={<IconPencil />}
                        className="!p-1"
                    />
                </div>
            </div>

            <div className={`border-l-0 ${isInForum ? 'pl-[40px] sm:pl-[calc(44px_+_.5rem)] pr-3 sm:pr-8 md:-mt-2' : 'ml-[33px]'} pl-0 pb-1`}>
                <div className="reply-content">
                    <ForumMarkdown>{reply.body}</ForumMarkdown>
                </div>

                <div className="flex items-center gap-1 mt-4">
                    <VotePicker
                        count={upvotes}
                        active={upvoted}
                        onDecrement={() => { if (upvoted) handleUpvote() }}
                        onIncrement={() => { if (!upvoted) handleUpvote() }}
                    />
                </div>
            </div>
        </div>
    )
}
