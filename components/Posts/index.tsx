"use client"

import React, { useMemo } from 'react'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import relativeTime from 'dayjs/plugin/relativeTime'
import {
    IconDocument,
    IconChevronRight,
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

        return [...filteredPosts].sort((a, b) => dayjs.utc(b.date).unix() - dayjs.utc(a.date).unix())
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
                            <div className="bg-white/40 dark:bg-black/70 supports-[backdrop-filter]:backdrop-blur-[25px] supports-[backdrop-filter]:backdrop-saturate-[190%] border border-black/5 dark:border-white/5 rounded-[24px] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
                                <ul className="m-0 p-0 list-none flex flex-col">
                                    {sortedRoadmaps.map((roadmap, index) => {
                                        const computedReadTime = roadmap.wordCount ? `${Math.max(1, Math.ceil(roadmap.wordCount / 200))}m` : '2m'

                                        const isTr = preferredLanguage === 'tr'
                                        const displayTitle = (isTr && roadmap.translations?.['tr']?.title) ? roadmap.translations['tr'].title : roadmap.title
                                        const activeSlug = (isTr && roadmap.translations?.['tr']?.slug) ? roadmap.translations['tr'].slug : roadmap.slug

                                        return (
                                            <li key={roadmap.id} className={`font-mono group ${index !== sortedRoadmaps.length - 1 ? 'border-b border-black/5 dark:border-white/5' : ''}`}>
                                                <Link
                                                    to={getPostHref(activeSlug)}
                                                    className="flex !no-underline items-center gap-3 px-4 py-3 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] cursor-pointer transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] active:bg-black/[0.08] dark:active:bg-white/[0.08]"
                                                    onClick={(e) => {
                                                        e.preventDefault()
                                                        handleRoadmapClick(roadmap)
                                                    }}
                                                >
                                                    <div className="size-8 shrink-0 flex items-center justify-center text-black/40 dark:text-white/40 group-hover:text-black/60 dark:group-hover:text-white/60 transition-colors">
                                                        <IconDocument className="size-6" />
                                                    </div>

                                                    <div className="flex-grow flex flex-col min-w-0 justify-center">
                                                        <span className="text-primary font-bold group-hover:!text-black dark:group-hover:!text-white leading-tight truncate text-[14px]">
                                                            {displayTitle}
                                                        </span>
                                                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-black/50 dark:text-white/50">
                                                            <span>{dayjs.utc(roadmap.date).format('DD MMM YYYY')}</span>
                                                            <span className="w-[3px] h-[3px] rounded-full bg-black/20 dark:bg-white/20" />
                                                            <span>{computedReadTime}</span>
                                                        </div>
                                                    </div>

                                                    <div className="shrink-0 text-black/30 dark:text-white/30 group-hover:text-black/50 dark:group-hover:text-white/50 transition-colors">
                                                        <IconChevronRight className="size-5" />
                                                    </div>
                                                </Link>
                                            </li>
                                        )
                                    })}
                                </ul>
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
