"use client"

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconSearch, IconRocket, IconDocument, IconLightBulb, IconX, IconArrowRight, IconMinus, IconSparkles } from '@posthog/icons'
import { useApp } from '../../context/App'
import { usePosts } from '../../hooks/usePosts'
import { playWindowOpen, playWindowClose } from '../../lib/osAudio'

interface CommandPaletteProps {
    isOpen: boolean
    onClose: () => void
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
    const { addWindow, windows, updateWindow, siteSettings, updateSiteSettings } = useApp()
    const { posts } = usePosts()
    const [query, setQuery] = useState('')
    const [selectedIndex, setSelectedIndex] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isOpen) {
            setQuery('')
            setSelectedIndex(0)
            setTimeout(() => inputRef.current?.focus(), 50)
            playWindowOpen()
        } else {
            playWindowClose()
        }
    }, [isOpen])

    const filterPosts = (q: string) => {
        if (!q.trim()) return []
        const lower = q.toLowerCase()
        return posts.filter(p => p.title.toLowerCase().includes(lower) || p.category?.toLowerCase().includes(lower)).slice(0, 5)
    }

    const matchedPosts = filterPosts(query)

    const baseActions = [
        {
            id: 'app-reader',
            label: 'open reader view',
            category: 'apps',
            icon: <IconDocument className="size-4" />,
            action: () => addWindow({ key: 'reader', path: '/reader', title: 'reader view', size: { width: 900, height: 650 } })
        },
        {
            id: 'app-blueprints',
            label: 'open blueprints explorer',
            category: 'apps',
            icon: <IconRocket className="size-4" />,
            action: () => addWindow({ key: 'blueprints', path: '/blueprints', title: 'blueprints', size: { width: 960, height: 680 } })
        },
        {
            id: 'app-arena',
            label: 'open arena debates',
            category: 'apps',
            icon: <IconLightBulb className="size-4" />,
            action: () => addWindow({ key: 'arena', path: '/arena', title: 'arena', size: { width: 920, height: 660 } })
        },
        {
            id: 'toggle-theme',
            label: siteSettings.colorMode === 'dark' ? 'switch to light theme' : 'switch to dark theme',
            category: 'system',
            icon: <IconSparkles className="size-4" />,
            action: () => updateSiteSettings(prev => ({ ...prev, colorMode: prev.colorMode === 'dark' ? 'light' : 'dark' }))
        },
        {
            id: 'minimize-all',
            label: 'minimize all windows',
            category: 'system',
            icon: <IconMinus className="size-4" />,
            action: () => windows.forEach(w => updateWindow(w, { minimized: true }))
        }
    ]

    const filteredActions = baseActions.filter(a => !query.trim() || a.label.toLowerCase().includes(query.toLowerCase()))

    const allItems = [
        ...matchedPosts.map(p => ({
            id: `post-${p.id}`,
            label: p.title.toLowerCase(),
            category: 'articles',
            icon: <IconDocument className="size-4" />,
            action: () => addWindow({ key: `post-${p.id}`, path: `/reader?post=${p.id}`, title: p.title, size: { width: 900, height: 650 } })
        })),
        ...filteredActions
    ]

    useEffect(() => {
        setSelectedIndex(0)
    }, [query])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSelectedIndex(prev => (prev + 1) % Math.max(1, allItems.length))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSelectedIndex(prev => (prev - 1 + allItems.length) % Math.max(1, allItems.length))
        } else if (e.key === 'Enter') {
            e.preventDefault()
            const selected = allItems[selectedIndex]
            if (selected) {
                selected.action()
                onClose()
            }
        } else if (e.key === 'Escape') {
            onClose()
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100000] flex items-start justify-center pt-20 sm:pt-28 px-4 bg-black/40 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="w-full max-w-xl bg-[var(--color-bg-surface-primary)] border border-[var(--border-3000)] rounded-xl shadow-2xl overflow-hidden text-[var(--text-3000)]"
                        onKeyDown={handleKeyDown}
                    >
                        <div className="flex items-center px-4 py-3 border-b border-[var(--border-3000)] gap-3">
                            <IconSearch className="size-5 text-[var(--muted-3000)] shrink-0" />
                            <input
                                ref={inputRef}
                                type="text"
                                className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-[var(--muted-3000)]"
                                placeholder="type a command or search articles... (esc to exit)"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                            <button onClick={onClose} className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                <IconX className="size-4 text-[var(--muted-3000)]" />
                            </button>
                        </div>

                        <div className="max-h-80 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                            {allItems.length === 0 ? (
                                <div className="p-4 text-center text-xs text-[var(--muted-3000)] font-medium">
                                    no matching commands or articles found.
                                </div>
                            ) : (
                                allItems.map((item, idx) => {
                                    const isSelected = idx === selectedIndex
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => {
                                                item.action()
                                                onClose()
                                            }}
                                            onMouseEnter={() => setSelectedIndex(idx)}
                                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors lowercase ${
                                                isSelected ? 'bg-blue-600 text-white' : 'hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-3000)]'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5 truncate">
                                                <span className={isSelected ? 'text-white' : 'text-[var(--muted-3000)]'}>{item.icon}</span>
                                                <span className="truncate">{item.label}</span>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0 ml-2">
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${isSelected ? 'bg-white/20 text-white' : 'bg-black/5 dark:bg-white/10 text-[var(--muted-3000)]'}`}>
                                                    {item.category}
                                                </span>
                                                {isSelected && <IconArrowRight className="size-3 text-white ml-1" />}
                                            </div>
                                        </button>
                                    )
                                })
                            )}
                        </div>

                        <div className="px-4 py-2 border-t border-[var(--border-3000)] bg-[var(--color-bg-surface-secondary)] flex items-center justify-between text-[11px] text-[var(--muted-3000)] font-mono">
                            <span>navigation: ↑↓ navigate • ↵ select</span>
                            <span>shortcut: ⌘K</span>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
