"use client"

import React, { useEffect } from 'react'
import ForumQuestionCard from '../Forum/ForumQuestionCard'
import CommentForm from './CommentForm'
import { useCommunity } from 'hooks/useCommunity'
import ArticleActions from './ArticleActions'
import { useTranslation } from 'hooks/useTranslation'
import Loading from '../Loading'

interface CommentSectionProps {
    slug?: string
    className?: string
    views?: number
}

export default function CommentSection({
    slug,
    className = '',
    views = 0,
}: CommentSectionProps) {
    const { t } = useTranslation()
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

    const handleCreatePost = async (subject: string, content: string) => {
        if (slug) {
            const finalSubject = subject.trim() || `comment_${slug}_${Date.now()}`
            await createPost(undefined, finalSubject, content, slug)
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
        topics: [],
        pinnedTopics: [],
        resolved: false,
        archived: false,
        upvotes: p._count.likes || 0,
        views: p._count.views || 0,
        userVote: 0,
    }))

    return (
        <div className={`mt-12 flex flex-col w-full max-w-full min-w-0 transition-all duration-400 ease-[cubic-bezier(0.25,1,0.5,1)] ${className}`}>
            <ArticleActions slug={slug} views={views} />

            <h3
                id="community-questions"
                className="text-[18px] md:text-[20px] font-semibold tracking-tight text-black/90 dark:text-white/90 mb-4 md:mb-6 lowercase transition-colors duration-400 ease-[cubic-bezier(0.25,1,0.5,1)]"
            >
                {t('comments.title')}
            </h3>

            {loading && posts.length === 0 ? (
                <div className="w-full flex justify-center py-8">
                    <Loading label={t('comments.syncing')} />
                </div>
            ) : posts.length > 0 ? (
                <ul className="not-prose m-0 p-0 list-none mb-6 md:mb-8 flex flex-col gap-4 md:gap-6">
                    {adaptedPosts.map((post) => (
                        <li
                            key={post.id}
                            className="relative pl-3 md:pl-5 border-l-[2px] border-black/5 dark:border-white/5 transition-all duration-400 ease-[cubic-bezier(0.25,1,0.5,1)] hover:border-black/20 dark:hover:border-white/20 active:scale-[0.97] active:ease-[cubic-bezier(0.16,1,0.3,1)]"
                        >
                            <ForumQuestionCard
                                question={post}
                                isComment={true}
                            />
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-black/50 dark:text-white/50 font-medium text-[14px] md:text-[15px] mb-6 md:mb-8 lowercase tracking-tight transition-colors duration-400 ease-[cubic-bezier(0.25,1,0.5,1)]">
                    {t('comments.empty')}
                </p>
            )}

            <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-black/5 dark:border-white/5 transition-colors duration-400 ease-[cubic-bezier(0.25,1,0.5,1)] w-full max-w-full min-w-0">
                <div className="p-3 md:p-6 rounded-[24px] md:rounded-[32px] bg-white dark:bg-[#121214] border border-black/5 dark:border-white/5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_2px_4px_rgba(0,0,0,0.02),0_8px_24px_rgba(0,0,0,0.03),0_24px_48px_rgba(0,0,0,0.04)] transition-all duration-400 ease-[cubic-bezier(0.25,1,0.5,1)] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_4px_8px_rgba(0,0,0,0.03),0_12px_32px_rgba(0,0,0,0.04),0_32px_64px_rgba(0,0,0,0.05)] transform-gpu hover:-translate-y-[1px] w-full max-w-full min-w-0 overflow-x-hidden">
                    <CommentForm
                        onSubmit={handleCreatePost}
                        placeholder={t('comments.add_placeholder')}
                    />
                </div>
            </div>
        </div>
    )
}
