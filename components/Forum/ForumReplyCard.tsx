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
import { useToast } from 'context/ToastContext'
import { useAuth } from 'context/AuthContext'
import { useCommunity } from 'hooks/useCommunity'

interface ForumReplyCardProps {
    reply: ForumReply
    isInForum?: boolean
    questionAuthorId?: string | number
}

export default function ForumReplyCard({ reply, isInForum = false, questionAuthorId }: ForumReplyCardProps) {
    const { addToast } = useToast()
    const { isAdmin } = useAuth()
    const { deleteReply } = useCommunity()
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

            // Also refresh total votes for accuracy
            const { data: aggregate } = await supabase.rpc('get_com_reply_total_votes', { reply_id_input: reply.id })
            if (aggregate !== null) setTotalVotes(aggregate)
        }
        loadUserVote()
    }, [reply.id])

    useEffect(() => {
        setTotalVotes(reply.upvotes || 0)
    }, [reply.upvotes])

    const handleVoteChange = async (direction: 'up' | 'down') => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            addToast('please log in to vote', 'error')
            return
        }

        const directionValue = direction === 'up' ? 1 : -1
        const nextVote = userVote === directionValue ? 0 : directionValue
        const voteDelta = nextVote - userVote

        // Optimistic update
        const prevUserVote = userVote
        setUserVote(nextVote)
        setTotalVotes(prev => prev + voteDelta)

        // Check if row exists instead of relying on ON CONFLICT
        const { data: existing } = await supabase
            .from('community_reply_votes')
            .select('vote')
            .eq('reply_id', reply.id)
            .eq('user_id', user.id)
            .maybeSingle()

        let error = null
        if (existing) {
            const updateRes = await supabase
                .from('community_reply_votes')
                .update({ vote: nextVote, updated_at: new Date().toISOString() })
                .eq('reply_id', reply.id)
                .eq('user_id', user.id)
            error = updateRes.error
        } else {
            const insertRes = await supabase
                .from('community_reply_votes')
                .insert({ reply_id: reply.id, user_id: user.id, vote: nextVote, updated_at: new Date().toISOString() })
            error = insertRes.error
        }

        if (error) {
            setUserVote(prevUserVote)
            setTotalVotes(prev => prev - voteDelta)
            addToast(`failed to save vote: ${error.message}`, 'error')
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
                    {isAdmin && (
                        <OSButton
                            size="sm"
                            tooltip="delete reply"
                            onClick={() => {
                                if (confirm('delete this reply?')) {
                                    deleteReply(reply.id, reply.id)
                                }
                            }}
                            icon={<IconTrash />}
                            className="!p-1 hover:text-red-500"
                        />
                    )}
                </div>
            </div>

            <div className={`border-l-0 ${isInForum ? 'pl-[40px] sm:pl-[calc(44px_+_.5rem)] pr-3 sm:pr-8 md:-mt-2' : 'ml-[33px]'} pl-0 pb-1`}>
                <div className="reply-content">
                    <ForumMarkdown>{reply.body}</ForumMarkdown>
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
        </div>
    )
}
