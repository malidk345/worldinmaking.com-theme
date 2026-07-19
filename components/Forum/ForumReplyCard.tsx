"use client"

import React, { useState, useEffect } from 'react'
import ForumDays from './ForumDays'
import ForumMarkdown from './ForumMarkdown'
import { ForumReply } from './types'
import ForumAvatar from './ForumAvatar'
import OSButton from 'components/OSButton'
import VotePicker from 'components/VotePicker'
import { IconPencil, IconTrash, IconMessage } from '@posthog/icons'
import Link from 'components/Link'
import { supabase } from 'lib/supabase'
import { useAuth } from 'context/AuthContext'
import { useCommunity } from 'hooks/useCommunity'
import ForumReplyForm from './ForumReplyForm'
import ForumThoughts from './ForumThoughts'

interface ForumReplyCardProps {
    reply: ForumReply
    postId: number | string
    isInForum?: boolean
    questionAuthorId?: string | number
    repliedToUsername?: string
}

export default function ForumReplyCard({ reply, postId, isInForum = false, questionAuthorId, repliedToUsername }: ForumReplyCardProps) {
    const { isAdmin, profile } = useAuth()
    const { handleReplyVote, deleteReply, createReply } = useCommunity()
    const [userVote, setUserVote] = useState(0)
    const [totalVotes, setTotalVotes] = useState(reply.upvotes || 0)
    const [isReplying, setIsReplying] = useState(false)

    // Load saved vote state from Supabase
    useEffect(() => {
        const loadUserVote = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data } = await supabase
                .from('community_reply_votes')
                .select('vote')
                .eq('reply_id', reply.id)
                .eq('user_id', user.id)
                .maybeSingle()

            if (data) setUserVote(data.vote)
        }
        loadUserVote()
    }, [reply.id])

    useEffect(() => {
        setTotalVotes(reply.upvotes || 0)
    }, [reply.upvotes])

    const handleVoteChange = async (direction: 'up' | 'down') => {
        const directionValue = direction === 'up' ? 1 : -1
        const nextVote = userVote === directionValue ? 0 : directionValue
        const voteDelta = nextVote - userVote

        // Optimistic update
        const prevUserVote = userVote
        setUserVote(nextVote)
        setTotalVotes(prev => prev + voteDelta)

        const success = await handleReplyVote(reply.id, postId, direction)

        if (!success) {
            setUserVote(prevUserVote)
            setTotalVotes(prev => prev - voteDelta)
        } else {
            // After success, sync with server state to be sure
            const { data: aggregate } = await supabase.rpc('get_com_reply_total_votes', { reply_id_input: reply.id })
            if (aggregate !== null) setTotalVotes(aggregate)
        }
    }

    const isAuthor = questionAuthorId && reply.profile.id === questionAuthorId
    const isAI = reply.profile?.firstName?.toLowerCase().includes('ai')

    return (
        <div className={`flex flex-col w-full text-primary ${isInForum ? 'mt-1 mb-2' : 'mt-1'}`}>
            <div className={`pb-0 flex flex-wrap sm:flex-nowrap items-center space-x-2 ${isInForum ? 'pr-3 sm:pr-8' : ''}`}>
                <Link
                    to={`/profile/${reply.profile.firstName}`}
                    className="flex items-center text-primary hover:!underline !no-underline"
                >
                    {!isInForum && (
                        <div className="mr-2 relative ml-[-2px]">
                            <ForumAvatar
                                className="size-[25px] rounded-full"
                                image={reply.profile.avatar}
                                isTeamMember={isAI}
                            />
                        </div>
                    )}
                    <strong>{reply.profile.firstName || 'anonymous'}</strong>
                </Link>

                {repliedToUsername && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-white/40 dark:bg-black/30 backdrop-blur-[2px] text-primary/80 px-2.5 py-0.5 rounded-full border border-primary/10 shadow-sm shadow-black/[0.02] font-mono">
                        <span className="opacity-60 lowercase font-mono">reply to</span>
                        <Link 
                            to={`/profile/${repliedToUsername}`} 
                            className="font-bold text-[#000080] dark:text-[#66b2ff] hover:opacity-80 transition-opacity !no-underline lowercase font-mono"
                        >
                            @{repliedToUsername}
                        </Link>
                    </span>
                )}

                {isAuthor && (
                    <span className="bg-accent text-primary text-[10px] px-1.5 py-0.5 rounded-[14px] font-bold lowercase tracking-widest ml-1">
                        author
                    </span>
                )}
                {isAI && (
                    <span className="bg-accent text-primary text-[10px] px-1.5 py-0.5 rounded-[14px] font-bold lowercase tracking-widest ml-1">
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

            <div className={`border-l-0 ${isInForum ? 'pl-0 pr-3 sm:pr-8' : 'ml-[33px]'} pl-0 pb-0 mt-1`}>
                <div className="reply-content">
                    {reply.innerThoughts && (
                        <ForumThoughts thoughts={reply.innerThoughts} />
                    )}
                    <ForumMarkdown>{reply.body}</ForumMarkdown>
                </div>

                <div className="flex items-center gap-1 mt-2">
                    <VotePicker
                        count={totalVotes}
                        active={userVote !== 0}
                        onDecrement={() => handleVoteChange('down')}
                        onIncrement={() => handleVoteChange('up')}
                    />
                    <OSButton
                        size="sm"
                        tooltip="reply"
                        onClick={() => setIsReplying(!isReplying)}
                        icon={<IconMessage className="w-3.5 h-3.5" />}
                        className="!p-1 text-xs opacity-60 hover:opacity-100 font-bold lowercase flex items-center gap-1"
                    >
                        reply
                    </OSButton>
                    {isAdmin && (
                        <OSButton
                            size="sm"
                            tooltip="delete reply"
                            onClick={() => {
                                if (confirm('delete this reply?')) {
                                    deleteReply(reply.id, postId)
                                }
                            }}
                            icon={<IconTrash />}
                            className="!p-1 opacity-40 hover:opacity-100 hover:text-red-500"
                        />
                    )}
                </div>

                {isReplying && (
                    isInForum ? (
                        <div className="mt-3 relative ml-[-52px] w-[calc(100%+52px)] flex gap-3 pt-2">
                            <div className="w-[40px] shrink-0 flex justify-center items-start pt-1.5">
                                <ForumAvatar
                                    className="size-8 rounded-full border border-black/10 dark:border-white/10 bg-white dark:bg-[#121214]"
                                    image={profile?.avatar_url}
                                />
                            </div>
                            <div className="flex-grow min-w-0">
                                <ForumReplyForm
                                    isInForum={true}
                                    initialValue={`@${reply.profile.firstName || 'anonymous'} `}
                                    onSubmit={async (content) => {
                                        await createReply(postId, content)
                                        setIsReplying(false)
                                    }}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="mt-3 pt-2">
                            <ForumReplyForm
                                isInForum={false}
                                initialValue={`@${reply.profile.firstName || 'anonymous'} `}
                                onSubmit={async (content) => {
                                    await createReply(postId, content)
                                    setIsReplying(false)
                                }}
                            />
                        </div>
                    )
                )}
            </div>
        </div>
    )
}
