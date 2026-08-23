import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    IconSearch,
    IconX,
    IconDocument,
    IconMinus,
    IconSparkles,
    IconArrowRight,
    IconApps,
} from '@posthog/icons'
import { useApp, useAppActions, useAppWindows } from '../../context/App'
import { searchSupabasePosts, SupabasePost } from '../../lib/supabaseBlog'

export default function CommandPalette() {
    const { windows } = useAppWindows()
    const { addWindow, updateWindow, updateSiteSettings } = useAppActions()
    const { siteSettings } = useApp()

    const [isOpen, setIsOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [posts, setPosts] = useState<SupabasePost[]>([])
    const inputRef = useRef<HTMLInputElement | null>(null)

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault()
                setIsOpen((prev) => !prev)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50)
        } else {
            setQuery('')
            setPosts([])
            setSelectedIndex(0)
        }
    }, [isOpen])

    useEffect(() => {
        if (!isOpen) return
        const q = query.trim()
        if (q.length < 2) {
            setPosts([])
            return
        }
        let cancelled = false
        const timer = window.setTimeout(() => {
            searchSupabasePosts(q).then((res) => {
                if (!cancelled) setPosts((res || []).slice(0, 5))
            })
        }, 200)
        return () => {
            cancelled = true
            window.clearTimeout(timer)
        }
    }, [isOpen, query])

    const matchedPosts = posts

    const baseActions = [
        {
            id: 'app-blog',
            label: 'open blog posts',
            category: 'navigation',
            icon: <IconDocument className="size-4" />,
            action: () =>
                addWindow({
                    key: 'blog',
                    path: '/blog',
                    title: 'Blog',
                    size: { width: 960, height: 680 },
                }),
        },
        {
            id: 'app-community',
            label: 'open community forum',
            category: 'navigation',
            icon: <IconApps className="size-4" />,
            action: () =>
                addWindow({
                    key: 'community',
                    path: '/community',
                    title: 'Community',
                    size: { width: 960, height: 680 },
                }),
        },
        {
            id: 'toggle-theme',
            label: siteSettings.colorMode === 'dark' ? 'switch to light theme' : 'switch to dark theme',
            category: 'system',
            icon: <IconSparkles className="size-4" />,
            action: () =>
                updateSiteSettings({
                    ...siteSettings,
                    colorMode: siteSettings.colorMode === 'dark' ? 'light' : 'dark',
                }),
        },
        {
            id: 'minimize-all',
            label: 'minimize all windows',
            category: 'system',
            icon: <IconMinus className="size-4" />,
            action: () => windows.forEach((w) => updateWindow(w, { minimized: true })),
        },
    ]

    const filteredActions = baseActions.filter(
        (a) => !query.trim() || a.label.toLowerCase().includes(query.toLowerCase())
    )

    const allItems = [
        ...matchedPosts.map((p) => ({
            id: `post-${p.id}`,
            label: p.title.toLowerCase(),
            category: 'articles',
            icon: <IconDocument className="size-4" />,
            action: () =>
                addWindow({
                    key: `post-${p.id}`,
                    path: `/blog/${p.slug}`,
                    title: p.title,
                    size: { width: 920, height: 660 },
                }),
        })),
        ...filteredActions,
    ]

    useEffect(() => {
        setSelectedIndex(0)
    }, [query])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSelectedIndex((prev) => (prev + 1) % Math.max(1, allItems.length))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSelectedIndex((prev) => (prev - 1 + allItems.length) % Math.max(1, allItems.length))
        } else if (e.key === 'Enter') {
            e.preventDefault()
            const selected = allItems[selectedIndex]
            if (selected) {
                selected.action()
                setIsOpen(false)
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false)
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="keyboard-pad fixed inset-0 z-[100000] flex items-start justify-center pt-20 sm:pt-28 px-4 bg-black/40 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="w-full max-w-xl bg-accent border border-secondary rounded-xl shadow-2xl overflow-hidden text-primary"
                        onKeyDown={handleKeyDown}
                    >
                        <div className="flex items-center px-4 py-3 border-b border-secondary gap-3">
                            <IconSearch className="size-5 text-secondary shrink-0" />
                            <input
                                ref={inputRef}
                                type="text"
                                className="w-full bg-transparent text-base font-semibold outline-none placeholder:text-secondary"
                                placeholder="Type a command or search articles... (Esc to exit)"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 rounded hover:bg-primary/10 transition-colors"
                            >
                                <IconX className="size-4 text-secondary" />
                            </button>
                        </div>

                        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
                            {allItems.length === 0 ? (
                                <div className="p-4 text-center text-xs text-secondary font-medium">
                                    No matching commands or articles found.
                                </div>
                            ) : (
                                allItems.map((item, idx) => {
                                    const isSelected = idx === selectedIndex
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => {
                                                item.action()
                                                setIsOpen(false)
                                            }}
                                            onMouseEnter={() => setSelectedIndex(idx)}
                                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors lowercase ${
                                                isSelected
                                                    ? 'bg-blue text-white'
                                                    : 'hover:bg-primary/5 text-primary'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5 truncate">
                                                <span className={isSelected ? 'text-white' : 'text-secondary'}>
                                                    {item.icon}
                                                </span>
                                                <span className="truncate">{item.label}</span>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0 ml-2">
                                                <span
                                                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                                        isSelected
                                                            ? 'bg-white/20 text-white'
                                                            : 'bg-primary/10 text-secondary'
                                                    }`}
                                                >
                                                    {item.category}
                                                </span>
                                                {isSelected && <IconArrowRight className="size-3 text-white ml-1" />}
                                            </div>
                                        </button>
                                    )
                                })
                            )}
                        </div>

                        <div className="px-4 py-2 border-t border-secondary bg-primary/5 flex items-center justify-between text-[11px] text-secondary font-mono">
                            <span>Navigation: ↑↓ Navigate • ↵ Select</span>
                            <span>Shortcut: ⌘K / Ctrl+K</span>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
