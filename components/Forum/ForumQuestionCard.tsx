"use client"

import React, { useState, useEffect } from 'react'
import ForumProfileBadge from './ForumProfileBadge'
import ForumDays from './ForumDays'
import ForumMarkdown from './ForumMarkdown'
import ForumReplies from './ForumReplies'
import ForumReplyForm from './ForumReplyForm'
import { ForumQuestion, ForumReply } from './types'
import Link from 'components/Link'
import OSButton from 'components/OSButton'
import { IconPencil, IconArchive, IconUndo } from '@posthog/icons'
import VotePicker from 'components/VotePicker'
import { supabase } from 'lib/supabase'

import { useCommunity } from 'hooks/useCommunity'

interface ForumQuestionCardProps {
    question: ForumQuestion
    isInForum?: boolean
    expanded?: boolean
    isComment?: boolean
}

export default function ForumQuestionCard({
    question,
    isInForum = false,
    expanded: initialExpanded = false,
    isComment = false,
}: ForumQuestionCardProps) {
    const [expanded, setExpanded] = useState(initialExpanded)
    const { replies, fetchReplies, createReply, handleVote } = useCommunity()
    const [isEditing, setIsEditing] = useState(false)
    const [userVote, setUserVote] = useState(0)
    const [totalVotes, setTotalVotes] = useState(question.upvotes || 0)

    useEffect(() => {
        if (expanded) {
            fetchReplies(question.id)
        }
    }, [expanded, question.id, fetchReplies])

    // Load user vote from Supabase
    useEffect(() => {
        const loadUserVote = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data } = await supabase
                .from('community_post_votes')
                .select('vote')
                .eq('post_id', question.id)
                .eq('user_id', user.id)
                .maybeSingle()

            if (data) setUserVote(data.vote)
        }
        loadUserVote()
    }, [question.id])

    const handleVoteChange = async (direction: 'up' | 'down') => {
        const success = await handleVote(question.id, direction)
        if (success) {
            const delta = direction === 'up' ? 1 : -1
            setUserVote(prev => prev + delta)
            setTotalVotes(prev => prev + delta)
        }
    }

    const handleReplySubmit = async (content: string) => {
        await createReply(question.id, content)
    }

    // Adapt Supabase replies to ForumReply type
    const adaptedReplies: ForumReply[] = (replies || []).map(r => ({
        id: r.id,
        body: r.content,
        createdAt: r.created_at,
        profile: {
            id: r.profiles?.id || 0,
            firstName: r.profiles?.username || 'anonymous',
            lastName: '',
            avatar: r.profiles?.avatar_url || null
        },
        upvotes: r.upvotes || 0,
        downvotes: 0
    }))

    return (
        <div className="flex flex-col w-full text-primary">
            {question.archived && (
                <div
                    data-scheme="secondary"
                    className="m-4 mb-0 bg-primary border border-black p-4 rounded text-center"
                >
                    <p className="font-bold text-base !m-0 !p-0 lowercase">the following thread has been archived.</p>
                    <p className="!text-sm !m-0 text-balance opacity-60 lowercase">
                        it&apos;s likely out of date, no longer relevant, or the answer has been added to our documentation.
                    </p>
                </div>
            )}

            <div className={`flex flex-wrap sm:flex-nowrap items-center space-x-2 w-full ${isInForum ? 'pt-3 sm:pt-5 pl-3 sm:pl-5 pr-3 sm:pr-8' : ''} ${!question.subject ? '-mb-2' : ''}`}>
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
                            tooltip="edit post"
                            className="!p-1.5 opacity-60 hover:opacity-100 hidden sm:flex"
                        />
                        <OSButton
                            onClick={() => { }} // Handle archive toggle
                            icon={question.archived ? <IconUndo /> : <IconArchive />}
                            size="md"
                            tooltip={question.archived ? 'restore thread' : 'archive thread'}
                            className="!p-1.5 opacity-60 hover:opacity-100 hidden sm:flex"
                        />
                    </div>
                )}
            </div>

            <div className={question.archived ? 'opacity-50' : ''}>
                <div
                    className={`pb-4 ${isComment ? '' : isInForum ? 'pl-3 sm:pl-[calc(2.5rem_+_30px)] pr-3 sm:pr-8 mt-2 sm:mt-0' : 'squeak-left-border ml-5 pl-[30px]'
                        }`}
                >
                    {question.subject && (
                        <h3 className="text-base font-semibold !m-0 pb-1 leading-5">
                            <Link
                                to={`/questions/${question.permalink}`}
                                className="!no-underline hover:!underline font-semibold text-[#000080] dark:text-[#66b2ff]"
                            >
                                {question.subject}
                            </Link>
                        </h3>
                    )}

                    <div className="question-content">
                        <ForumMarkdown>{question.body}</ForumMarkdown>
                    </div>

                    <div className="flex items-center gap-1 mt-4">
                        <VotePicker
                            count={totalVotes}
                            active={userVote !== 0}
                            onDecrement={() => handleVoteChange('down')}
                            onIncrement={() => handleVoteChange('up')}
                        />
                    </div>
                </div>

                {!isComment && (
                    <>
                        <ForumReplies
                            replies={adaptedReplies}
                            question={question}
                            expanded={expanded}
                            onToggleExpanded={setExpanded}
                            isInForum={isInForum}
                        />

                        <div
                            className={`pb-1 relative w-full ${isInForum
                                ? 'bg-primary border-t border-primary/20 pt-4 px-3 sm:px-4'
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
