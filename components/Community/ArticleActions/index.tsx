"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { useToast } from 'context/ToastContext'
import OSButton from 'components/OSButton'
import { IconThumbsUp, IconThumbsDown } from '@posthog/icons'
import { Share2 } from 'lucide-react'

interface ArticleActionsProps {
    slug?: string
}

export default function ArticleActions({ slug }: ArticleActionsProps) {
    const { addToast } = useToast()

    // Deterministic random generator based on slug
    const { initialUpvotes, initialDownvotes } = useMemo(() => {
        if (!slug) return { initialUpvotes: 12, initialDownvotes: 0 }

        // Simple string hash
        let hash = 0
        for (let i = 0; i < slug.length; i++) {
            const char = slug.charCodeAt(i)
            hash = ((hash << 5) - hash) + char
            hash = hash & hash // Convert to 32bit integer
        }

        const absHash = Math.abs(hash)
        // Let's give it a baseline between 10 and 150 upvotes
        const baseUp = (absHash % 140) + 10
        // Very few downvotes
        const baseDown = (absHash % 3)

        return { initialUpvotes: baseUp, initialDownvotes: baseDown }
    }, [slug])

    const [upvoted, setUpvoted] = useState(false)
    const [downvoted, setDownvoted] = useState(false)
    const [tempUp, setTempUp] = useState(0)
    const [tempDown, setTempDown] = useState(0)

    // Load saved vote state off localStorage
    useEffect(() => {
        if (!slug) return
        const savedVote = localStorage.getItem(`article_vote_${slug}`)
        if (savedVote === 'up') {
            setUpvoted(true)
            setTempUp(1)
        } else if (savedVote === 'down') {
            setDownvoted(true)
            setTempDown(1)
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

            if (downvoted) {
                setTempDown(0)
                setDownvoted(false)
            }
        }
    }

    const handleDownvote = () => {
        if (!slug) return

        if (downvoted) {
            setTempDown(0)
            setDownvoted(false)
            localStorage.removeItem(`article_vote_${slug}`)
        } else {
            setTempDown(1)
            setDownvoted(true)
            localStorage.setItem(`article_vote_${slug}`, 'down')

            if (upvoted) {
                setTempUp(0)
                setUpvoted(false)
            }
        }
    }

    const handleShare = () => {
        if (typeof window !== 'undefined') {
            navigator.clipboard.writeText(window.location.href)
            addToast('link copied to clipboard!', 'success')
        }
    }

    const displayUpvotes = initialUpvotes + tempUp
    const displayDownvotes = initialDownvotes + tempDown

    return (
        <div className="flex justify-between items-center mb-6 pt-4 border-t border-black/10 dark:border-white/10 pb-4">
            <div className="flex items-center gap-1">
                <OSButton
                    onClick={handleUpvote}
                    size="md"
                    className={upvoted ? '!bg-green !text-primary !border-green' : ''}
                    icon={<IconThumbsUp className={upvoted ? '!text-primary' : ''} />}
                >
                    <strong>{displayUpvotes}</strong>
                </OSButton>
                <OSButton
                    onClick={handleDownvote}
                    size="md"
                    className={downvoted ? '!bg-red !text-primary !border-red' : ''}
                    icon={<IconThumbsDown className={downvoted ? '!text-primary' : ''} />}
                >
                    <strong>{displayDownvotes}</strong>
                </OSButton>
            </div>

            <OSButton
                onClick={handleShare}
                size="md"
                icon={<Share2 className="size-4" />}
            >
                <strong className="lowercase">share</strong>
            </OSButton>
        </div>
    )
}
