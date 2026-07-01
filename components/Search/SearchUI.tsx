"use client"

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWindow } from '../../context/Window'
import { useApp } from '../../context/App'
import { IconSearch } from '@posthog/icons'
import { usePosts } from '../../hooks/usePosts'
import { Post } from '../../types/database'

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
        <div className="flex flex-col h-full bg-transparent overflow-hidden rounded-[24px]">
            {/* Search Input */}
            <div className="flex-shrink-0 p-4 border-b border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/80 supports-[backdrop-filter]:backdrop-blur-3xl-safe z-10">
                <div className="flex items-center gap-3 bg-black/5 dark:bg-white/10 rounded-full px-4 py-2.5 shadow-inner transition-shadow focus-within:shadow-[0_0_0_2px_rgba(0,0,0,0.1)] dark:focus-within:shadow-[0_0_0_2px_rgba(255,255,255,0.2)]">
                    <IconSearch className="size-5 text-black/50 dark:text-white/50 flex-shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        className="flex-1 bg-transparent border-0 outline-none text-[15px] font-medium text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40"
                        placeholder="Search blog posts..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoFocus
                    />
                    <AnimatePresence>
                        {query && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                onClick={() => setQuery('')}
                                className="text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white flex items-center justify-center size-5 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 transition-colors"
                            >
                                <span className="text-[10px] font-bold">✕</span>
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto bg-white/50 dark:bg-black/50 supports-[backdrop-filter]:backdrop-blur-xl">
                {loading ? (
                    <div className="p-8 text-center text-black/50 dark:text-white/50 text-[15px] font-medium">
                        Loading posts...
                    </div>
                ) : query.length < 2 ? (
                    <div className="p-8 text-center text-black/40 dark:text-white/40 text-[15px] font-medium">
                        Type at least 2 characters to search...
                    </div>
                ) : results.length === 0 ? (
                    <div className="p-8 text-center text-black/40 dark:text-white/40 text-[15px] font-medium">
                        No results found for &quot;{query}&quot;
                    </div>
                ) : (
                    <div className="p-2 space-y-1">
                        <div className="px-3 py-2 text-[12px] font-semibold tracking-wide text-black/40 dark:text-white/40 uppercase">
                            {results.length} result{results.length !== 1 ? 's' : ''}
                        </div>
                        <AnimatePresence mode="popLayout">
                            {results.map((post, index) => (
                                <motion.button
                                    key={post.id}
                                    layout
                                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 400,
                                        damping: 30,
                                        delay: Math.min(index * 0.03, 0.3)
                                    }}
                                    onClick={() => handleResultClick(post)}
                                    className="w-full text-left p-3 hover:bg-white dark:hover:bg-white/10 transition-colors block cursor-pointer rounded-2xl group border border-transparent hover:border-black/5 dark:hover:border-white/5 hover:shadow-sm"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex-1 min-w-0">
                                            {post.category && (
                                                <span className="inline-block px-2 py-0.5 mb-1 text-[11px] font-bold tracking-wide text-orange-500 bg-orange-500/10 rounded-full">
                                                    {post.category}
                                                </span>
                                            )}
                                            <h4 className="text-[15px] font-semibold text-black dark:text-white m-0 line-clamp-1 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                                                {post.title}
                                            </h4>
                                            <p className="text-[13px] text-black/60 dark:text-white/60 m-0 mt-1 line-clamp-2 leading-relaxed">
                                                {getExcerpt(post.content, query)}
                                            </p>
                                            <div className="flex items-center gap-2 mt-2">
                                                {post.date && (
                                                    <span className="text-[11px] font-medium text-black/40 dark:text-white/40">{post.date}</span>
                                                )}
                                                {post.authorName && (
                                                    <span className="text-[11px] font-medium text-black/40 dark:text-white/40 flex items-center gap-1">
                                                        <span className="w-1 h-1 rounded-full bg-black/20 dark:bg-white/20" />
                                                        {post.authorName}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {post.image && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={post.image}
                                                alt=""
                                                className="w-16 h-16 rounded-[14px] object-cover flex-shrink-0 shadow-sm border border-black/5 dark:border-white/5"
                                            />
                                        )}
                                    </div>
                                </motion.button>
                            ))}
                        </AnimatePresence>
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
