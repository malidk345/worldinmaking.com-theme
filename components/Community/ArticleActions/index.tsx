"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { useToast } from 'context/ToastContext'
import VotePicker from 'components/VotePicker'
import { Share2 } from 'lucide-react'

interface ArticleActionsProps {
    slug?: string
}

export default function ArticleActions({ slug }: ArticleActionsProps) {
    const { addToast } = useToast()

    // Deterministic random generator based on slug
    const { initialUpvotes } = useMemo(() => {
        if (!slug) return { initialUpvotes: 12 }

        // Simple string hash
        let hash = 0
        for (let i = 0; i < slug.length; i++) {
            const char = slug.charCodeAt(i)
            hash = ((hash << 5) - hash) + char
            hash = hash & hash // Convert to 32bit integer
        }

        const absHash = Math.abs(hash)
        const baseUp = (absHash % 140) + 10

        return { initialUpvotes: baseUp }
    }, [slug])

    const [upvoted, setUpvoted] = useState(false)
    const [tempUp, setTempUp] = useState(0)

    // Load saved vote state off localStorage
    useEffect(() => {
        if (!slug) return
        const savedVote = localStorage.getItem(`article_vote_${slug}`)
        if (savedVote === 'up') {
            setUpvoted(true)
            setTempUp(1)
        }
    }, [slug])

    const handleUpvote = () => {
        if (!slug) return
        if (upvoted) {
            setTempUp(0)
            setUpvoted(false)
            localStorage.removeItem(`article_vote_${slug}`)
        } else {
            setTempUp(1)
            setUpvoted(true)
            localStorage.setItem(`article_vote_${slug}`, 'up')
        }
    }

    const handleShare = async () => {
        if (typeof window === 'undefined') return

        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(window.location.href)
                addToast('link copied to clipboard!', 'success')
            } else {
                // Fallback for non-secure contexts (like plain http localhost)
                const textArea = document.createElement("textarea")
                textArea.value = window.location.href
                textArea.style.position = "fixed"
                textArea.style.left = "-999999px"
                document.body.appendChild(textArea)
                textArea.focus()
                textArea.select()

                try {
                    document.execCommand('copy')
                    addToast('link copied to clipboard!', 'success')
                } catch (err) {
                    console.error('Fallback copy failed', err)
                    addToast('Failed to copy link', 'error')
                }

                document.body.removeChild(textArea)
            }
        } catch (err) {
            console.error('Share failed', err)
            addToast('Failed to copy link', 'error')
        }
    }

    const displayUpvotes = initialUpvotes + tempUp

    return (
        <div className="flex justify-between items-center mb-6 pt-4 border-t border-black/10 dark:border-white/10 pb-4">
            <div className="flex items-center gap-2">
                <VotePicker
                    count={displayUpvotes}
                    active={upvoted}
                    onDecrement={() => { if (upvoted) handleUpvote() }}
                    onIncrement={() => { if (!upvoted) handleUpvote() }}
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
