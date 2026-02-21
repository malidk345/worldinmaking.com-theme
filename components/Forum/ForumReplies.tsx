"use client"

import React, { useState } from 'react'
import ForumReplyCard from './ForumReplyCard'
import { ForumReply, ForumQuestion } from './types'
import ForumAvatar from './ForumAvatar'

const Squiggle = ({ className }: { className: string }) => {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 19 11" className={`h-2 ${className}`}>
            <path d="m13.5 8.793 4.646-4.647.707.708-5.353 5.353-8.5-8.5-3.646 3.647-.708-.708L5 .293l8.5 8.5Z" fill="currentColor" />
        </svg>
    )
}

const Squiggles = ({ className = '' }: { className: string }) => {
    return (
        <div className="flex [&_svg]:ml-[-1.25px] mt-3">
            <Squiggle className={className} />
            <Squiggle className={className} />
            <Squiggle className={className} />
            <Squiggle className={className} />
            <Squiggle className={className} />
        </div>
    )
}

interface ForumRepliesProps {
    replies: ForumReply[]
    question: ForumQuestion
    expanded: boolean
    onToggleExpanded: (expanded: boolean) => void
    isInForum?: boolean
}

export default function ForumReplies({
    replies,
    question,
    expanded,
    onToggleExpanded,
    isInForum = false,
}: ForumRepliesProps) {
    if (!replies || replies.length === 0) return null

    const replyCount = replies.length
    const avatars = Array.from(new Set(replies.map(r => r.profile.avatar))).filter(Boolean).slice(0, 3)
    const shouldExpandInline = expanded || replyCount < 3

    return (
        <ul className={`${isInForum ? '' : 'ml-5'} !mb-0 p-0 list-none`}>
            {!shouldExpandInline ? (
                <>
                    <li className={`!mb-0 relative ${isInForum ? '' : 'pr-[5px] pl-[30px] border-l border-solid border-primary/20 squeak-left-border before:border-l-0'}`}>
                        {isInForum ? (
                            <div className="pb-4 justify-center !pl-0 flex items-center w-full relative before:content-[''] before:absolute before:top-[15px] before:left-0 before:w-full before:h-full before:border-t before:border-primary/20">
                                <div className="bg-primary flex justify-center -top-1/2 relative space-x-4 px-4">
                                    <Squiggles className="fill-border opacity-20" />
                                    <div className="flex items-center -space-x-2">
                                        {avatars.map((avatar, index) => (
                                            <ForumAvatar key={index} image={avatar as string} className="w-[25px] h-[25px] border-2 border-primary/40" />
                                        ))}
                                    </div>
                                    <button
                                        className="text-sm font-semibold text-primary hover:underline"
                                        onClick={() => onToggleExpanded(true)}
                                    >
                                        View {replyCount - 1} other {replyCount - 1 === 1 ? 'reply' : 'replies'}
                                    </button>
                                    <Squiggles className="fill-border opacity-20" />
                                </div>
                            </div>
                        ) : (
                            <div className="pb-8 -my-2 flex items-center space-x-4">
                                <div className="flex items-center -space-x-2">
                                    {avatars.map((avatar, index) => (
                                        <ForumAvatar key={index} image={avatar as string} className="w-[25px] h-[25px] border-2 border-primary/40" />
                                    ))}
                                </div>
                                <button
                                    className="text-sm font-semibold text-primary hover:underline"
                                    onClick={() => onToggleExpanded(true)}
                                >
                                    View {replyCount - 1} more {replyCount - 1 === 1 ? 'reply' : 'replies'}
                                </button>
                            </div>
                        )}
                    </li>
                    <li className={`pr-[5px] !mb-0 relative ${isInForum ? '' : 'pl-[30px] border-l border-solid border-primary/20 squeak-left-border before:border-l-0'}`}>
                        <ForumReplyCard reply={replies[replies.length - 1]} isInForum={isInForum} questionAuthorId={question.profile.id} />
                    </li>
                </>
            ) : (
                replies.map((reply) => (
                    <li
                        key={reply.id}
                        className={`pr-[5px] !mb-0 relative pb-4 border-primary/20 ${isInForum
                            ? 'border-t pt-4 px-5 first:border-t-0'
                            : 'border-l border-solid border-primary/20 squeak-left-border before:border-l-0 pl-[30px]'
                            }`}
                    >
                        <ForumReplyCard reply={reply} isInForum={isInForum} questionAuthorId={question.profile.id} />
                    </li>
                ))
            )}
        </ul>
    )
}
