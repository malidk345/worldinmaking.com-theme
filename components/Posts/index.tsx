"use client"

import React, { useMemo } from 'react'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useApp } from 'context/App'
import { usePosts } from 'hooks/usePosts'

import type { Post } from 'types/database'
import ScrollArea from 'components/RadixUI/ScrollArea'
import { useTranslation } from 'hooks/useTranslation'
import BlogPostView from 'components/ReaderView/BlogPostView'
import SEO from 'components/SEO'
import Loading from 'components/Loading'
import 'components/Corpus/styles.css'
import { parsePaperMeta } from 'lib/wimbot-orchestrator'

import { IconSparkles } from '@posthog/icons'
import { LemonTag } from '@/components/LemonUI'

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
        const mappedPosts = filteredPosts.map(post => {
            const postRec = post as unknown as Record<string, string>
            return {
                post,
                time: dayjs.utc(post.date || postRec.created_at).unix()
            }
        })
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

            {/* Community-style Post Rows (matching PublicProfile post grid) */}
            <div className="flex-grow flex min-h-0 relative bg-primary">
                <ScrollArea className="size-full">
                    <div className="w-full max-w-4xl mx-auto py-8 px-4 sm:px-6">
                        {sortedRoadmaps.length === 0 ? (
                            <div className="py-16 text-center text-secondary/70 text-sm font-bold bg-accent rounded-[16px] border border-primary/10">
                                {t('posts.empty')}
                            </div>
                        ) : (
                            <div className="corpus-doc-grid-wrapper animate-fadeIn">
                                <div className="corpus-doc-grid">
                                    {sortedRoadmaps.map((roadmap) => {
                                        const isTr = preferredLanguage === 'tr'
                                        const displayTitle = (isTr && roadmap.translations?.['tr']?.title) ? roadmap.translations['tr'].title : roadmap.title
                                        const displayDescription = (isTr && roadmap.translations?.['tr']?.excerpt) ? roadmap.translations['tr'].excerpt : (roadmap.description || roadmap.excerpt)
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        const roadmapRecord = roadmap as any
                                        const paperMeta = parsePaperMeta((roadmapRecord.inner_thoughts as string) || (roadmapRecord.excerpt as string) || (roadmapRecord.paper_status as string))
                                        const paperStatus = (roadmapRecord.paper_status as string) || paperMeta?.paper_status
                                        const imageUrl = roadmap.image || roadmapRecord.image_url
                                        const categoryName = (roadmap.category || roadmap.authorName || 'document').toLowerCase()

                                        return (
                                            <article
                                                key={roadmap.id}
                                                className="corpus-doc-card relative glass-card cursor-pointer group"
                                                onClick={() => handleRoadmapClick(roadmap)}
                                            >
                                                <div className="corpus-doc-media">
                                                    {imageUrl ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={imageUrl} alt={displayTitle} className="size-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                                                    ) : (
                                                        <div className="corpus-doc-preview-paper">
                                                            <div className="flex flex-col gap-1 overflow-hidden">
                                                                <div className="font-bold text-[8px] lowercase tracking-wider opacity-40 border-b border-current/10 pb-1 mb-1 truncate">
                                                                    @{categoryName}
                                                                </div>
                                                                <div className="font-semibold text-[8.5px] leading-tight line-clamp-3">
                                                                    {displayTitle}
                                                                </div>
                                                                {(displayDescription || roadmap.content) && (
                                                                    <div className="font-mono text-[7px] opacity-60 leading-relaxed line-clamp-6 mt-1">
                                                                        {displayDescription || (roadmap.content ? roadmap.content.replace(/<[^>]*>/g, '').slice(0, 160) : '')}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="pt-1 border-t border-current/10 flex items-center justify-between text-[7px] font-mono opacity-40">
                                                                <span>{roadmap.date ? dayjs.utc(roadmap.date).local().format('DD/MM/YYYY') : (roadmapRecord.created_at ? dayjs.utc(roadmapRecord.created_at).local().format('DD/MM/YYYY') : '')}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {paperStatus && paperStatus !== 'published' && (
                                                        <div className="corpus-doc-badge">
                                                            <LemonTag type="warning">
                                                                UNFINISHED • {paperStatus}
                                                            </LemonTag>
                                                        </div>
                                                    )}
                                                    <div className="corpus-doc-media-fade" />
                                                </div>
                                                <div className="corpus-doc-info">
                                                    <h3>{displayTitle}</h3>
                                                    <div className="corpus-doc-date">
                                                        {roadmap.date ? dayjs.utc(roadmap.date).local().format('DD/MM/YYYY, HH:mm') : (roadmapRecord.created_at ? dayjs.utc(roadmapRecord.created_at).local().format('DD/MM/YYYY, HH:mm') : '')}
                                                    </div>
                                                </div>
                                            </article>
                                        )
                                    })}
                                </div>
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
