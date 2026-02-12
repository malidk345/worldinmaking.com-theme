"use client"

import React, { useEffect } from 'react'
import ForumQuestionCard from './ForumQuestionCard'
import ForumQuestionForm from './ForumQuestionForm'
import { useCommunity } from 'hooks/useCommunity'

interface CommentsProps {
    slug?: string
    className?: string
    title?: string
}

export default function Comments({
    slug,
    className = '',
}: CommentsProps) {
    const {
        posts,
        loading,
        fetchPosts,
        createPost
    } = useCommunity()

    useEffect(() => {
        if (slug) {
            fetchPosts(undefined, slug)
        }
    }, [slug, fetchPosts])

    const handleCreatePost = async (data: { subject: string; body: string }) => {
        if (slug) {
            await createPost(undefined, data.subject || `transmission_${slug}`, data.body, slug)
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
            id: 0,
            firstName: p.profiles?.username || 'anonymous',
            lastName: '',
            avatar: p.profiles?.avatar_url || null,
        },
        replies: [],
        topics: [],
        pinnedTopics: [],
    }))

    return (
        <div className={`mt-20 pt-10 border-t border-black/[0.03] ${className}`}>
            <div className="flex items-center justify-between mb-8 opacity-40">
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                    {posts.length} entries detected
                </span>
                {loading && (
                    <span className="text-[10px] font-black lowercase animate-pulse">/ syncing...</span>
                )}
            </div>

            {loading && posts.length === 0 ? (
                <div className="py-12 text-center opacity-10 italic text-[11px] font-black lowercase tracking-widest animate-pulse">
                    fetching discussion nodes...
                </div>
            ) : (
                <ul className="not-prose m-0 p-0 list-none mb-12 space-y-8">
                    {adaptedPosts.map((post) => (
                        <li key={post.id} className="relative">
                            <ForumQuestionCard question={post as any} />
                        </li>
                    ))}
                </ul>
            )}

            <div className="mt-16 bg-black/[0.02] rounded-xl p-6 border border-black/[0.03] border-dashed">
                <ForumQuestionForm
                    onSubmit={handleCreatePost}
                    className="!mt-0"
                />
            </div>
        </div>
    )
}
