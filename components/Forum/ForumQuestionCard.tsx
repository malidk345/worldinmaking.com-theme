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
import { IconPencil, IconArchive, IconUndo, IconTrash } from '@posthog/icons'
import ViewCounter from 'components/ViewCounter'
import VotePicker from 'components/VotePicker'
import ForumAvatar from './ForumAvatar'
import { supabase } from 'lib/supabase'
import { useAuth } from 'context/AuthContext'

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
    const { replies, fetchReplies, createReply, handleVote, deletePost, deleteReply } = useCommunity()
    const { isAdmin } = useAuth()
    const [isEditing, setIsEditing] = useState(false)
    const [userVote, setUserVote] = useState(0)
    const [totalVotes, setTotalVotes] = useState(question.upvotes || 0)

    useEffect(() => {
        if (expanded || isComment) {
            fetchReplies(question.id)
        }
    }, [expanded, isComment, question.id, fetchReplies])

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
            
            // Sync total votes from server
            const { data: aggregate } = await supabase.rpc('get_com_post_total_votes', { post_id_input: question.id })
            if (aggregate !== null) setTotalVotes(aggregate)
        }
        loadUserVote()
    }, [question.id])

    useEffect(() => {
        setTotalVotes(question.upvotes || 0)
    }, [question.upvotes])

    const handleVoteChange = async (direction: 'up' | 'down') => {
        const directionValue = direction === 'up' ? 1 : -1
        const nextVote = userVote === directionValue ? 0 : directionValue
        const voteDelta = nextVote - userVote

        // Optimistic update
        const prevUserVote = userVote
        setUserVote(nextVote)
        setTotalVotes(prev => prev + voteDelta)

        const success = await handleVote(question.id, direction)
        if (!success) {
            // Revert state if failed
            setUserVote(prevUserVote)
            setTotalVotes(prev => prev - voteDelta)
        } else {
            // After success, sync with server state to be sure
            const { data: aggregate } = await supabase.rpc('get_com_post_total_votes', { post_id_input: question.id })
            if (aggregate !== null) setTotalVotes(aggregate)
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

            <div className={`flex flex-wrap sm:flex-nowrap items-center w-full ${isComment ? 'gap-1.5' : 'space-x-2'} ${isInForum ? 'pt-3 sm:pt-5 pl-3 sm:pl-5 pr-3 sm:pr-8' : ''} ${!question.subject ? (isComment ? '-mb-1' : '-mb-2') : ''}`}>
                {isComment ? (
                    <Link
                        to={`/profile/${question.profile.firstName}`}
                        className="flex items-center text-primary hover:!underline !no-underline gap-1.5 shrink-0"
                    >
                        <ForumAvatar
                            className="size-[22px] rounded-full"
                            image={question.profile.avatar}
                        />
                        <strong className="text-xs">{question.profile.firstName || 'anonymous'}</strong>
                    </Link>
                ) : (
                    <ForumProfileBadge
                        profile={question.profile}
                        className={question.archived ? 'opacity-50' : ''}
                    />
                )}
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
                    className={`${isComment ? 'pb-2' : 'pb-4'} ${isComment ? 'pl-[30px]' : isInForum ? 'pl-3 sm:pl-[calc(2.5rem_+_30px)] pr-3 sm:pr-8 mt-2 sm:mt-0' : 'squeak-left-border ml-5 pl-[30px]'
                        }`}
                >
                    {question.subject && (
                        <h3 className={`font-semibold !m-0 pb-1 leading-5 ${isComment ? 'text-sm' : 'text-base'}`}>
                            <Link
                                to={`/questions/${question.permalink}`}
                                className="!no-underline hover:!underline font-semibold text-[#000080] dark:text-[#66b2ff]"
                            >
                                {question.subject}
                            </Link>
                        </h3>
                    )}

                    <div className={`question-content ${isComment ? 'text-sm [&_p]:!my-1 [&_p]:!text-sm' : ''}`}>
                        <ForumMarkdown>{question.body}</ForumMarkdown>
                    </div>

                    <div className={`flex items-center gap-2 ${isComment ? 'mt-1.5' : 'mt-4'}`}>
                        <VotePicker
                            count={totalVotes}
                            active={userVote !== 0}
                            onDecrement={() => handleVoteChange('down')}
                            onIncrement={() => handleVoteChange('up')}
                            size={isComment ? 'sm' : 'default'}
                        />
                        {!isComment && (
                            <ViewCounter 
                                idOrSlug={question.id} 
                                type="community" 
                                views={question.views || 0} 
                            />
                        )}
                        {isAdmin && (
                            <OSButton
                                size="sm"
                                onClick={() => {
                                    if (confirm('are you sure you want to delete this?')) {
                                        deletePost(question.id)
                                    }
                                }}
                                icon={<IconTrash />}
                                tooltip="delete"
                                className="!p-1 opacity-40 hover:opacity-100 hover:text-red-500"
                            />
                        )}
                    </div>
                </div>

                {/* Replies section */}
                {!isComment && (
                    <ForumReplies
                        replies={adaptedReplies}
                        question={question}
                        expanded={expanded}
                        onToggleExpanded={setExpanded}
                        isInForum={isInForum}
                    />
                )}

                {/* Comment-mode inline replies */}
                {isComment && adaptedReplies.length > 0 && (
                    <div className="pl-[30px] border-l border-black/10 dark:border-white/10 ml-[10px] mb-2">
                        {adaptedReplies.map((reply) => (
                            <div key={reply.id} className="flex flex-col py-1.5">
                                <div className="flex items-center gap-1.5">
                                    <Link
                                        to={`/profile/${reply.profile.firstName}`}
                                        className="flex items-center text-primary hover:!underline !no-underline gap-1 shrink-0"
                                    >
                                        <ForumAvatar className="size-[18px] rounded-full" image={reply.profile.avatar} />
                                        <strong className="text-[11px]">{reply.profile.firstName || 'anonymous'}</strong>
                                    </Link>
                                    <ForumDays created={reply.createdAt} />
                                    {isAdmin && (
                                        <button
                                            type="button"
                                            className="ml-auto text-muted hover:text-red-500 transition-colors"
                                            title="delete reply"
                                            onClick={() => {
                                                if (confirm('delete this reply?')) {
                                                    deleteReply(reply.id, question.id)
                                                }
                                            }}
                                        >
                                            <IconTrash className="size-3" />
                                        </button>
                                    )}
                                </div>
                                <div className="text-sm [&_p]:!my-0.5 [&_p]:!text-xs pl-[26px]">
                                    <ForumMarkdown>{reply.body}</ForumMarkdown>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Reply form */}
                {(
                    <div
                        className={`pb-1 relative w-full ${isComment
                            ? 'pl-[30px] ml-[10px] border-l border-black/10 dark:border-white/10'
                            : isInForum
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
                )}
            </div>
        </div>
    )
}
