"use client"

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useWindow } from '../../context/Window'
import { useApp } from '../../context/App'
import { IconSearch } from '@posthog/icons'
import { usePosts, Post } from '../../hooks/usePosts'

// Simple local search function
function searchPosts(allPosts: Post[], query: string) {
    if (!query || query.length < 2) return []
    const lowerQuery = query.toLowerCase()
    return allPosts.filter(post => {
        const title = post.title.toLowerCase()
        const content = post.content.toLowerCase()
        const category = post.category?.toLowerCase() || ''
        const excerpt = post.excerpt?.toLowerCase() || ''
        return (
            title.includes(lowerQuery) ||
            content.includes(lowerQuery) ||
            category.includes(lowerQuery) ||
            excerpt.includes(lowerQuery)
        )
    }).slice(0, 20) // Limit results
}

function getExcerpt(content: string, query: string, maxLen = 120): string {
    const lower = content.toLowerCase()
    const idx = lower.indexOf(query.toLowerCase())
    if (idx === -1) return content.slice(0, maxLen).replace(/\n/g, ' ').replace(/[#*_`]/g, '') + '...'
    const start = Math.max(0, idx - 40)
    const end = Math.min(content.length, idx + query.length + 80)
    let excerpt = content.slice(start, end).replace(/\n/g, ' ').replace(/[#*_`]/g, '')
    if (start > 0) excerpt = '...' + excerpt
    if (end < content.length) excerpt = excerpt + '...'
    return excerpt
}

export const WindowSearchUI = ({ initialFilter }: { initialFilter?: string }) => {
    const { addWindow, updateWindow } = useApp()
    const { appWindow } = useWindow()
    const { posts, loading } = usePosts()
    const [query, setQuery] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    void initialFilter

    useEffect(() => {
        if (appWindow) {
            updateWindow(appWindow, { meta: { title: 'search' } })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [appWindow?.key])

    useEffect(() => {
        // Auto-focus the input
        setTimeout(() => inputRef.current?.focus(), 100)
    }, [])

    const results = useMemo(() => searchPosts(posts, query), [posts, query])

    const handleResultClick = (post: Post) => {
        addWindow({
            key: `blog-${post.id}`,
            path: `/blog/${post.slug}`,
            title: post.title,
        })
    }

    return (
        <div className="flex flex-col h-full bg-transparent overflow-hidden">
            {/* Search Input */}
            <div className="flex-shrink-0 p-3 pb-2">
                <div className="flex items-center gap-2 bg-white/50 dark:bg-black/50 supports-[backdrop-filter]:backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-full px-3 py-2 shadow-inner">
                    <IconSearch className="size-4 text-muted flex-shrink-0 ml-1" />
                    <input
                        ref={inputRef}
                        type="text"
                        className="flex-1 bg-transparent border-0 outline-none text-[15px] text-primary placeholder:text-muted"
                        placeholder="Search blog posts..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoFocus
                    />
                    {query && (
                        <button
                            onClick={() => setQuery('')}
                            className="flex items-center justify-center size-5 rounded-full bg-black/10 dark:bg-white/10 text-muted hover:text-primary transition-colors hover:bg-black/20 dark:hover:bg-white/20 mr-1"
                        >
                            <span className="text-[10px] font-bold">✕</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto px-2 pb-2">
                {loading ? (
                    <div className="p-4 text-center text-muted text-sm bg-white/40 dark:bg-black/40 supports-[backdrop-filter]:backdrop-blur-xl rounded-[18px] mx-1 mt-1 border border-black/5 dark:border-white/5">
                        Loading posts...
                    </div>
                ) : query.length < 2 ? (
                    <div className="p-4 text-center text-muted text-sm bg-white/40 dark:bg-black/40 supports-[backdrop-filter]:backdrop-blur-xl rounded-[18px] mx-1 mt-1 border border-black/5 dark:border-white/5">
                        Type at least 2 characters to search...
                    </div>
                ) : results.length === 0 ? (
                    <div className="p-4 text-center text-muted text-sm bg-white/40 dark:bg-black/40 supports-[backdrop-filter]:backdrop-blur-xl rounded-[18px] mx-1 mt-1 border border-black/5 dark:border-white/5">
                        No results found for &quot;{query}&quot;
                    </div>
                ) : (
                    <div className="flex flex-col space-y-1">
                        <div className="px-3 py-1 text-[11px] font-semibold tracking-wide text-muted/70">
                            {results.length} RESULT{results.length !== 1 ? 'S' : ''}
                        </div>
                        {results.map((post) => (
                            <button
                                key={post.id}
                                onClick={() => handleResultClick(post)}
                                className="w-full text-left px-3 py-3 bg-white/60 dark:bg-black/40 supports-[backdrop-filter]:backdrop-blur-xl hover:bg-white/80 dark:hover:bg-black/60 transition-colors block cursor-pointer border border-black/5 dark:border-white/5 rounded-[18px] shadow-sm"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="flex-1 min-w-0">
                                        {post.category && (
                                            <span className="text-[10px] font-bold tracking-wider text-orange opacity-90 uppercase">
                                                {post.category}
                                            </span>
                                        )}
                                        <h4 className="text-[15px] font-semibold text-primary m-0 line-clamp-1 tracking-tight mt-0.5">
                                            {post.title}
                                        </h4>
                                        <p className="text-[13px] text-secondary m-0 mt-1 line-clamp-2 opacity-80 leading-snug">
                                            {getExcerpt(post.content, query)}
                                        </p>
                                        <div className="flex items-center gap-2 mt-2">
                                            {post.date && (
                                                <span className="text-[11px] text-muted/80 font-medium">{post.date}</span>
                                            )}
                                            {post.authorName && (
                                                <span className="text-[11px] text-muted/80">by {post.authorName}</span>
                                            )}
                                        </div>
                                    </div>
                                    {post.image && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={post.image}
                                            alt=""
                                            className="w-14 h-14 rounded-[12px] object-cover flex-shrink-0 border border-black/10 dark:border-white/10 shadow-sm"
                                        />
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export const SearchUI = ({
    initialFilter = '',
}: {
    initialFilter?: string
}) => {
    return <WindowSearchUI initialFilter={initialFilter} />
}
