"use client"

import React, { useEffect, useState } from 'react'
import ForumPageLayout from 'components/Forum/ForumPageLayout'
import { useCommunity } from 'hooks/useCommunity'

export default function QuestionsPage() {
    const {
        channels,
        posts,
        loading,
        fetchPosts,
        createPost
    } = useCommunity()

    const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null)

    useEffect(() => {
        if (channels.length > 0 && !selectedChannelId) {
            setSelectedChannelId(channels[0].id)
        }
    }, [channels])

    useEffect(() => {
        if (selectedChannelId) {
            fetchPosts(selectedChannelId)
        }
    }, [selectedChannelId, fetchPosts])

    const handleCreatePost = async (data: { subject: string; body: string }) => {
        if (selectedChannelId) {
            await createPost(selectedChannelId, data.subject, data.body)
        }
    }

    // Adapt Supabase posts to ForumQuestion type
    const adaptedPosts = posts.map(p => ({
        id: p.id,
        permalink: p.id.toString(),
        subject: p.title,
        body: p.content,
        createdAt: p.created_at,
        profile: {
            id: 0, // Profile ID mapping if needed
            firstName: p.profiles?.username || 'Anonymous',
            lastName: '',
            avatar: p.profiles?.avatar_url || null,
        },
        replies: [], // Will be handled by the card
        topics: [], // Mapping topics if needed
        pinnedTopics: [],
        resolved: false,
        archived: false,
        status: 'pending' // Default status
    }))

    return (
        <ForumPageLayout
            questions={adaptedPosts as any}
            loading={loading}
            activeChannelId={selectedChannelId}
            onChannelChange={setSelectedChannelId}
            onSubmit={handleCreatePost}
        />
    )
}
