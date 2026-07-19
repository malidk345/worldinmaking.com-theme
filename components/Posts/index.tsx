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

        // ⚡ Bolt: Pre-calculate sorting values to prevent $O(N \log N)$ repeated dayjs parsing during sort.
        // O(N) map reduces expensive dayjs instantiations.
        return filteredPosts
            .map(post => ({ post, time: dayjs.utc(post.date).unix() }))
            .sort((a, b) => b.time - a.time)
            .map(item => item.post)
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
                            <ul className="m-0 p-0 list-none">
                                {sortedRoadmaps.map((roadmap) => {
                                    const teamName = roadmap.authorName || 'worldinmaking'
                                    const computedReadTime = roadmap.wordCount ? `${Math.max(1, Math.ceil(roadmap.wordCount / 200))}m` : '2m'

                                    const isTr = preferredLanguage === 'tr'
                                    const displayTitle = (isTr && roadmap.translations?.['tr']?.title) ? roadmap.translations['tr'].title : roadmap.title
                                    const displayDescription = (isTr && roadmap.translations?.['tr']?.excerpt) ? roadmap.translations['tr'].excerpt : roadmap.description

                                    return (
                                        <li key={roadmap.id} className="font-mono text-xs lowercase py-2 group">
                                            <Link
                                                to={getPostHref((isTr && roadmap.translations?.['tr']?.slug) ? roadmap.translations['tr'].slug : roadmap.slug)}
                                                className="flex !no-underline items-start gap-3 p-4 bg-white/40 dark:bg-black/70 supports-[backdrop-filter]:backdrop-blur-[25px] supports-[backdrop-filter]:backdrop-saturate-[190%] border border-black/5 dark:border-white/5 rounded-[24px] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] cursor-pointer transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] active:brightness-95 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_4px_24px_rgba(0,0,0,0.02)]"
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    handleRoadmapClick(roadmap)
                                                }}
                                            >
                                                <div className="flex-grow flex flex-col min-w-0">
                                                    {/* Author / Profile Area at Top */}
                                                    <div className="flex items-center gap-2 mb-2 text-black/50 dark:text-white/50">
                                                        <div className="size-5 shrink-0 border border-black/10 dark:border-white/10 bg-primary/5 rounded-full overflow-hidden flex items-center justify-center">
                                                            {roadmap.authorAvatar ? (
                                                                // eslint-disable-next-line @next/next/no-img-element
                                                                <img src={roadmap.authorAvatar} alt="" className="size-full object-cover" />
                                                            ) : (
                                                                <IconPerson className="size-3" />
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] font-bold">@{teamName.toLowerCase()}</span>
                                                        <span className="text-[9px] text-black/60 dark:text-white/60 ml-1">[{dayjs.utc(roadmap.date).format('YY.MM.DD')}]</span>
                                                    </div>

                                                    <span className="text-primary font-bold group-hover:!text-black dark:group-hover:!text-white leading-tight break-words text-[13px]">
                                                        {displayTitle}
                                                    </span>
                                                    {displayDescription && (
                                                        <span className="text-black/50 dark:text-white/50 text-[10px] mt-0.5 leading-snug line-clamp-6 italic">
                                                            <span>{'//'}</span> {displayDescription}
                                                        </span>
                                                    )}
                                                    {/* Colored Preview Image */}
                                                    {roadmap.image && (
                                                        <div className="mt-3 w-full max-w-[280px] aspect-video border border-black/5 dark:border-white/5 bg-primary/5 overflow-hidden rounded-[16px] shadow-sm">
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img
                                                                src={roadmap.image}
                                                                alt=""
                                                                className="size-full object-cover pointer-events-none"
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                <span className="text-black/30 dark:text-white/30 shrink-0 text-[10px] font-bold tracking-tighter ml-auto pt-1">
                                                    {computedReadTime}
                                                </span>
                                            </Link>
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
                    </div>
                </ScrollArea>
            </div>
        </div>
    )
})

PostsView.displayName = 'PostsView'

export default PostsView
