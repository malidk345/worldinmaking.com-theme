"use client"

import React, { useEffect } from 'react'
import ForumQuestionCard from '../Forum/ForumQuestionCard'
import CommentForm from './CommentForm'
import { useCommunity } from 'hooks/useCommunity'

interface CommentSectionProps {
    slug?: string
    className?: string
}

export default function CommentSection({
    slug,
    className = '',
}: CommentSectionProps) {
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

    const handleCreatePost = async (content: string) => {
        if (slug) {
            await createPost(undefined, `comment_${slug}_${Date.now()}`, content, slug)
        }
    }

    const adaptedPosts = posts.map(p => ({
        id: p.id,
        permalink: p.id.toString(),
        subject: p.title.startsWith('comment_') ? '' : p.title,
        body: p.content,
        createdAt: p.created_at,
        profile: {
            id: p.profiles?.id || 0,
            firstName: p.profiles?.username || 'anonymous',
            lastName: '',
            avatar: p.profiles?.avatar_url || null,
        },
        replies: [],
    }))

    return (
        <div className={`mt-12 community-section ${className}`}>
            <h3 id="community-questions" className="text-xl font-bold mb-6 text-primary">Comments</h3>

            {loading && posts.length === 0 ? (
                <div className="flex justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
            ) : posts.length > 0 ? (
                <ul className="not-prose m-0 p-0 list-none mb-6 space-y-6">
                    {adaptedPosts.map((post) => (
                        <li key={post.id} className="border-l-2 border-border pl-4">
                            <ForumQuestionCard
                                question={post as any}
                                isComment={true}
                            />
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-primary/60 text-sm mb-6">No comments yet. Be the first to comment!</p>
            )}

            <div className="mt-8 border-t border-border pt-6">
                <CommentForm
                    onSubmit={handleCreatePost}
                    placeholder="Add a comment..."
                />
            </div>
        </div>
    )
}
