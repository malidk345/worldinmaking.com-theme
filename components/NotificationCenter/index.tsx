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

            // ⚡ Bolt: Use Schwartzian transform to prevent O(N log N) Date parsing during sort.
            const mappedAll = [...formattedPosts, ...formattedQuestions].map(notif => ({
                notif,
                time: dayjs(notif.timestamp).unix()
            }))
            const all = mappedAll.sort((a, b) => b.time - a.time).map(m => m.notif)

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
                aria-label="Toggle notifications"
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
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.15, ease: 'easeOut' }}
                            className="absolute right-0 top-full mt-2 w-72 max-h-[420px] bg-[var(--color-bg-surface-primary)] border border-[var(--border-3000)] shadow-[0_12px_44px_-12px_rgba(0,0,0,0.25)] z-[9999] flex flex-col overflow-hidden rounded-md lowercase font-mono"
                        >
                            <div className="px-3 py-2 border-b border-[var(--border-3000)] flex items-center justify-between bg-[var(--color-accent-3000)]">
                                <div className="flex items-center gap-2">
                                    <div className="size-1.5 rounded-full bg-[var(--primary-3000)] animate-pulse" />
                                    <h3 className="font-bold text-[10px] tracking-widest opacity-50 uppercase">activity</h3>
                                </div>
                                <button 
                                    onClick={() => setIsOpen(false)}
                                    className="p-1 hover:bg-[var(--color-bg-fill-button-tertiary-hover)] rounded transition-colors text-primary"
                                    aria-label="Close notifications"
                                >
                                    <IconX className="size-3 opacity-40" />
                                </button>
                            </div>

                            <ScrollArea className="flex-1 min-h-0">
                                <div className="p-1.5 space-y-0.5">
                                    {notifications.length === 0 ? (
                                        <div className="py-10 text-center">
                                            <IconNotificationWithBadge hasUnread={false} className="size-6 mx-auto opacity-10 mb-2" />
                                            <p className="text-[11px] opacity-40">no recent activities</p>
                                        </div>
                                    ) : (
                                        notifications.map((notif) => (
                                            <div 
                                                key={notif.id}
                                                className="p-2.5 rounded hover:bg-[var(--color-bg-fill-button-tertiary-hover)] border border-transparent hover:border-[var(--border-3000)] transition-all cursor-pointer group flex gap-3"
                                            >
                                                <div className="size-7 rounded bg-[var(--color-bg-surface-primary)] border border-[var(--border-3000)] flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-[var(--primary-highlight)] transition-colors">
                                                    {notif.type === 'post' ? (
                                                        <IconNewspaper className="size-3.5 text-[var(--primary-3000)] opacity-60" />
                                                    ) : (
                                                        <IconChat className="size-3.5 text-[var(--primary-3000)] opacity-60" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-0.5">
                                                        <span className="text-[9px] font-bold tracking-wider opacity-30">{notif.title}</span>
                                                        <span className="text-[9px] opacity-30">{dayjs(notif.timestamp).fromNow()}</span>
                                                    </div>
                                                    <p className="text-[12px] font-bold leading-snug line-clamp-2 text-primary group-hover:text-[var(--primary-3000)] transition-colors pr-1">
                                                        {notif.description}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>

                            <div className="px-3 py-2 border-t border-[var(--border-3000)] bg-[var(--color-accent-3000)] flex items-center justify-center">
                                <p className="text-[9px] font-bold opacity-30 tracking-widest lowercase">system online</p>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}
