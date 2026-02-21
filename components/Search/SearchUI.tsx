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
    const { addWindow, updateWindow, isMobile } = useApp()
    const { appWindow } = useWindow()
    const { posts, loading } = usePosts()
    const [query, setQuery] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (appWindow) {
            updateWindow(appWindow, { meta: { title: 'Search' } })
        }
    }, [])

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
        <div className="flex flex-col h-full bg-primary overflow-hidden">
            {/* Search Input */}
            <div className="flex-shrink-0 p-2 border-b border-border bg-accent/30">
                <div className="flex items-center gap-2 bg-primary border border-border rounded px-2 py-1.5">
                    <IconSearch className="size-4 text-muted flex-shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        className="flex-1 bg-transparent border-0 outline-none text-sm text-primary placeholder:text-muted"
                        placeholder="Search blog posts..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoFocus
                    />
                    {query && (
                        <button
                            onClick={() => setQuery('')}
                            className="text-muted hover:text-primary text-xs px-1"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="p-4 text-center text-muted text-sm">
                        Loading posts...
                    </div>
                ) : query.length < 2 ? (
                    <div className="p-4 text-center text-muted text-sm">
                        Type at least 2 characters to search...
                    </div>
                ) : results.length === 0 ? (
                    <div className="p-4 text-center text-muted text-sm">
                        No results found for &quot;{query}&quot;
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted bg-accent/20">
                            {results.length} result{results.length !== 1 ? 's' : ''}
                        </div>
                        {results.map((post) => (
                            <button
                                key={post.id}
                                onClick={() => handleResultClick(post)}
                                className="w-full text-left px-3 py-2.5 hover:bg-accent/40 transition-colors block cursor-pointer"
                            >
                                <div className="flex items-start gap-2">
                                    <div className="flex-1 min-w-0">
                                        {post.category && (
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-500 opacity-80">
                                                {post.category}
                                            </span>
                                        )}
                                        <h4 className="text-sm font-semibold text-primary m-0 line-clamp-1">
                                            {post.title}
                                        </h4>
                                        <p className="text-xs text-secondary m-0 mt-0.5 line-clamp-2 opacity-70">
                                            {getExcerpt(post.content, query)}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            {post.date && (
                                                <span className="text-[10px] text-muted">{post.date}</span>
                                            )}
                                            {post.authorName && (
                                                <span className="text-[10px] text-muted">by {post.authorName}</span>
                                            )}
                                        </div>
                                    </div>
                                    {post.image && (
                                        <img
                                            src={post.image}
                                            alt=""
                                            className="w-12 h-12 rounded object-cover flex-shrink-0"
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
    className = '',
    isRefinedClassName = 'bg-primary',
    hideFilters = false,
    autoFocus = true,
}: {
    initialFilter?: string
    className?: string
    isRefinedClassName?: string
    hideFilters?: boolean
    autoFocus?: boolean
}) => {
    return <WindowSearchUI initialFilter={initialFilter} />
}
