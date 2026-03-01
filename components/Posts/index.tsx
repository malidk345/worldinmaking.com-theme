"use client"

import React, { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import relativeTime from 'dayjs/plugin/relativeTime'
import {
    IconPerson,
} from '@posthog/icons'
import { useApp } from 'context/App'
import { usePosts, Post } from 'hooks/usePosts'
import ScrollArea from 'components/RadixUI/ScrollArea'
import BlogPostView from 'components/ReaderView/BlogPostView'
import SEO from 'components/SEO'
import Loading from 'components/Loading'

dayjs.extend(utc)
dayjs.extend(relativeTime)

const getPostHref = (slug?: string) => {
    if (!slug) return '/posts'
    return `/posts/${encodeURIComponent(slug)}`
}

export default function PostsView() {
    const { posts, loading } = usePosts()
    const { addWindow } = useApp()

    const sortedRoadmaps = useMemo(() => {
        return [...posts].sort((a, b) => dayjs.utc(b.date).unix() - dayjs.utc(a.date).unix())
    }, [posts])

    const handleRoadmapClick = (roadmap: Post) => {
        addWindow({
            key: `blog-${roadmap.id}`,
            path: getPostHref(roadmap.slug),
            title: roadmap.title.toLowerCase(),
            size: { width: 900, height: 800 },
            position: { x: 100, y: 50 },
            element: <BlogPostView post={roadmap} />
        })
    }

    if (loading) return <Loading fullScreen label="loading changelog..." />

    return (
        <div className="absolute inset-0 flex flex-col text-primary bg-primary overflow-hidden">
            <SEO title="changelog" />

            {/* Community-style Post Rows */}
            <div className="flex-grow flex min-h-0 relative bg-primary">
                <ScrollArea className="size-full">
                    <div className="w-full max-w-3xl mx-auto py-8 px-4 sm:px-6">
                        {sortedRoadmaps.length === 0 ? (
                            <div className="py-16 text-center text-secondary/70 text-sm font-bold bg-accent rounded border border-primary/10">
                                no logs found.
                            </div>
                        ) : (
                            <ul className="m-0 p-0 list-none">
                                {sortedRoadmaps.map((roadmap) => {
                                    const teamName = roadmap.authorName || 'worldinmaking'
                                    const computedReadTime = roadmap.wordCount ? `${Math.max(1, Math.ceil(roadmap.wordCount / 200))}m` : '2m'

                                    return (
                                        <li key={roadmap.id} className="font-mono text-xs lowercase border-b border-black/10 last:border-0 py-2 group">
                                            <div
                                                className="flex items-start gap-3 px-2 sm:px-4 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-all"
                                                onClick={() => handleRoadmapClick(roadmap)}
                                            >
                                                <div className="flex-grow flex flex-col min-w-0">
                                                    {/* Author / Profile Area at Top */}
                                                    <div className="flex items-center gap-2 mb-2 opacity-50">
                                                        <div className="size-5 shrink-0 border border-primary/20 bg-primary/5 rounded-sm overflow-hidden flex items-center justify-center">
                                                            {roadmap.authorAvatar ? (
                                                                <img src={roadmap.authorAvatar} alt="" className="size-full object-cover" />
                                                            ) : (
                                                                <IconPerson className="size-3" />
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] font-bold">@{teamName.toLowerCase()}</span>
                                                        <span className="text-[9px] opacity-60 ml-1">[{dayjs.utc(roadmap.date).format('YY.MM.DD')}]</span>
                                                    </div>

                                                    <span className="text-primary font-bold group-hover:!text-black dark:group-hover:!text-white leading-tight break-words text-[13px]">
                                                        {roadmap.title}
                                                    </span>
                                                    {roadmap.description && (
                                                        <span className="opacity-50 text-[10px] mt-0.5 leading-snug line-clamp-6 italic">
                                                            <span>{'//'}</span> {roadmap.description}
                                                        </span>
                                                    )}
                                                    {/* Colored Preview Image */}
                                                    {roadmap.image && (
                                                        <div className="mt-2 w-full max-w-[240px] aspect-video border border-primary/10 bg-primary/5 overflow-hidden rounded-[1px] shadow-sm">
                                                            <img
                                                                src={roadmap.image}
                                                                alt=""
                                                                className="size-full object-cover pointer-events-none"
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                <span className="opacity-30 shrink-0 text-[10px] font-bold tracking-tighter ml-auto pt-1">
                                                    {computedReadTime}
                                                </span>
                                            </div>
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
}
