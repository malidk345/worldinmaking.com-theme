"use client"

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, TrendingUp, ChevronRight } from 'lucide-react'
import { supabase } from 'lib/supabase'
import { useApp } from 'context/App'
import Loading from 'components/Loading'

interface TopPost {
    id: string | number
    title: string
    view_count: number
    type: 'blog' | 'community'
    slug?: string
}

export default function TrendingWidget() {
    const { addWindow } = useApp()
    const [posts, setPosts] = useState<TopPost[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchTopPosts = async () => {
            try {
                // Fetch top 3 from posts (blog)
                const { data: blogPosts } = await supabase
                    .from('posts')
                    .select('id, title, slug, view_count')
                    .eq('published', true)
                    .order('view_count', { ascending: false })
                    .limit(3)

                // Fetch top 3 from community_posts
                const { data: comPosts } = await supabase
                    .from('community_posts')
                    .select('id, title, view_count')
                    .is('post_slug', null) // Only main posts
                    .order('view_count', { ascending: false })
                    .limit(3)

                const combined: TopPost[] = [
                    ...(blogPosts?.map(p => ({ ...p, type: 'blog' as const })) || []),
                    ...(comPosts?.map(p => ({ ...p, type: 'community' as const })) || [])
                ].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 5)

                setPosts(combined)
            } catch (err) {
                console.error('Error fetching trending posts:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchTopPosts()
    }, [])

    const handleOpen = (post: TopPost) => {
        if (post.type === 'blog') {
             addWindow({
                key: `post-${post.slug}`,
                path: `/posts/${post.slug}`,
                title: post.title
            })
        } else {
             addWindow({
                key: `q-${post.id}`,
                path: `/questions/${post.id}`,
                title: post.title
            })
        }
    }

    if (loading) return null

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-24 right-10 w-72 bg-white/80 dark:bg-black/40 backdrop-blur-xl rounded-2xl border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden z-10"
        >
            <div className="p-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-black/[0.02]">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-burnt-orange/10 rounded-lg">
                        <TrendingUp className="w-4 h-4 text-burnt-orange" />
                    </div>
                    <span className="text-xs font-black tracking-widest lowercase opacity-60">trending now</span>
                </div>
            </div>

            <div className="p-2 space-y-1">
                {posts.length > 0 ? (
                    posts.map((post, idx) => (
                        <button
                            key={`${post.type}-${post.id}`}
                            onClick={() => handleOpen(post)}
                            className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all group text-left"
                        >
                            <div className="flex flex-col gap-0.5 min-w-0 pr-4">
                                <span className="text-[13px] font-bold text-primary truncate lowercase leading-tight">
                                    {post.title}
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-tighter opacity-30 group-hover:opacity-100 transition-opacity">
                                        {post.type}
                                    </span>
                                    <div className="flex items-center gap-1 text-[10px] opacity-40">
                                        <Eye className="w-3 h-3" />
                                        <span>{post.view_count || 0}</span>
                                    </div>
                                </div>
                            </div>
                            <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-40 transition-all -translate-x-2 group-hover:translate-x-0" />
                        </button>
                    ))
                ) : (
                    <div className="p-8 text-center opacity-30 lowercase text-xs">no data available</div>
                )}
            </div>
            
            <div className="px-4 py-3 bg-black/[0.02] border-t border-black/5 dark:border-white/5">
                <div className="flex justify-between items-center opacity-40 text-[10px] font-bold lowercase">
                    <span>realtime updates</span>
                    <div className="flex gap-1 items-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>live</span>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}
