"use client"

import React, { useEffect } from 'react'
import { useParams } from 'next/navigation'
import ForumQuestionDetail from 'components/Forum/ForumQuestionDetail'
import { useCommunity } from 'hooks/useCommunity'
import Link from 'components/Link'
import { ArrowLeft } from 'lucide-react'

export default function QuestionPermalinkPage() {
    const params = useParams()
    const permalink = params?.permalink as string
    const { posts, loading, fetchPosts } = useCommunity()

    useEffect(() => {
        if (permalink) {
            // If permalink is an ID, we'll need to fetch carefully. 
            // In our system, we might need a fetchById or just use posts list.
            // For now, let's assume fetchPosts handles it or we filter.
            fetchPosts(undefined, undefined) // Just fetch everything for now or add ID support
        }
    }, [permalink, fetchPosts])

    // Find the specific post in the posts array
    const post = posts.find(p => p.id.toString() === permalink)

    if (loading && !post) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-20 text-center opacity-20 italic">
                syncing discussion...
            </div>
        )
    }

    if (!post) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-12 text-center">
                <h1 className="text-xl font-bold text-black lowercase mb-4">Node not found</h1>
                <Link
                    to="/questions"
                    className="flex items-center justify-center text-sm text-burnt-orange hover:underline !no-underline"
                >
                    <ArrowLeft className="size-4 mr-1" />
                    back to transmissions
                </Link>
            </div>
        )
    }

    // Adapt to ForumQuestion
    const adaptedQuestion = {
        id: post.id,
        permalink: post.id.toString(),
        subject: post.title,
        body: post.content,
        createdAt: post.created_at,
        profile: {
            id: 0,
            firstName: post.profiles?.username || 'Anonymous',
            lastName: '',
            avatar: post.profiles?.avatar_url || null,
        },
        replies: [],
        topics: [],
        pinnedTopics: [],
        resolved: false,
        archived: false
    }

    return <ForumQuestionDetail question={adaptedQuestion as any} />
}
