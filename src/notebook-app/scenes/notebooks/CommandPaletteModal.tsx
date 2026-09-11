import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconSearch, IconSparkles, IconPlus, IconNotebook, IconCalendar, IconX, IconArrowRight } from '@posthog/icons'
import { getOrCreateDailyNotebook, listNotebooksForBrowser, type NotebookBrowserItem } from './notebookStorage'
import { notebookMatchesQuery } from './notebookPreview'

interface CommandPaletteModalProps {
    isOpen: boolean
    onClose: () => void
    onSelectNotebook: (id: string) => void
    onCreateNew: () => void
    onOpenTemplates: () => void
    onOpenAI: () => void
}

type PaletteItem = {
    id: string
    label: string
    category: string
    icon: JSX.Element
    action: () => void
}

export function CommandPaletteModal({
    isOpen,
    onClose,
    onSelectNotebook,
    onCreateNew,
    onOpenTemplates,
    onOpenAI,
}: CommandPaletteModalProps) {
    const [query, setQuery] = useState('')
    const [notebooks, setNotebooks] = useState<NotebookBrowserItem[]>([])
    const [selectedIndex, setSelectedIndex] = useState(0)
    const inputRef = useRef<HTMLInputElement | null>(null)

    useEffect(() => {
        if (isOpen) {
            setNotebooks(listNotebooksForBrowser())
            setQuery('')
            setSelectedIndex(0)
            window.setTimeout(() => inputRef.current?.focus(), 50)
        }
    }, [isOpen])

    const filteredNotebooks = useMemo(
        () => notebooks.filter((nb) => notebookMatchesQuery(nb, query)),
        [notebooks, query]
    )

    const items = useMemo<PaletteItem[]>(() => {
        const needle = query.trim().toLowerCase()
        const actions: PaletteItem[] = [
            {
                id: 'ask-ai',
                label: 'Ask AI',
                category: 'action',
                icon: <IconSparkles className="size-4" />,
                action: () => {
                    onClose()
                    onOpenAI()
                },
            },
            {
                id: 'create',
                label: 'Create new notebook',
                category: 'action',
                icon: <IconPlus className="size-4" />,
                action: () => {
                    onClose()
                    onCreateNew()
                },
            },
            {
                id: 'templates',
                label: 'Browse templates',
                category: 'action',
                icon: <IconNotebook className="size-4" />,
                action: () => {
                    onClose()
                    onOpenTemplates()
                },
            },
            {
                id: 'today',
                label: "Today's daily note",
                category: 'action',
                icon: <IconCalendar className="size-4" />,
                action: () => {
                    onClose()
                    onSelectNotebook(getOrCreateDailyNotebook().id)
                },
            },
        ]
        const visibleActions = needle
            ? actions.filter((item) => item.label.toLowerCase().includes(needle))
            : actions
        const notebookItems = filteredNotebooks.map((nb) => ({
            id: nb.id,
            label: nb.title || 'Untitled',
            category: nb.isTemplate ? 'template' : 'notebook',
            icon: <IconNotebook className="size-4" />,
            action: () => {
                onClose()
                onSelectNotebook(nb.id)
            },
        }))
        return [...visibleActions, ...notebookItems]
    }, [filteredNotebooks, onClose, onCreateNew, onOpenAI, onOpenTemplates, onSelectNotebook, query])

    useEffect(() => {
        setSelectedIndex(0)
    }, [query])

    useEffect(() => {
        if (!isOpen) return
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'ArrowDown') {
                event.preventDefault()
                setSelectedIndex((prev) => (prev + 1) % Math.max(1, items.length))
            } else if (event.key === 'ArrowUp') {
                event.preventDefault()
                setSelectedIndex((prev) => (prev - 1 + items.length) % Math.max(1, items.length))
            } else if (event.key === 'Enter') {
                event.preventDefault()
                items[selectedIndex]?.action()
            } else if (event.key === 'Escape') {
                event.preventDefault()
                onClose()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, items, onClose, selectedIndex])

    return (
        <AnimatePresence>
            {isOpen ? (
                <div
                    className="keyboard-pad fixed inset-0 z-[100000] flex items-start justify-center pt-20 sm:pt-28 px-4 bg-black/40 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.94, y: -16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: -12 }}
                        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                        className="w-full max-w-xl bg-accent border border-secondary rounded-xl shadow-2xl overflow-hidden text-primary"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-center px-4 py-3 border-b border-secondary gap-3">
                            <IconSearch className="size-5 text-secondary shrink-0" />
                            <input
                                ref={inputRef}
                                type="search"
                                className="w-full bg-transparent text-base font-semibold outline-none placeholder:text-secondary"
                                placeholder="Search notebooks or pick an action…"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                aria-label="Search notebooks"
                            />
                            <button
                                type="button"
                                onClick={onClose}
                                className="p-1 rounded hover:bg-primary/10 transition-colors"
                                aria-label="Close"
                            >
                                <IconX className="size-4 text-secondary" />
                            </button>
                        </div>

                        <div className="max-h-80 overflow-y-auto p-2 space-y-1 relative">
                            {items.length === 0 ? (
                                <div className="p-4 text-center text-xs text-secondary font-medium">
                                    No notebooks match that search.
                                </div>
                            ) : (
                                items.map((item, idx) => {
                                    const isSelected = idx === selectedIndex
                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={item.action}
                                            onMouseEnter={() => setSelectedIndex(idx)}
                                            className={`relative w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                                isSelected ? 'text-white' : 'text-primary hover:text-primary'
                                            }`}
                                        >
                                            {isSelected ? (
                                                <motion.div
                                                    layoutId="notebook-cmd-palette-highlight"
                                                    className="absolute inset-0 bg-blue rounded-lg -z-10 shadow-xs"
                                                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                                                />
                                            ) : null}
                                            <div className="flex items-center gap-2.5 truncate z-10">
                                                <span className={isSelected ? 'text-white' : 'text-secondary'}>
                                                    {item.icon}
                                                </span>
                                                <span className="truncate">{item.label}</span>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0 ml-2 z-10">
                                                <span
                                                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                                        isSelected
                                                            ? 'bg-white/20 text-white'
                                                            : 'bg-primary/10 text-secondary'
                                                    }`}
                                                >
                                                    {item.category}
                                                </span>
                                                {isSelected ? (
                                                    <IconArrowRight className="size-3 text-white ml-1" />
                                                ) : null}
                                            </div>
                                        </button>
                                    )
                                })
                            )}
                        </div>

                        <div className="px-4 py-2 border-t border-secondary bg-primary/5 flex items-center justify-between text-[11px] text-secondary font-mono">
                            <span>↑↓ move · ↵ open</span>
                            <span>esc close</span>
                        </div>
                    </motion.div>
                </div>
            ) : null}
        </AnimatePresence>
    )
}
