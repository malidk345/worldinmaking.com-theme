"use client"

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useWindow } from '../../context/Window'
import { useApp } from '../../context/App'
import { IconSearch } from '@posthog/icons'
import { usePosts } from '../../hooks/usePosts'
import type { Post } from '../../types/database'
import { useTranslation } from '../../hooks/useTranslation'

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
    const { t, lang } = useTranslation()

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
            <div className="flex-shrink-0 p-3 pb-2 border-b border-[var(--border-3000)]">
                <div className="flex items-center gap-2 bg-[var(--color-bg-surface-primary)] border border-[var(--border-3000)] rounded-full px-4 py-2">
                    <IconSearch className="size-5 text-[var(--muted-3000)] flex-shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        className="flex-1 bg-transparent border-0 outline-none text-[15px] font-medium tracking-tight text-[var(--text-3000)] placeholder:text-[var(--muted-3000)]"
                        placeholder={t('search.placeholder')}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoFocus
                    />
                    {query && (
                        <button
                            onClick={() => setQuery('')}
                            className="flex items-center justify-center size-5 bg-[var(--color-bg-fill-button-tertiary-hover)] hover:bg-[var(--color-bg-fill-button-tertiary-active)] rounded-full text-[var(--text-3000)] transition-colors flex-shrink-0"
                        >
                            <span className="text-[10px] font-bold">✕</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto px-2 py-2">
                {loading ? (
                    <div className="p-4 text-center text-muted text-[13px] tracking-tight">
                        {t('loading.posts')}
                    </div>
                ) : query.length < 2 ? (
                    <div className="p-4 text-center text-muted text-[13px] tracking-tight">
                        {t('search.type_to_search')}
                    </div>
                ) : results.length === 0 ? (
                    <div className="p-4 text-center text-muted text-[13px] tracking-tight">
                        {t('search.no_results')} &quot;{query}&quot;
                    </div>
                ) : (
                    <div className="flex flex-col gap-1">
                        <div className="px-3 py-1 text-[11px] font-bold lowercase tracking-wider text-muted opacity-60">
                            {results.length} {lang === 'en' ? (results.length === 1 ? 'result' : 'results') : t('search.results_count')}
                        </div>
                        {results.map((post) => (
                             <button
                                key={post.id}
                                onClick={() => handleResultClick(post)}
                                className="w-full text-left p-3 hover:bg-[var(--color-bg-fill-button-tertiary-hover)] rounded-[var(--radius)] transition-colors block cursor-pointer group"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="flex-1 min-w-0">
                                        {post.category && (
                                            <span className="text-[10px] font-bold lowercase tracking-wider text-[var(--primary-3000)] opacity-85 mb-0.5 block">
                                                {post.category}
                                            </span>
                                        )}
                                        <h4 className="text-[15px] font-semibold tracking-tight text-[var(--text-3000)] m-0 line-clamp-1 group-hover:text-[var(--link-3000)] transition-colors">
                                            {post.title}
                                        </h4>
                                        <p className="text-[13px] leading-snug tracking-tight text-[var(--color-text-secondary-3000)] m-0 mt-1 line-clamp-2 opacity-70">
                                            {getExcerpt(post.content, query)}
                                        </p>
                                        <div className="flex items-center gap-2 mt-2">
                                            {post.date && (
                                                <span className="text-[11px] font-medium tracking-tight text-muted">{post.date}</span>
                                            )}
                                            {post.authorName && (
                                                <>
                                                    <span className="w-1 h-1 rounded-full bg-black/10 dark:bg-white/20"></span>
                                                    <span className="text-[11px] font-medium tracking-tight text-muted">{post.authorName}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    {post.image && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={post.image}
                                            alt=""
                                            className="w-14 h-14 rounded-full object-cover flex-shrink-0 shadow-sm border border-black/5 dark:border-white/5"
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
