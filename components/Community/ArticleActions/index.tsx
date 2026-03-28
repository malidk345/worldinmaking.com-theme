"use client"

import React, { useState, useEffect } from 'react'
import { useToast } from 'context/ToastContext'
import VotePicker from 'components/VotePicker'
import { Share2 } from 'lucide-react'
import { supabase } from 'lib/supabase'
import ViewCounter from 'components/ViewCounter'

interface ArticleActionsProps {
    slug?: string
    views?: number
}

export default function ArticleActions({ slug, views = 0 }: ArticleActionsProps) {
    const { addToast } = useToast()
    const [userVote, setUserVote] = useState(0)
    const [totalVotes, setTotalVotes] = useState(0)
    const [loading, setLoading] = useState(true)

    // Load votes from Supabase
    useEffect(() => {
        if (!slug) return

        const loadVotes = async () => {
            setLoading(true)
            try {
                // Get aggregate total weight for this slug
                const { data: aggregate } = await supabase
                    .rpc('get_post_total_votes', { post_slug_input: slug });

                if (aggregate !== null) {
                    setTotalVotes(aggregate)
                }

                // Get current user's vote
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    const { data } = await supabase
                        .from('post_votes')
                        .select('vote')
                        .eq('post_slug', slug)
                        .eq('user_id', user.id)
                        .maybeSingle()

                    if (data) setUserVote(data.vote)
                }
            } catch (err: unknown) {
                console.error('Error loading votes:', err)
            } finally {
                setLoading(false)
            }
        }

        loadVotes()
    }, [slug])

    const handleVoteChange = async (direction: 'up' | 'down') => {
        if (!slug) return

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            addToast('please log in to vote', 'error')
            return
        }

        const delta = direction === 'up' ? 1 : -1
        const nextVote = userVote + delta

        if (nextVote > 5 || nextVote < -5) {
            addToast(`you have reached the ${direction === 'up' ? 'maximum' : 'minimum'} vote limit`, 'warning')
            return
        }

        // Optimistic update
        const prevUserVote = userVote
        setUserVote(nextVote)
        setTotalVotes(prev => prev + delta)

        let error = null
        try {
            const { data: existing } = await supabase
                .from('post_votes')
                .select('vote')
                .eq('post_slug', slug)
                .eq('user_id', user.id)
                .maybeSingle()

            if (existing) {
                const { error: updateErr } = await supabase
                    .from('post_votes')
                    .update({ vote: nextVote })
                    .eq('post_slug', slug)
                    .eq('user_id', user.id)
                error = updateErr
            } else {
                const { error: insertErr } = await supabase
                    .from('post_votes')
                    .insert({ post_slug: slug, user_id: user.id, vote: nextVote })
                error = insertErr
            }
        } catch (err: unknown) {
            error = err
        }

        if (error) {
            console.error('Vote error:', error)
            const errMsg = (error as { message?: string }).message?.toLowerCase() || 'unknown error'
            addToast(`failed to save vote: ${errMsg}`, 'error')
            // Rollback
            setUserVote(prevUserVote)
            setTotalVotes(prev => prev - delta)
        }
    }

    const handleShare = async (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault()
            e.stopPropagation()
        }
        if (typeof window === 'undefined') return
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(window.location.href)
                addToast('link copied to clipboard!', 'success')
            } else {
                const textArea = document.createElement("textarea")
                textArea.value = window.location.href
                textArea.style.position = "fixed"
                textArea.style.left = "-999999px"
                document.body.appendChild(textArea)
                textArea.focus()
                textArea.select()
                document.execCommand('copy')
                addToast('link copied to clipboard!', 'success')
                document.body.removeChild(textArea)
            }
        } catch {
            addToast('failed to copy link', 'error')
        }
    }

    const displayCount = totalVotes

    return (
        <div className="flex justify-between items-center mb-6 pt-4 border-t border-black/10 dark:border-white/10 pb-4">
            <div className="flex items-center gap-3">
                <VotePicker
                    count={displayCount}
                    active={userVote !== 0}
                    onDecrement={() => handleVoteChange('down')}
                    onIncrement={() => handleVoteChange('up')}
                    disabled={!slug || loading}
                />
                {slug && (
                    <ViewCounter 
                        idOrSlug={slug} 
                        type="blog" 
                        views={views} 
                    />
                )}
            </div>

            <div
                role="button"
                tabIndex={0}
                onClick={handleShare}
                onKeyDown={(e) => e.key === 'Enter' && handleShare()}
                className="vote-picker p-2 flex items-center justify-center cursor-pointer"
                title="share link"
            >
                <Share2 className="size-3.5" />
            </div>
        </div>
    )
}
