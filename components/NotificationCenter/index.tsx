"use client"

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, MessageSquare, Newspaper, Zap, Info } from 'lucide-react'
import { supabase } from 'lib/supabase'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import OSButton from 'components/OSButton'
import ScrollArea from 'components/RadixUI/ScrollArea'

dayjs.extend(relativeTime)

interface Notification {
    id: string
    title: string
    description: string
    type: 'post' | 'comment' | 'system'
    timestamp: string
    link?: string
}

export default function NotificationCenter() {
    const [isOpen, setIsOpen] = useState(false)
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [hasUnread, setHasUnread] = useState(false)

    useEffect(() => {
        fetchNotifications()
    }, [])

    const fetchNotifications = async () => {
        try {
            // Fetch 3 latest posts
            const { data: posts } = await supabase
                .from('posts')
                .select('slug, title, created_at')
                .order('created_at', { ascending: false })
                .limit(3)

            // Fetch 3 latest community questions
            const { data: questions } = await supabase
                .from('community_posts')
                .select('id, title, created_at')
                .order('created_at', { ascending: false })
                .limit(3)

            const formattedPosts: Notification[] = (posts || []).map(p => ({
                id: `post-${p.slug}`,
                title: 'New Publication',
                description: p.title,
                type: 'post',
                timestamp: p.created_at,
                link: `/posts/${p.slug}`
            }))

            const formattedQuestions: Notification[] = (questions || []).map(q => ({
                id: `q-${q.id}`,
                title: 'New Forum Activity',
                description: q.title,
                type: 'comment',
                timestamp: q.created_at,
                link: `/questions/${q.id}`
            }))

            const all = [...formattedPosts, ...formattedQuestions]
                .sort((a, b) => dayjs(b.timestamp).unix() - dayjs(a.timestamp).unix())

            setNotifications(all)
            if (all.length > 0) setHasUnread(true)
        } catch (error) {
            console.error('Error fetching notifications:', error)
        }
    }

    const toggleOpen = () => {
        setIsOpen(!isOpen)
        if (!isOpen) setHasUnread(false)
    }

    return (
        <div className="relative">
            <OSButton
                onClick={toggleOpen}
                size="sm"
                className={`!px-1 group/notif relative translate-y-[2px] transition-all ${isOpen ? 'bg-primary/5 dark:bg-white/10' : ''}`}
            >
                <div className="relative px-1 h-5 flex items-center justify-center">
                    <Bell className={`size-[18px] text-black transition-transform group-hover/notif:scale-110 ${hasUnread ? 'animate-wiggle' : ''}`} strokeWidth={1.5} />
                    {hasUnread && (
                        <span className="absolute top-0 right-0 size-2 bg-blue-primary rounded-full border border-accent shadow-sm" />
                    )}
                </div>
            </OSButton>

            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop for closing */}
                        <div 
                            className="fixed inset-0 z-[9998]" 
                            onClick={() => setIsOpen(false)}
                        />
                        
                        <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.15, ease: 'easeOut' }}
                            className="absolute right-0 top-full mt-2 w-72 max-h-[420px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-[0_12px_44px_-12px_rgba(0,0,0,0.25)] z-[9999] flex flex-col overflow-hidden rounded-md lowercase font-mono"
                        >
                            <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50">
                                <div className="flex items-center gap-2">
                                    <div className="size-1.5 rounded-full bg-blue-primary animate-pulse" />
                                    <h3 className="font-bold text-[10px] tracking-widest opacity-50 uppercase">activity</h3>
                                </div>
                                <button 
                                    onClick={() => setIsOpen(false)}
                                    className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-colors text-primary"
                                >
                                    <X className="size-3 opacity-40" />
                                </button>
                            </div>

                            <ScrollArea className="flex-1 min-h-0">
                                <div className="p-1.5 space-y-0.5">
                                    {notifications.length === 0 ? (
                                        <div className="py-10 text-center">
                                            <Bell className="size-6 mx-auto opacity-10 mb-2" />
                                            <p className="text-[11px] opacity-40">no recent activities</p>
                                        </div>
                                    ) : (
                                        notifications.map((notif) => (
                                            <div 
                                                key={notif.id}
                                                className="p-2.5 rounded hover:bg-zinc-800/10 dark:hover:bg-white/5 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 transition-all cursor-pointer group flex gap-3"
                                            >
                                                <div className="size-7 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-blue-primary/10 transition-colors">
                                                    {notif.type === 'post' ? (
                                                        <Newspaper className="size-3.5 text-blue-primary opacity-60" />
                                                    ) : (
                                                        <MessageSquare className="size-3.5 text-blue-primary opacity-60" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-0.5">
                                                        <span className="text-[9px] font-bold tracking-wider opacity-30">{notif.title}</span>
                                                        <span className="text-[9px] opacity-30">{dayjs(notif.timestamp).fromNow()}</span>
                                                    </div>
                                                    <p className="text-[12px] font-bold leading-snug line-clamp-2 text-primary group-hover:text-blue-primary transition-colors pr-1">
                                                        {notif.description}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>

                            <div className="px-3 py-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center">
                                <p className="text-[9px] font-bold opacity-30 tracking-widest lowercase">system online</p>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}
