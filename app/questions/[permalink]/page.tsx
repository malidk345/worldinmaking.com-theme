"use client"

export const runtime = 'edge'

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
            fetchPosts(undefined, undefined)
        }
    }, [permalink, fetchPosts])

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
