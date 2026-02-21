"use client"

import React, { useState } from 'react'
import ForumProfileBadge from './ForumProfileBadge'
import ForumDays from './ForumDays'
import ForumMarkdown from './ForumMarkdown'
import ForumReplies from './ForumReplies'
import ForumReplyForm from './ForumReplyForm'
import { ForumQuestion } from './types'
import Link from 'components/Link'
import OSButton from 'components/OSButton'
import { IconPencil, IconArchive, IconUndo } from '@posthog/icons'

import { useCommunity } from 'hooks/useCommunity'

interface ForumQuestionCardProps {
    question: ForumQuestion
    isInForum?: boolean
    showSlug?: boolean
    expanded?: boolean
    isComment?: boolean
}

export default function ForumQuestionCard({
    question,
    isInForum = false,
    showSlug = false,
    expanded: initialExpanded = false,
    isComment = false,
}: ForumQuestionCardProps) {
    const [expanded, setExpanded] = useState(initialExpanded)
    const { replies, fetchReplies, createReply } = useCommunity()
    const [isEditing, setIsEditing] = useState(false)

    React.useEffect(() => {
        if (expanded) {
            fetchReplies(question.id)
        }
    }, [expanded, question.id, fetchReplies])

    const handleReplySubmit = async (content: string) => {
        await createReply(question.id, content)
    }

    // Adapt Supabase replies to ForumReply type
    const adaptedReplies = (replies || []).map(r => ({
        id: r.id,
        body: r.content,
        createdAt: r.created_at,
        profile: {
            id: r.profiles?.id || 0,
            firstName: r.profiles?.username || 'Anonymous',
            lastName: '',
            avatar: r.profiles?.avatar_url || null
        },
        upvotes: 0,
        downvotes: 0
    }))

    return (
        <div className="flex flex-col w-full text-primary">
            {question.archived && (
                <div
                    data-scheme="secondary"
                    className="m-4 mb-0 bg-primary border border-black p-4 rounded text-center"
                >
                    <p className="font-bold text-base !m-0 !p-0">The following thread has been archived.</p>
                    <p className="!text-sm !m-0 text-balance opacity-60">
                        It&apos;s likely out of date, no longer relevant, or the answer has been added to our documentation.
                    </p>
                </div>
            )}

            <div className={`flex items-center space-x-2 w-full ${isInForum ? 'pt-5 pl-5 pr-8' : ''} ${!question.subject ? '-mb-2' : ''}`}>
                <ForumProfileBadge
                    profile={question.profile}
                    className={question.archived ? 'opacity-50' : ''}
                />
                <ForumDays
                    created={question.createdAt}
                    profile={question.profile}
                />
                {!isComment && (
                    <div className="!ml-auto flex items-center space-x-px">
                        <OSButton
                            onClick={() => setIsEditing(!isEditing)}
                            icon={<IconPencil />}
                            size="md"
                            tooltip="Edit post"
                            className="!p-1.5 opacity-60 hover:opacity-100"
                        />
                        <OSButton
                            onClick={() => { }} // Handle archive toggle
                            icon={question.archived ? <IconUndo /> : <IconArchive />}
                            size="md"
                            tooltip={question.archived ? 'Restore thread' : 'Archive thread'}
                            className="!p-1.5 opacity-60 hover:opacity-100"
                        />
                    </div>
                )}
            </div>

            <div className={question.archived ? 'opacity-50' : ''}>
                <div
                    className={`pb-4 ${isComment ? '' : isInForum ? 'pl-[calc(2.5rem_+_30px)] pr-8' : 'squeak-left-border ml-5 pl-[30px]'
                        }`}
                >
                    {question.subject && (
                        <h3 className="text-base font-semibold !m-0 pb-1 leading-5">
                            <Link
                                to={`/questions/${question.permalink}`}
                                className="!no-underline hover:!underline font-semibold text-red dark:text-yellow"
                            >
                                {question.subject}
                            </Link>
                        </h3>
                    )}

                    <div className="question-content">
                        <ForumMarkdown>{question.body}</ForumMarkdown>
                    </div>
                </div>

                {!isComment && (
                    <>
                        <ForumReplies
                            replies={adaptedReplies as any}
                            question={question}
                            expanded={expanded}
                            onToggleExpanded={setExpanded}
                            isInForum={isInForum}
                        />

                        <div
                            className={`pb-1 relative w-full ${isInForum
                                ? 'bg-primary border-t border-primary/20 pt-4 px-4'
                                : 'ml-5 pl-8 pr-5 squeak-left-border'
                                } ${question.archived ? 'opacity-25 pointer-events-none' : ''}`}
                        >
                            <ForumReplyForm
                                archived={question.archived}
                                isInForum={isInForum}
                                onSubmit={handleReplySubmit}
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
