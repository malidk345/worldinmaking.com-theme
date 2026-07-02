"use client"

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, MessageSquare, Newspaper } from 'lucide-react'
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
                            initial={{ opacity: 0, scale: 0.95, y: -10, filter: 'blur(10px)' }}
                            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, scale: 0.95, y: -10, filter: 'blur(10px)' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            style={{ willChange: 'auto' }}
                            className="absolute right-0 top-full mt-2 w-[320px] max-h-[420px] bg-white/80 dark:bg-black/80 supports-[backdrop-filter]:backdrop-blur-[60px] border border-black/5 dark:border-white/5 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.1)] z-[9999] flex flex-col overflow-hidden rounded-[32px] lowercase font-mono"
                        >
                            <div className="px-4 py-3 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="size-1.5 rounded-full bg-blue-primary animate-pulse" />
                                    <h3 className="font-bold text-[11px] tracking-tight opacity-50 uppercase">activity</h3>
                                </div>
                                <button 
                                    onClick={() => setIsOpen(false)}
                                    className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors text-primary"
                                >
                                    <X className="size-3 opacity-40" />
                                </button>
                            </div>

                            <ScrollArea className="flex-1 min-h-0">
                                <div className="p-2 space-y-1">
                                    {notifications.length === 0 ? (
                                        <div className="py-12 text-center">
                                            <Bell className="size-8 mx-auto opacity-10 mb-3" />
                                            <p className="text-[12px] opacity-40">no recent activities</p>
                                        </div>
                                    ) : (
                                        notifications.map((notif) => (
                                            <div 
                                                key={notif.id}
                                                className="p-3 rounded-[24px] hover:bg-black/5 dark:hover:bg-white/10 border border-transparent hover:border-black/5 dark:hover:border-white/10 transition-all cursor-pointer group flex gap-3"
                                            >
                                                <div className="size-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-blue-primary/10 transition-colors">
                                                    {notif.type === 'post' ? (
                                                        <Newspaper className="size-4 text-blue-primary opacity-60" />
                                                    ) : (
                                                        <MessageSquare className="size-4 text-blue-primary opacity-60" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-0.5">
                                                        <span className="text-[10px] font-bold tracking-tight opacity-40 uppercase">{notif.title}</span>
                                                        <span className="text-[10px] opacity-40">{dayjs(notif.timestamp).fromNow()}</span>
                                                    </div>
                                                    <p className="text-[13px] font-bold leading-snug line-clamp-2 text-primary group-hover:text-blue-primary transition-colors pr-1 mt-0.5">
                                                        {notif.description}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>

                            <div className="px-4 py-3 border-t border-black/5 dark:border-white/5 flex items-center justify-center">
                                <p className="text-[10px] font-bold opacity-30 tracking-tight lowercase">system online</p>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}
