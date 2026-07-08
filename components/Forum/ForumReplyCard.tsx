"use client"

import React, { useState, useEffect } from 'react'
import ForumDays from './ForumDays'
import ForumMarkdown from './ForumMarkdown'
import { ForumReply } from './types'
import ForumAvatar from './ForumAvatar'
import OSButton from 'components/OSButton'
import VotePicker from 'components/VotePicker'
import { IconPencil, IconTrash } from '@posthog/icons'
import Link from 'components/Link'
import { supabase } from 'lib/supabase'
import { useAuth } from 'context/AuthContext'
import { useCommunity } from 'hooks/useCommunity'

interface ForumReplyCardProps {
    reply: ForumReply
    postId: number | string
    isInForum?: boolean
    questionAuthorId?: string | number
    repliedToUsername?: string
}

export default function ForumReplyCard({ reply, postId, isInForum = false, questionAuthorId, repliedToUsername }: ForumReplyCardProps) {
    const { isAdmin } = useAuth()
    const { handleReplyVote, deleteReply } = useCommunity()
    const [userVote, setUserVote] = useState(0)
    const [totalVotes, setTotalVotes] = useState(reply.upvotes || 0)

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
        <div className="flex flex-col w-full text-primary mt-1">
            <div className={`pb-0 flex flex-wrap sm:flex-nowrap items-center space-x-2 ${isInForum ? 'pr-3 sm:pr-8' : ''}`}>
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

                {repliedToUsername && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700">
                        <span className="opacity-70">reply to</span>
                        <Link 
                            to={`/profile/${repliedToUsername}`} 
                            className="font-semibold text-blue-600 dark:text-blue-400 hover:opacity-80 transition-opacity !no-underline"
                        >
                            @{repliedToUsername}
                        </Link>
                    </span>
                )}

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

            <div className={`border-l-0 ${isInForum ? 'pl-[40px] sm:pl-[calc(44px_+_.5rem)] pr-3 sm:pr-8 md:-mt-3' : 'ml-[33px]'} pl-0 pb-0`}>
                <div className="reply-content">
                    <ForumMarkdown>{reply.body}</ForumMarkdown>
                </div>

                <div className="flex items-center gap-1 mt-2">
                    <VotePicker
                        count={totalVotes}
                        active={userVote !== 0}
                        onDecrement={() => handleVoteChange('down')}
                        onIncrement={() => handleVoteChange('up')}
                    />
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
            </div>
        </div>
    )
}
