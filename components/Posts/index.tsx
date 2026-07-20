"use client"

import React, { useMemo } from 'react'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import relativeTime from 'dayjs/plugin/relativeTime'
import {
    IconPerson,
} from '@posthog/icons'
import { useApp } from 'context/App'
import { usePosts } from 'hooks/usePosts'

import type { Post } from 'types/database'
import ScrollArea from 'components/RadixUI/ScrollArea'
import { useTranslation } from 'hooks/useTranslation'
import BlogPostView from 'components/ReaderView/BlogPostView'
import Link from 'components/Link'
import SEO from 'components/SEO'
import Loading from 'components/Loading'
import 'components/Corpus/styles.css'

dayjs.extend(utc)
dayjs.extend(relativeTime)

const getPostHref = (slug?: string) => {
    if (!slug) return '/posts'
    return `/posts/${encodeURIComponent(slug)}`
}

const PostsView = React.memo(() => {
    const { posts, loading } = usePosts()
    const { addWindow } = useApp()
    const { t, lang: preferredLanguage } = useTranslation()

    const sortedRoadmaps = useMemo(() => {
        const filteredPosts = posts.filter(post => {
            if (preferredLanguage === 'tr') {
                return post.originalLanguage === 'tr' || post.translations?.['tr']
            }
            // default to English behavior
            return post.originalLanguage === 'en' || post.translations?.['en'] || !post.originalLanguage
        })

        // ⚡ Bolt: Use Schwartzian transform to prevent O(N log N) Date parsing during sort.
        const mappedPosts = filteredPosts.map(post => ({
            post,
            time: dayjs.utc(post.date).unix()
        }))
        return mappedPosts.sort((a, b) => b.time - a.time).map(m => m.post)
    }, [posts, preferredLanguage])

    const handleRoadmapClick = (roadmap: Post) => {
        const isTr = preferredLanguage === 'tr'
        const displayTitle = (isTr && roadmap.translations?.['tr']?.title) ? roadmap.translations['tr'].title : roadmap.title
        const activeSlug = (isTr && roadmap.translations?.['tr']?.slug) ? roadmap.translations['tr'].slug : roadmap.slug

        addWindow({
            key: `blog-${roadmap.id}`,
            path: getPostHref(activeSlug),
            title: displayTitle.toLowerCase(),
            element: <BlogPostView post={roadmap} />
        })
    }

    if (loading) return <Loading fullScreen label={t('loading.posts')} />

    return (
        <div className="absolute inset-0 flex flex-col text-primary bg-primary overflow-hidden">
            <SEO title="posts" />

            {/* Community-style Post Rows */}
            <div className="flex-grow flex min-h-0 relative bg-primary">
                <ScrollArea className="size-full">
                    <div className="w-full max-w-3xl mx-auto py-8 px-4 sm:px-6">
                        {sortedRoadmaps.length === 0 ? (
                            <div className="py-16 text-center text-secondary/70 text-sm font-bold bg-accent rounded-[16px] border border-primary/10">
                                {t('posts.empty')}
                            </div>
                        ) : (
                            <div className="corpus-doc-grid animate-fadeIn">
                                {sortedRoadmaps.map((roadmap) => {
                                    const teamName = roadmap.authorName || 'worldinmaking'
                                    const isTr = preferredLanguage === 'tr'
                                    const displayTitle = (isTr && roadmap.translations?.['tr']?.title) ? roadmap.translations['tr'].title : roadmap.title
                                    const displayDescription = (isTr && roadmap.translations?.['tr']?.excerpt) ? roadmap.translations['tr'].excerpt : roadmap.description

                                    return (
                                        <article
                                            key={roadmap.id}
                                            className="corpus-doc-card cursor-pointer group"
                                            onClick={() => handleRoadmapClick(roadmap)}
                                        >
                                            <div className="corpus-doc-media">
                                                {roadmap.image ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={roadmap.image} alt={displayTitle} className="size-full object-cover" />
                                                ) : (
                                                    <div className="corpus-doc-preview-paper">
                                                        <div className="flex flex-col gap-1 overflow-hidden">
                                                            <div className="font-bold text-[8px] lowercase tracking-wider opacity-40 border-b border-current/10 pb-1 mb-1 truncate">
                                                                @{teamName.toLowerCase()}
                                                            </div>
                                                            <div className="font-semibold text-[8.5px] leading-tight line-clamp-3">
                                                                {displayTitle}
                                                            </div>
                                                            {displayDescription && (
                                                                <div className="font-mono text-[7px] opacity-60 leading-relaxed line-clamp-6 mt-1">
                                                                    {displayDescription}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="pt-1 border-t border-current/10 flex items-center justify-between text-[7px] font-mono opacity-40">
                                                            <span>{roadmap.date ? dayjs.utc(roadmap.date).format('DD/MM/YYYY') : ''}</span>
                                                            <span>DOC</span>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="corpus-doc-media-fade" />
                                            </div>
                                            <div className="corpus-doc-info">
                                                <h3>{displayTitle}</h3>
                                                <div className="corpus-doc-date">
                                                    {roadmap.date ? dayjs.utc(roadmap.date).format('DD/MM/YYYY, HH:mm') : ''}
                                                </div>
                                            </div>
                                        </article>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>
        </div>
    )
})

PostsView.displayName = 'PostsView'

export default PostsView
