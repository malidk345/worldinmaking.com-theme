"use client"

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconChat, IconNewspaper, IconX } from '@posthog/icons';
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

const IconNotificationWithBadge = ({ 
    hasUnread, 
    className = '', 
    ...props 
}: React.SVGProps<SVGSVGElement> & { 
    hasUnread: boolean; 
}) => {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className={className}
            {...props}
        >
            {/* Box path */}
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M4.75 4.5C4.61193 4.5 4.5 4.61193 4.5 4.75V19.25C4.5 19.3881 4.61193 19.5 4.75 19.5H19.25C19.3881 19.5 19.5 19.3881 19.5 19.25V12.25C19.5 11.8358 19.8358 11.5 20.25 11.5C20.6642 11.5 21 11.8358 21 12.25V19.25C21 20.2165 20.2165 21 19.25 21H4.75C3.7835 21 3 20.2165 3 19.25V4.75C3 3.7835 3.7835 3 4.75 3H12.25C12.6642 3 13 3.75 13 3.75C13 4.16421 12.6642 4.5 12.25 4.5H4.75Z"
            />
            {/* Circle ring */}
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M19.7678 4.23223C18.7915 3.25592 17.2085 3.25592 16.2322 4.23223C15.2559 5.20854 15.2559 6.79146 16.2322 7.76777C17.2085 8.74408 18.7915 8.74408 19.7678 7.76777C20.7441 6.79146 20.7441 5.20854 19.7678 4.23223ZM15.1716 3.17157C16.7337 1.60948 19.2663 1.60948 20.8284 3.17157C22.3905 4.73367 22.3905 7.26633 20.8284 8.82843C19.2663 10.3905 16.7337 10.3905 15.1716 8.82843C13.6095 7.26633 13.6095 4.73367 15.1716 3.17157Z"
            />
            {/* If hasUnread is true, fill the circle with the current color */}
            {hasUnread && (
                <circle
                    cx="18"
                    cy="6"
                    r="1.77"
                    fill="currentColor"
                />
            )}
        </svg>
    )
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
                    <IconNotificationWithBadge hasUnread={hasUnread} className={`size-[18px] text-black transition-transform group-hover/notif:scale-110 ${hasUnread ? 'animate-wiggle' : ''}`} />
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
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30, mass: 1 }}
                            className="absolute right-0 top-full mt-3 w-80 max-h-[460px] bg-white/70 dark:bg-black/60 border border-black/5 dark:border-white/10 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.2),0_1px_4px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.4)] supports-[backdrop-filter]:backdrop-blur-3xl z-[9999] flex flex-col overflow-hidden rounded-[32px] font-sans tracking-tight text-primary"
                        >
                            <div className="px-5 py-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between bg-transparent">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-[15px] font-semibold tracking-tight m-0 capitalize">notifications</h2>
                                    <div className="size-1.5 rounded-full bg-blue-500 animate-pulse ml-1 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                </div>
                                <button 
                                    onClick={() => setIsOpen(false)}
                                    className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors text-primary"
                                >
                                    <IconX className="size-4 opacity-50" />
                                </button>
                            </div>

                            <ScrollArea className="flex-1 min-h-0 px-2 py-2">
                                <div className="flex flex-col gap-1.5">
                                    {notifications.length === 0 ? (
                                        <div className="py-16 text-center flex flex-col items-center justify-center gap-4">
                                            <div className="size-14 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center mb-2">
                                                <IconNotificationWithBadge hasUnread={false} className="size-6 opacity-40 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-mono text-xs font-black m-0 tracking-widest uppercase text-primary/60">all caught up</p>
                                                <p className="text-[10px] m-0 mt-1.5 max-w-[180px] mx-auto leading-relaxed lowercase text-primary/40">no new activities to display.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        notifications.map((notif) => (
                                            <a
                                                key={notif.id}
                                                href={notif.link || '#'}
                                                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-[24px] text-[13px] transition-all duration-300 border border-transparent hover:border-black/10 dark:hover:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-white/90 dark:hover:bg-white/10 text-primary hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)] group/item"
                                            >
                                                <div className="size-9 rounded-full bg-white dark:bg-black border border-black/10 dark:border-white/10 flex items-center justify-center shrink-0 group-hover/item:scale-105 transition-transform duration-300 shadow-sm">
                                                    {notif.type === 'post' ? (
                                                        <IconNewspaper className="size-4 text-blue-500 opacity-80" />
                                                    ) : (
                                                        <IconChat className="size-4 text-purple-500 opacity-80" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0 text-left">
                                                    <div className="flex items-center justify-between mb-0.5">
                                                        <span className="text-[10px] font-bold tracking-wider opacity-40 uppercase">{notif.title}</span>
                                                        <span className="text-[10px] opacity-40 font-medium">{dayjs(notif.timestamp).fromNow()}</span>
                                                    </div>
                                                    <p className="text-[13px] font-medium leading-snug line-clamp-2 text-primary pr-1">
                                                        {notif.description}
                                                    </p>
                                                </div>
                                            </a>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}
