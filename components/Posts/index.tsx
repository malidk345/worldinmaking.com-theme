"use client"

import React, { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import relativeTime from 'dayjs/plugin/relativeTime'
import {
    IconArrowRight,
    IconMessage,
    IconPerson,
} from '@posthog/icons'
import OSButton from 'components/OSButton'
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

    const [selectedAuthor, setSelectedAuthor] = useState('All')
    const [selectedCategory, setSelectedCategory] = useState('All')

    const sortedRoadmaps = useMemo(() => {
        return [...posts].sort((a, b) => dayjs.utc(b.date).unix() - dayjs.utc(a.date).unix())
    }, [posts])

    const { authors, categories } = useMemo(() => {
        const auths = new Set<string>()
        const cats = new Set<string>()
        posts.forEach(p => {
            auths.add(p.authorName || 'WorldInMaking')
            if (p.category) cats.add(p.category)
        })
        return {
            authors: Array.from(auths).sort(),
            categories: Array.from(cats).sort()
        }
    }, [posts])

    const filteredRoadmaps = useMemo(() => {
        return sortedRoadmaps.filter(r => {
            const authorMatch = selectedAuthor === 'All' || (r.authorName || 'WorldInMaking') === selectedAuthor
            const categoryMatch = selectedCategory === 'All' || (r.category || 'Uncategorized') === selectedCategory
            return authorMatch && categoryMatch
        })
    }, [sortedRoadmaps, selectedAuthor, selectedCategory])

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
            <SEO title="Changelog" />

            {/* Community-style Post Rows */}
            <div className="flex-grow flex min-h-0 relative bg-primary">
                <ScrollArea className="size-full">
                    <div className="w-full max-w-3xl mx-auto py-8 px-4 sm:px-6">
                        {sortedRoadmaps.length === 0 ? (
                            <div className="py-16 text-center text-secondary/70 text-sm font-bold bg-accent rounded border border-primary/10">
                                No logs found.
                            </div>
                        ) : (
                            <ul className="m-0 p-0 list-none">
                                {sortedRoadmaps.map((roadmap) => {
                                    const teamName = roadmap.authorName || 'WorldInMaking'
                                    const computedReadTime = roadmap.wordCount ? `${Math.max(1, Math.ceil(roadmap.wordCount / 200))}m` : '2m'

                                    return (
                                        <li key={roadmap.id} className="list-none px-[2px]">
                                            <div className="py-2.5">
                                                <div
                                                    className="group flex flex-col relative px-3 md:px-5 py-3 -mt-1.5 mx-[-2px] -mb-3 rounded active:bg-light dark:active:bg-dark border-primary border-b-3 border-transparent hover:border hover:translate-y-[-1px] active:translate-y-[1px] active:transition-all active:before:h-[2px] active:before:bg-light dark:active:before:bg-dark active:before:absolute active:before:content-[''] active:before:top-[-3px] active:before:left-0 active:before:right-0 cursor-pointer"
                                                    onClick={() => handleRoadmapClick(roadmap)}
                                                >
                                                    <div className="w-full min-w-0 flex flex-col items-start text-left">
                                                        <span className="text-sm font-semibold text-[#000080] dark:text-[#66b2ff] line-clamp-3 md:line-clamp-1 break-words leading-snug lowercase">
                                                            {roadmap.title}
                                                        </span>

                                                        {roadmap.description && (
                                                            <div className="mt-1 flex-1 min-w-0 text-black dark:text-white text-xs line-clamp-2 break-words">
                                                                {roadmap.description}
                                                            </div>
                                                        )}

                                                        {roadmap.image && (
                                                            <div className="mt-4 mb-2 w-full max-w-3xl border border-primary/20 rounded overflow-hidden aspect-video relative">
                                                                <img
                                                                    src={roadmap.image}
                                                                    alt={roadmap.title}
                                                                    className="w-full h-full object-cover relative z-10 select-none pointer-events-none"
                                                                />
                                                            </div>
                                                        )}

                                                        {/* Bottom Meta Frame (Full-width OS Status Bar style) */}
                                                        <div className="mt-4 flex items-center justify-between border-[1px] border-primary/30 bg-accent/40 dark:bg-black/20 px-3 py-1.5 rounded-[4px] w-full max-w-3xl shadow-sm">
                                                            <div className="flex items-center gap-2">
                                                                {roadmap.authorAvatar ? (
                                                                    <img src={roadmap.authorAvatar} alt={teamName} className="size-5 rounded-full object-cover shrink-0 border border-primary/20 bg-white" />
                                                                ) : (
                                                                    <div className="size-5 rounded-full bg-black/5 dark:bg-white/5 text-black dark:text-white shrink-0 border border-primary/20 flex items-center justify-center">
                                                                        <IconPerson className="size-3.5 shrink-0" />
                                                                    </div>
                                                                )}
                                                                <span className="text-[12px] font-semibold text-primary truncate max-w-[150px]">{teamName}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2.5">
                                                                <span className="text-[11px] font-semibold text-black dark:text-white whitespace-nowrap">{dayjs.utc(roadmap.date).fromNow()}</span>
                                                                <div className="w-[1px] h-[12px] bg-black/50 dark:bg-white/50 rounded-full mx-0.5"></div>
                                                                <span className="text-[11px] font-semibold text-black dark:text-white whitespace-nowrap">{computedReadTime} read</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
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
