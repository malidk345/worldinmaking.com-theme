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
}

export default function ForumReplyCard({ reply, isInForum = false }: ForumReplyCardProps) {
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

    const isAI = reply.profile?.firstName === 'AI Responder'

    return (
        <div className="flex flex-col w-full text-primary mt-2">
            <div className={`pb-1 flex items-center space-x-2 ${isInForum ? 'pr-8' : ''}`}>
                <Link
                    to={`/community/profiles/${reply.profile.id}`}
                    className="flex items-center !text-primary hover:!underline !no-underline"
                >
                    <div className="mr-2 relative ml-[-2px]">
                        <ForumAvatar
                            className={`${isInForum ? 'size-[40px]' : 'size-[25px]'} rounded-full`}
                            image={reply.profile.avatar}
                        />
                    </div>
                    <strong className="text-primary">{reply.profile.firstName || 'Anonymous'}</strong>
                </Link>
                <ForumDays created={reply.createdAt} />

                <div className="!ml-auto flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                        icon={<IconThumbsUp className={upvoted ? 'text-green' : ''} />}
                        size="md"
                        className={upvoted ? '!bg-green/10 !border-green/50' : ''}
                    >
                        <strong>{upvotes}</strong>
                    </OSButton>
                    <OSButton
                        onClick={handleDownvote}
                        icon={<IconThumbsDown className={downvoted ? 'text-red' : ''} />}
                        size="md"
                        className={downvoted ? '!bg-red/10 !border-red/50' : ''}
                    >
                        <strong>{downvotes}</strong>
                    </OSButton>
                </div>
            </div>
        </div>
    )
}
