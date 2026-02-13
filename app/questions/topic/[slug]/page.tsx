export const runtime = 'edge'

"use client"

import React, { useEffect } from 'react'
import { useParams } from 'next/navigation'
import ForumPageLayout from 'components/Forum/ForumPageLayout'
import { useCommunity } from 'hooks/useCommunity'

export default function TopicPage() {
    const params = useParams()
    const slug = params?.slug as string
    const { posts, loading, fetchPosts } = useCommunity()

    useEffect(() => {
        if (slug) {
            fetchPosts(undefined, slug)
        }
    }, [slug, fetchPosts])

    const adaptedPosts = posts.map(p => ({
        id: p.id,
        permalink: p.id.toString(),
        subject: p.title,
        body: p.content,
        createdAt: p.created_at,
        profile: {
            id: 0,
            firstName: p.profiles?.username || 'Anonymous',
            lastName: '',
            avatar: p.profiles?.avatar_url || null,
        },
        replies: [],
        topics: [],
        pinnedTopics: [],
        resolved: false,
        archived: false
    }))

    return (
        <ForumPageLayout
            questions={adaptedPosts as any}
            loading={loading}
            activeTopicSlug={slug}
            title={slug}
        />
    )
}
