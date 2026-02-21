"use client"

import React, { useState } from 'react'
import ForumDays from './ForumDays'
import ForumMarkdown from './ForumMarkdown'
import { ForumReply } from './types'
import ForumAvatar from './ForumAvatar'
import OSButton from 'components/OSButton'
import { IconThumbsUp, IconThumbsDown, IconCheck, IconPencil } from '@posthog/icons'
import Link from 'components/Link'

interface ForumReplyCardProps {
    reply: ForumReply
    isInForum?: boolean
    questionAuthorId?: string | number
}

export default function ForumReplyCard({ reply, isInForum = false, questionAuthorId }: ForumReplyCardProps) {
    const [upvoted, setUpvoted] = useState(false)
    const [downvoted, setDownvoted] = useState(false)
    const [upvotes, setUpvotes] = useState(reply.upvotes || 0)
    const [downvotes, setDownvotes] = useState(reply.downvotes || 0)

    const handleUpvote = () => {
        if (upvoted) {
            setUpvotes(v => v - 1)
            setUpvoted(false)
        } else {
            setUpvotes(v => v + 1)
            setUpvoted(true)
            if (downvoted) {
                setDownvotes(v => v - 1)
                setDownvoted(false)
            }
        }
    }

    const handleDownvote = () => {
        if (downvoted) {
            setDownvotes(v => v - 1)
            setDownvoted(false)
        } else {
            setDownvotes(v => v + 1)
            setDownvoted(true)
            if (upvoted) {
                setUpvotes(v => v - 1)
                setUpvoted(false)
            }
        }
    }

    const isAuthor = questionAuthorId && reply.profile.id === questionAuthorId
    const isAI = reply.profile?.firstName?.toLowerCase().includes('ai')

    return (
        <div className="flex flex-col w-full text-primary mt-2">
            <div className={`pb-1 flex items-center space-x-2 ${isInForum ? 'pr-8' : ''}`}>
                <Link
                    to={`/profile/${reply.profile.firstName}`}
                    className="flex items-center text-primary hover:!underline !no-underline"
                >
                    <div className="mr-2 relative ml-[-2px]">
                        <ForumAvatar
                            className={`${isInForum ? 'size-[40px]' : 'size-[25px]'} rounded-full`}
                            image={reply.profile.avatar}
                            isTeamMember={isAI}
                        />
                    </div>
                    <strong>{reply.profile.firstName || 'Anonymous'}</strong>
                </Link>

                {isAuthor && (
                    <span className="bg-accent text-primary text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest ml-1">
                        Author
                    </span>
                )}
                {isAI && (
                    <span className="bg-accent text-primary text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest ml-1">
                        AI
                    </span>
                )}

                <ForumDays created={reply.createdAt} />

                <div className="!ml-auto flex items-center space-x-1 opacity-60 hover:opacity-100 transition-opacity">
                    <OSButton
                        size="sm"
                        tooltip="Edit reply"
                        onClick={() => { }}
                        icon={<IconPencil />}
                        className="!p-1"
                    />
                </div>
            </div>

            <div className={`border-l-0 ${isInForum ? 'pl-[calc(44px_+_.5rem)] pr-8 -mt-2' : 'ml-[33px]'} pl-0 pb-1`}>
                <div className="reply-content">
                    <ForumMarkdown>{reply.body}</ForumMarkdown>
                </div>

                <div className="flex items-center gap-1 mt-4">
                    <OSButton
                        onClick={handleUpvote}
                        size="md"
                        className={upvoted ? '!bg-green !text-primary !border-green' : ''}
                        icon={<IconThumbsUp className={upvoted ? '!text-primary' : ''} />}
                    >
                        <strong>{upvotes}</strong>
                    </OSButton>
                    <OSButton
                        onClick={handleDownvote}
                        size="md"
                        className={downvoted ? '!bg-red !text-primary !border-red' : ''}
                        icon={<IconThumbsDown className={downvoted ? '!text-primary' : ''} />}
                    >
                        <strong>{downvotes}</strong>
                    </OSButton>
                </div>
            </div>
        </div>
    )
}
