"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { useToast } from 'context/ToastContext'
import VotePicker from 'components/VotePicker'
import { Share2 } from 'lucide-react'
import { supabase } from 'lib/supabase'

interface ArticleActionsProps {
    slug?: string
}

export default function ArticleActions({ slug }: ArticleActionsProps) {
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
            } catch (err) {
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

        const { error } = await supabase
            .from('post_votes')
            .upsert({
                post_slug: slug,
                user_id: user.id,
                vote: nextVote,
                updated_at: new Date().toISOString()
            }, { onConflict: 'post_slug,user_id' })

        if (error) {
            console.error('Vote error:', error)
            addToast('failed to save vote', 'error')
            // Rollback
            setUserVote(prevUserVote)
            setTotalVotes(prev => prev - delta)
        }
    }

    const handleShare = async () => {
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
            <div className="flex items-center gap-2">
                <VotePicker
                    count={displayCount}
                    active={userVote !== 0}
                    onDecrement={() => handleVoteChange('down')}
                    onIncrement={() => handleVoteChange('up')}
                    disabled={!slug || loading}
                />
            </div>

            <button
                type="button"
                onClick={handleShare}
                className="vote-picker"
                style={{ paddingInline: '0.75rem', gap: '0.4rem', cursor: 'pointer' }}
            >
                <Share2 style={{ width: 13, height: 13, flexShrink: 0 }} />
                <strong style={{ fontSize: '0.8125rem', letterSpacing: '-0.01em' }} className="lowercase">share</strong>
            </button>
        </div>
    )
}
