"use client"

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { IconApps, IconChevronLeft, IconChevronRight, IconDocument, IconRefresh, IconSparkles } from '@posthog/icons';
import { supabase } from 'lib/supabase'
import { useApp } from 'context/App'
import { LemonButton, Spinner } from '@/components/LemonUI'
import { ScrollableShadows } from '@/components/LemonUI/ScrollableShadows'

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

type TabType = 'blog' | 'community'

export default function TrendingWidget() {
    const { addWindow } = useApp()
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
            // 10 Posts
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
        const title = post.title.toLowerCase()
        if (post.type === 'blog') {
            addWindow({ key: `post-${post.slug}`, path: `/posts/${post.slug}`, title })
        } else {
            addWindow({ key: `q-${post.id}`, path: `/questions/${post.id}`, title })
        }
    }

    const currentPosts = activeTab === 'blog' ? blogPosts : comPosts
    const totalPages = Math.ceil(currentPosts.length / itemsPerPage)

    if (!loading && blogPosts.length === 0 && comPosts.length === 0) return null

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-20 md:bottom-24 left-4 right-4 md:left-auto md:right-10 w-auto md:w-[380px] lg:w-[400px] bg-[var(--glass-bg-3000)] border border-[var(--border-3000)] rounded-[var(--radius-lg)] shadow-[var(--shadow-elevation-3000)] backdrop-blur-md z-50 font-sans flex flex-col overflow-hidden text-[var(--text-3000)]"
        >
            {/* 1. Header Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-3000)]">
                <div className="flex items-center gap-1.5">
                    {activeTab === 'blog' ? (
                        <IconDocument className="w-3.5 h-3.5" />
                    ) : (
                        <IconSparkles className="w-3.5 h-3.5" />
                    )}
                    <span className="text-[12px] font-bold lowercase tracking-tight">
                        {activeTab === 'blog' ? 'trending posts' : 'trending entries'}
                    </span>
                </div>

                <div className="flex items-center gap-3 text-[11px] opacity-65">
                    <span className="lowercase text-[10px] font-bold font-mono">
                        {(currentPage * itemsPerPage) + 1}-{Math.min((currentPage + 1) * itemsPerPage, currentPosts.length)} of {currentPosts.length}
                    </span>
                    <div className="flex items-center gap-1">
                        <LemonButton
                            size="xxsmall"
                            type="tertiary"
                            onClick={fetchTopPosts}
                            icon={loading ? <Spinner /> : <IconRefresh className="w-3 h-3" />}
                        />
                        <LemonButton
                            size="xxsmall"
                            type="tertiary"
                            disabled={currentPage === 0}
                            onClick={() => setCurrentPage(0)}
                            icon={<IconChevronLeft className="w-3.5 h-3.5" />}
                        />
                        <LemonButton
                            size="xxsmall"
                            type="tertiary"
                            disabled={currentPage >= totalPages - 1}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            icon={<IconChevronRight className="w-3.5 h-3.5" />}
                        />
                    </div>
                </div>
            </div>

            {/* 2. Categorized Tabs (Single Horizontal Button) */}
            <div className="px-4 py-2 flex justify-center border-b border-[var(--border-3000)]">
                <div className="flex items-center w-full rounded-[var(--radius)] border border-[var(--border-3000)] overflow-hidden bg-[var(--color-bg-surface-primary)] shadow-sm">
                    <button
                        onClick={() => { setActiveTab('blog'); setCurrentPage(0); }}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer ${activeTab === 'blog' ? 'bg-[var(--color-fill-3000)] text-[var(--text-3000)]' : 'bg-transparent text-[var(--muted-3000)] hover:bg-black/5 dark:hover:bg-white/5'}`}
                    >
                        <IconDocument className="w-3.5 h-3.5" />
                        posts
                    </button>
                    <div className="w-px h-5 bg-[var(--border-3000)]"></div>
                    <button
                        onClick={() => { setActiveTab('community'); setCurrentPage(0); }}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer ${activeTab === 'community' ? 'bg-[var(--color-fill-3000)] text-[var(--text-3000)]' : 'bg-transparent text-[var(--muted-3000)] hover:bg-black/5 dark:hover:bg-white/5'}`}
                    >
                        <IconSparkles className="w-3.5 h-3.5" />
                        entries
                    </button>
                </div>
            </div>

            {/* 3. LemonTable */}
            <div className="LemonTable" style={{ border: 'none', borderRadius: 0 }}>
                <ScrollableShadows direction="both" innerStyle={{ maxHeight: '220px' }}>
                    {loading ? (
                        <div style={{ padding: '48px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '11px', color: 'var(--muted-3000)' }}>
                            <Spinner size="small" />
                            <span>loading trends...</span>
                        </div>
                    ) : currentPosts.length === 0 ? (
                        <div style={{ padding: '48px 0', textAlign: 'center', fontSize: '11px', color: 'var(--muted-3000)' }}>
                            no items found
                        </div>
                    ) : (
                        <div className="LemonTable__content">
                            <table>
                                <thead>
                                    <tr>
                                        <th className="LemonTable__header" style={{ width: '32px' }}>
                                            <div className="LemonTable__header-content"><div>#</div></div>
                                        </th>
                                        <th className="LemonTable__header">
                                            <div className="LemonTable__header-content"><div>Title</div></div>
                                        </th>
                                        <th className="LemonTable__header" style={{ width: '56px', textAlign: 'right' }}>
                                            <div className="LemonTable__header-content" style={{ justifyContent: 'flex-end' }}><div>Views</div></div>
                                        </th>
                                        <th className="LemonTable__header" style={{ width: '56px', textAlign: 'right' }}>
                                            <div className="LemonTable__header-content" style={{ justifyContent: 'flex-end' }}><div>Date</div></div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentPosts.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage).map((post, idx) => (
                                        <tr
                                            key={`${post.type}-${post.id}`}
                                            className="LemonTable__row"
                                            onClick={() => handleOpen(post)}
                                            style={{ cursor: 'pointer' }}
                                            onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--color-bg-fill-button-tertiary-hover, rgba(0,0,0,0.04))' }}
                                            onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = '' }}
                                        >
                                            <td style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--muted-3000)', width: '32px' }}>
                                                {currentPage * itemsPerPage + idx + 1}
                                            </td>
                                            <td style={{ maxWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                                    {post.avatar_url ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={post.avatar_url} alt={post.author} style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border-3000)' }} />
                                                    ) : (
                                                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'var(--color-bg-fill-button-tertiary-hover)', border: '1px solid var(--border-3000)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700 }}>
                                                            {(post.author || 'a').charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <span style={{ fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {post.title}
                                                    </span>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'right', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, opacity: 0.6, whiteSpace: 'nowrap', width: '56px' }}>
                                                {post.view_count || 0}
                                            </td>
                                            <td style={{ textAlign: 'right', fontSize: '11px', fontFamily: 'monospace', opacity: 0.6, whiteSpace: 'nowrap', width: '56px' }}>
                                                {post.time}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </ScrollableShadows>
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-[var(--border-3000)] flex justify-between items-center text-[9px] opacity-50 lowercase font-bold font-mono">
                <div className="flex gap-3">
                    {activeTab === 'blog' ? (
                        <span>1-{Math.min((currentPage + 1) * itemsPerPage, blogPosts.length)} of {totalPosts} posts</span>
                    ) : (
                        <span>1-{Math.min((currentPage + 1) * itemsPerPage, comPosts.length)} of {totalEntries} entries</span>
                    )}
                </div>
                <div className="flex items-center">
                    <IconApps className="w-3.5 h-3.5" />
                </div>
            </div>
        </motion.div>
    )
}
