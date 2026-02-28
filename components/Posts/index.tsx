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
                                                    className="group flex flex-col relative py-3 -mt-1.5 mx-[-2px] -mb-3 rounded active:bg-light dark:active:bg-dark border-primary border-b-3 border-transparent hover:border hover:translate-y-[-1px] active:translate-y-[1px] active:transition-all active:before:h-[2px] active:before:bg-light dark:active:before:bg-dark active:before:absolute active:before:content-[''] active:before:top-[-3px] active:before:left-0 active:before:right-0 cursor-pointer"
                                                    onClick={() => handleRoadmapClick(roadmap)}
                                                >
                                                    <div className="flex flex-col w-full text-primary">
                                                        <div className="flex flex-wrap sm:flex-nowrap items-center space-x-2 w-full pt-1 sm:pt-2 pl-3 sm:pl-5 pr-3 sm:pr-8">
                                                            <div className="flex items-center relative">
                                                                <div className="w-[44px] h-[44px] ml-[-2px] rounded-full mr-[10px] overflow-hidden relative flex-shrink-0">
                                                                    {roadmap.authorAvatar ? (
                                                                        <img src={roadmap.authorAvatar} alt={teamName} className="w-[40px] h-[40px] rounded-full object-cover shrink-0 relative top-[2px] left-[2px] border border-primary" />
                                                                    ) : (
                                                                        <div className="w-[40px] h-[40px] rounded-full bg-black/5 dark:bg-white/5 text-primary shrink-0 flex items-center justify-center relative top-[2px] left-[2px] border border-primary">
                                                                            <IconPerson className="size-5 shrink-0" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <strong className="text-primary leading-none text-[15px]">{teamName}</strong>
                                                            </div>
                                                            <div className="!ml-auto text-sm text-secondary font-medium">
                                                                {dayjs.utc(roadmap.date).fromNow()}
                                                            </div>
                                                        </div>

                                                        <div className="pb-2 pt-1 pl-3 sm:pl-[calc(2.5rem_+_30px)] pr-3 sm:pr-8 mt-2 sm:mt-0 squeak-left-border">
                                                            <h3 className="text-base font-semibold !m-0 pb-1 leading-5">
                                                                <span className="!no-underline group-hover:!underline font-semibold text-[#000080] dark:text-[#66b2ff] lowercase">
                                                                    {roadmap.title}
                                                                </span>
                                                            </h3>

                                                            <div className="question-content">
                                                                {roadmap.description && (
                                                                    <div className="mt-1 flex-1 min-w-0 text-primary text-[13px] leading-relaxed opacity-80 line-clamp-2 break-words">
                                                                        {roadmap.description}
                                                                    </div>
                                                                )}

                                                                {roadmap.image && (
                                                                    <div className="mt-3 w-full max-w-2xl border border-primary/20 rounded overflow-hidden aspect-video relative">
                                                                        <img
                                                                            src={roadmap.image}
                                                                            alt={roadmap.title}
                                                                            className="w-full h-full object-cover relative z-10 select-none pointer-events-none"
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="mt-3 text-xs opacity-60 font-medium">
                                                                {computedReadTime} read
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
