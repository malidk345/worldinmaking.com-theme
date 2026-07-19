"use client"

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { IconApps, IconChevronLeft, IconChevronRight, IconDocument, IconEye, IconNotification, IconRefresh, IconSparkles } from '@posthog/icons';
import { supabase } from 'lib/supabase'
import { useApp } from 'context/App'
import { useTranslation } from 'hooks/useTranslation'

interface TopPost {
    id: string | number
    title: string
    view_count: number
    type: 'blog' | 'community'
    slug?: string
    author?: string
    avatar_url?: string
    time?: string
}

const manualUpdates: TopPost[] = [
    { id: 1, title: 'new view count feature added to all posts', view_count: 0, type: 'blog', author: 'system', time: 'today' },
    { id: 2, title: 'improved mobile responsiveness for trending widget', view_count: 0, type: 'blog', author: 'system', time: 'yesterday' },
    { id: 3, title: 'supabase infrastructure hardened for production', view_count: 0, type: 'blog', author: 'system', time: '25 mar' },
    { id: 4, title: 'new forum discussion categories are now live', view_count: 0, type: 'community', author: 'system', time: '24 mar' }
]

type TabType = 'blog' | 'community' | 'updates'

export default function TrendingWidget() {
    const { addWindow } = useApp()
    const { t } = useTranslation()
    const [blogPosts, setBlogPosts] = useState<TopPost[]>([])
    const [comPosts, setComPosts] = useState<TopPost[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<TabType>('blog')
    const [currentPage, setCurrentPage] = useState(0)
    const [totalPosts, setTotalPosts] = useState(0)
    const [totalEntries, setTotalEntries] = useState(0)
    const itemsPerPage = 3

    const fetchTopPosts = async () => {
        setLoading(true)
        try {
            // 10 Posts (Joined with profiles for real avatar)
            const { data: bData, error: bError } = await supabase
                .from('posts')
                .select('id, title, slug, view_count, author, author_id, created_at, profiles(username, avatar_url)')
                .eq('published', true)
                .order('view_count', { ascending: false })
                .limit(10)

            if (bError) console.error('Blog fetch error:', bError)

            // 10 Community Posts
            const { data: cData, error: cError } = await supabase
                .from('community_posts')
                .select('id, title, view_count, created_at, profiles(username, avatar_url)')
                .is('post_slug', null)
                .order('view_count', { ascending: false })
                .limit(10)

            if (cError) console.error('Community fetch error:', cError)

            // Fetch Total Counts from entire DB
            const { count: pCount } = await supabase.from('posts').select('*', { count: 'exact', head: true }).eq('published', true)
            const { count: eCount } = await supabase.from('community_posts').select('*', { count: 'exact', head: true }).is('post_slug', null)

            setTotalPosts(pCount || 0)
            setTotalEntries(eCount || 0)

            setBlogPosts(bData?.map(p => {
                const profiles = p.profiles as unknown as { username?: string; avatar_url?: string } | null
                return {
                    id: p.id,
                    title: p.title,
                    slug: p.slug,
                    view_count: p.view_count,
                    author: profiles?.username || p.author || 'anonymous',
                    avatar_url: profiles?.avatar_url,
                    type: 'blog' as const,
                    time: new Date(p.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                }
            }) || [])

            setComPosts(cData?.map(p => {
                const profiles = p.profiles as unknown as { username?: string; avatar_url?: string } | null
                return {
                    id: p.id,
                    title: p.title,
                    view_count: p.view_count,
                    author: profiles?.username || 'anonymous',
                    avatar_url: profiles?.avatar_url,
                    type: 'community' as const,
                    time: new Date(p.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                }
            }) || [])

        } catch (err) {
            console.error('Error fetching trending posts:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchTopPosts()
    }, [])

    const handleOpen = (post: TopPost) => {
        if (activeTab === 'updates') return // News items don't open posts
        const title = post.title.toLowerCase()
        if (post.type === 'blog') {
            addWindow({ key: `post-${post.slug}`, path: `/posts/${post.slug}`, title })
        } else {
            addWindow({ key: `q-${post.id}`, path: `/questions/${post.id}`, title })
        }
    }

    const currentPosts = activeTab === 'blog' ? blogPosts : (activeTab === 'community' ? comPosts : manualUpdates)
    const totalPages = Math.ceil(currentPosts.length / itemsPerPage)

    if (!loading && blogPosts.length === 0 && comPosts.length === 0) return null

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-20 md:bottom-24 left-4 right-4 md:left-auto md:right-10 w-auto md:w-[380px] lg:w-[400px] bg-white/70 dark:bg-black/70 supports-[backdrop-filter]:backdrop-blur-[20px] shadow-[0_16px_48px_-16px_rgba(0,0,0,0.2)] dark:shadow-[0_16px_48px_-16px_rgba(0,0,0,0.5)] z-50 font-sans border border-black/10 dark:border-white/10 rounded-[28px]"
        >
            {/* 1. Toolbar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-black/5 dark:border-white/5">
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                        {activeTab === 'blog' ? (
                            <IconDocument className="w-3.5 h-3.5 text-primary" />
                        ) : activeTab === 'community' ? (
                            <IconSparkles className="w-3.5 h-3.5 text-primary" />
                        ) : (
                            <IconNotification className="w-3.5 h-3.5 text-primary" />
                        )}
                        <span className="text-[12px] font-bold text-primary lowercase tracking-tight">
                            {activeTab === 'blog' ? 'trending posts' : activeTab === 'community' ? 'trending entries' : 'updates'}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3 text-[11px] opacity-60">
                    <span className="lowercase text-[10px] font-bold font-mono">
                        {(currentPage * itemsPerPage) + 1}-{Math.min((currentPage + 1) * itemsPerPage, currentPosts.length)} of {currentPosts.length}
                    </span>
                    <div className="flex items-center gap-2">
                        <IconRefresh
                            role="button"
                            aria-label={t('widget.refresh')}
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fetchTopPosts(); } }}
                            className={`w-3 h-3 opacity-60 cursor-pointer hover:opacity-100 mr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20 rounded-sm ${loading ? 'animate-spin' : ''}`}
                            onClick={fetchTopPosts}
                        />
                        <IconChevronLeft
                            role="button"
                            aria-label={t('widget.prev_page')}
                            tabIndex={currentPage === 0 ? -1 : 0}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCurrentPage(prev => Math.max(0, prev - 1)); } }}
                            className={`w-3.5 h-3.5 cursor-pointer hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20 rounded-sm ${currentPage === 0 ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}
                            onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                        />
                        <IconChevronRight
                            role="button"
                            aria-label={t('widget.next_page')}
                            tabIndex={currentPage >= totalPages - 1 ? -1 : 0}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCurrentPage(prev => prev + 1); } }}
                            className={`w-3.5 h-3.5 cursor-pointer hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20 rounded-sm ${currentPage >= totalPages - 1 ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                        />
                    </div>
                </div>
            </div>

            {/* 2. Categorized Tabs (Segmented Control style) */}
            <div className="bg-black/5 dark:bg-white/5 rounded-[18px] p-0.5 mx-4 my-2 flex gap-0.5 border border-black/5 dark:border-white/5">
                <button
                    onClick={() => { setActiveTab('blog'); setCurrentPage(0); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-[11.5px] font-semibold transition-all duration-300 lowercase rounded-[15px] cursor-pointer ${
                        activeTab === 'blog'
                            ? 'bg-white/95 dark:bg-white/10 text-black dark:text-white shadow-[0_2px_8px_rgba(0,0,0,0.05)] border border-black/5 dark:border-white/10'
                            : 'text-primary/70 hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'
                    }`}
                >
                    <IconDocument className="w-3.5 h-3.5" />
                    <span>posts</span>
                </button>

                <button
                    onClick={() => { setActiveTab('community'); setCurrentPage(0); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-[11.5px] font-semibold transition-all duration-300 lowercase rounded-[15px] cursor-pointer ${
                        activeTab === 'community'
                            ? 'bg-white/95 dark:bg-white/10 text-black dark:text-white shadow-[0_2px_8px_rgba(0,0,0,0.05)] border border-black/5 dark:border-white/10'
                            : 'text-primary/70 hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'
                    }`}
                >
                    <IconSparkles className="w-3.5 h-3.5" />
                    <span>entries</span>
                </button>

                <button
                    onClick={() => { setActiveTab('updates'); setCurrentPage(0); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-[11.5px] font-semibold transition-all duration-300 lowercase rounded-[15px] cursor-pointer ${
                        activeTab === 'updates'
                            ? 'bg-white/95 dark:bg-white/10 text-black dark:text-white shadow-[0_2px_8px_rgba(0,0,0,0.05)] border border-black/5 dark:border-white/10'
                            : 'text-primary/70 hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'
                    }`}
                >
                    <IconNotification className="w-3.5 h-3.5" />
                    <span>updates</span>
                </button>
            </div>

            {/* 3. List Area */}
            <div className="max-h-[220px] overflow-y-auto custom-scrollbar bg-transparent px-3 pb-3 flex flex-col gap-1">
                {currentPosts.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage).map((post) => (
                    <div
                        key={`${post.type}-${post.id}`}
                        role={activeTab !== 'updates' ? "button" : undefined}
                        aria-label={activeTab !== 'updates' ? `${t('widget.open_post')}: ${post.title}` : undefined}
                        tabIndex={activeTab !== 'updates' ? 0 : -1}
                        onKeyDown={(e) => {
                            if (activeTab !== 'updates' && (e.key === 'Enter' || e.key === ' ')) {
                                e.preventDefault()
                                handleOpen(post)
                            }
                        }}
                        onClick={() => activeTab !== 'updates' && handleOpen(post)}
                        className={`group flex items-center px-3 py-2 border border-transparent transition-all duration-200 rounded-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20 ${
                            activeTab === 'updates'
                                ? 'cursor-default'
                                : 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 hover:border-black/5 dark:hover:border-white/5'
                        }`}
                    >
                        {/* Author Avatar or System Icon */}
                        <div className="mr-2.5 flex-shrink-0">
                            {activeTab === 'updates' ? (
                                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center border border-primary/5">
                                    <IconNotification className="w-3 h-3 text-primary" />
                                </div>
                            ) : post.avatar_url ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                    src={post.avatar_url}
                                    alt={post.author}
                                    className="w-5 h-5 rounded-full object-cover border border-black/10 dark:border-white/10 shadow-sm"
                                />
                            ) : (
                                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary lowercase border border-black/10 dark:border-white/10">
                                    {(post.author || 'a').charAt(0)}
                                </div>
                            )}
                        </div>

                        {/* Title */}
                        <div className="flex-1 min-w-0 pr-3">
                            <span className={`text-[12px] font-semibold text-primary lowercase block truncate`}>
                                {post.title}
                            </span>
                        </div>

                        {/* Right side - Views & Time */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                            {activeTab !== 'updates' && (
                                <div className="flex items-center gap-1 text-[10px] font-bold text-primary opacity-30 lowercase">
                                    <IconEye className="w-3 h-3" />
                                    <span>{post.view_count || 0}</span>
                                </div>
                            )}
                            <span className="text-[10px] font-bold text-primary opacity-50 whitespace-nowrap lowercase font-mono">
                                {post.time}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 bg-black/5 dark:bg-white/5 border-t border-black/5 dark:border-white/5 flex justify-between items-center text-[9px] opacity-40 lowercase font-bold rounded-b-[28px] font-mono">
                <div className="flex gap-3">
                    {activeTab === 'blog' ? (
                        <span>1-{blogPosts.length} of {totalPosts} posts</span>
                    ) : activeTab === 'community' ? (
                        <span>1-{comPosts.length} of {totalEntries} entries</span>
                    ) : (
                        <span>{manualUpdates.length} updates</span>
                    )}
                </div>
                <div className="flex items-center">
                    <IconApps className="w-3.5 h-3.5" />
                </div>
            </div>
        </motion.div>
    )
}
