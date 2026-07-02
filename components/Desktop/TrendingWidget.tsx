"use client"

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    LayoutGrid,
    Eye,
    FileText,
    MessageCircle,
    Bell,
} from 'lucide-react'
import { supabase } from 'lib/supabase'
import { useApp } from 'context/App'

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
    const [blogPosts, setBlogPosts] = useState<TopPost[]>([])
    const [comPosts, setComPosts] = useState<TopPost[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<TabType>('blog')
    const [currentPage, setCurrentPage] = useState(0)
    const [totalPosts, setTotalPosts] = useState(0)
    const [totalEntries, setTotalEntries] = useState(0)
    const itemsPerPage = 5

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
            className="fixed bottom-20 md:bottom-24 left-4 right-4 md:left-auto md:right-10 w-auto md:w-[700px] lg:w-[820px] bg-white dark:bg-[#1a1c1e] shadow-2xl z-50 font-sans border border-[#dadce0] dark:border-[#3c4043] rounded-[4px] overflow-hidden"
        >
            {/* 1. Toolbar */}
            <div className="flex items-center justify-between px-2 md:px-4 py-2 border-b border-[#f1f3f4] dark:border-[#3c4043]">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        {activeTab === 'blog' ? (
                            <FileText className="w-4 h-4 text-red-600" />
                        ) : activeTab === 'community' ? (
                            <MessageCircle className="w-4 h-4 text-emerald-600" />
                        ) : (
                            <Bell className="w-4 h-4 text-[#172b4d]" />
                        )}
                        <span className="text-[13px] font-black text-primary lowercase tracking-tight">
                            {activeTab === 'blog' ? 'trending posts' : activeTab === 'community' ? 'trending entries' : 'updates'}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-4 text-[12px] opacity-60">
                    <span className="lowercase text-[11px] font-bold">
                        {(currentPage * itemsPerPage) + 1}-{Math.min((currentPage + 1) * itemsPerPage, currentPosts.length)} of {currentPosts.length}
                    </span>
                    <div className="flex items-center gap-2">
                        <RefreshCw
                            className={`w-3.5 h-3.5 opacity-60 cursor-pointer hover:opacity-100 mr-2 ${loading ? 'animate-spin' : ''}`}
                            onClick={fetchTopPosts}
                        />
                        <ChevronLeft
                            className={`w-4 h-4 cursor-pointer hover:opacity-100 ${currentPage === 0 ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}
                            onClick={() => setCurrentPage(0)}
                        />
                        <ChevronRight
                            className={`w-4 h-4 cursor-pointer hover:opacity-100 ${currentPage >= totalPages - 1 ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                        />
                    </div>
                </div>
            </div>

            {/* 2. Categorized Tabs (Blog & Community) */}
            <div className="flex items-center border-b border-[#f1f3f4] dark:border-[#3c4043]">
                <div
                    onClick={() => { setActiveTab('blog'); setCurrentPage(0); }}
                    className={`flex-1 flex items-center gap-2 md:gap-3 px-3 md:px-5 py-3 cursor-pointer transition-colors border-b-2 ${activeTab === 'blog' ? 'border-red-600 bg-red-50/10' : 'border-transparent hover:bg-black/5 opacity-60'}`}
                >
                    <FileText className={`w-4 h-4 ${activeTab === 'blog' ? 'text-red-600' : ''}`} />
                    <div className="flex flex-col min-w-0">
                        <span className={`text-[13px] font-bold lowercase flex items-center gap-2 ${activeTab === 'blog' ? 'text-red-700' : ''}`}>
                            posts
                        </span>
                        <span className="hidden md:inline text-[11px] opacity-50 lowercase truncate">trending, articles, worldinmaking</span>
                    </div>
                </div>

                <div
                    onClick={() => { setActiveTab('community'); setCurrentPage(0); }}
                    className={`flex-1 flex items-center gap-2 md:gap-3 px-3 md:px-5 py-3 cursor-pointer transition-colors border-b-2 ${activeTab === 'community' ? 'border-emerald-600 bg-emerald-600/10' : 'border-transparent hover:bg-black/5 opacity-60'}`}
                >
                    <MessageCircle className={`w-4 h-4 ${activeTab === 'community' ? 'text-emerald-600' : ''}`} />
                    <div className="flex flex-col min-w-0">
                        <span className={`text-[13px] font-bold lowercase flex items-center gap-2 ${activeTab === 'community' ? 'text-emerald-700' : ''}`}>
                            entries
                        </span>
                        <span className="hidden md:inline text-[11px] opacity-50 lowercase truncate">discussions, community, questions</span>
                    </div>
                </div>

                <div
                    onClick={() => { setActiveTab('updates'); setCurrentPage(0); }}
                    className={`flex-1 flex items-center gap-2 md:gap-3 px-3 md:px-5 py-3 cursor-pointer transition-colors border-b-2 ${activeTab === 'updates' ? 'border-[#172b4d] bg-blue-900/5' : 'border-transparent hover:bg-black/5 opacity-40'}`}
                >
                    <Bell className={`w-4 h-4 ${activeTab === 'updates' ? 'text-[#172b4d]' : ''}`} />
                    <div className="flex flex-col min-w-0">
                        <span className={`text-[13px] font-bold lowercase flex items-center gap-2 ${activeTab === 'updates' ? 'text-[#172b4d]' : ''}`}>
                            updates
                        </span>
                        <span className="hidden md:inline text-[11px] opacity-50 lowercase truncate">system logs, fix, status</span>
                    </div>
                </div>
            </div>

            {/* 3. List Area */}
            <div className="max-h-[35vh] md:max-h-[380px] overflow-y-auto custom-scrollbar bg-white dark:bg-[#1a1c1e]">
                {currentPosts.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage).map((post) => (
                    <div
                        key={`${post.type}-${post.id}`}
                        onClick={() => activeTab !== 'updates' && handleOpen(post)}
                        className={`group flex items-center px-3 md:px-4 py-2 border-b border-[#f1f3f4] dark:border-[#3c4043]/50 transition-all ${activeTab === 'updates' ? 'cursor-default' : 'cursor-pointer hover:bg-[#f2f6fc] dark:hover:bg-white/5'} relative`}
                    >
                        {/* Author Avatar or System Icon */}
                        <div className="mr-3 flex-shrink-0">
                            {activeTab === 'updates' ? (
                                <div className="w-5 h-5 rounded-full bg-slate-900/10 flex items-center justify-center border border-slate-900/20">
                                    <Bell className="w-3 h-3 text-[#172b4d]" />
                                </div>
                            ) : post.avatar_url ? (
                                <img
                                    src={post.avatar_url}
                                    alt={post.author}
                                    className="w-5 h-5 rounded-full object-cover border border-[#dadce0] dark:border-[#3c4043]"
                                />
                            ) : (
                                <div className="w-5 h-5 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-[10px] font-black text-primary lowercase border border-[#dadce0] dark:border-[#3c4043]">
                                    {(post.author || 'a').charAt(0)}
                                </div>
                            )}
                        </div>

                        {/* Title & Body Preview */}
                        <div className="flex-1 flex items-baseline gap-2 min-w-0 pr-4 overflow-hidden">
                            <span className={`text-[12px] md:text-[13px] font-black text-primary lowercase ${activeTab === 'updates' ? '' : 'truncate'}`}>
                                {post.title}
                            </span>
                            {activeTab !== 'updates' && (
                                <span className="text-[11px] md:text-[13px] text-primary/40 truncate lowercase hidden sm:inline">
                                    - trending {post.type} with {post.view_count} views...
                                </span>
                            )}
                        </div>

                        {/* Right side - Views & Time */}
                        <div className="flex items-center gap-3 md:gap-6 flex-shrink-0">
                            {activeTab !== 'updates' && (
                                <div className="flex items-center gap-1.5 text-[10px] md:text-[11px] font-bold text-primary opacity-30 lowercase">
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>{post.view_count || 0}</span>
                                </div>
                            )}
                            <span className="text-[10px] md:text-[11px] font-bold text-primary opacity-60 whitespace-nowrap lowercase">
                                {post.time}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-[#f8f9fa] dark:bg-black/20 border-t border-[#f1f3f4] dark:border-[#3c4043] flex justify-between items-center text-[10px] opacity-40 lowercase font-bold">
                <div className="flex gap-3">
                    {activeTab === 'blog' ? (
                        <span>1-{blogPosts.length} of {totalPosts} posts total</span>
                    ) : activeTab === 'community' ? (
                        <span>1-{comPosts.length} of {totalEntries} entries total</span>
                    ) : (
                        <span>{manualUpdates.length} updates total</span>
                    )}
                </div>
                <div className="flex items-center">
                    <LayoutGrid className="w-3.5 h-3.5" />
                </div>
            </div>
        </motion.div>
    )
}
