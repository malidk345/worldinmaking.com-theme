import React, { useState, useEffect } from 'react'
import { StoredNotebook } from './notebookStorage'
import { Search, FileText, Plus, LayoutTemplate, X, Sparkles } from 'lucide-react'

interface GlobalCommandPaletteProps {
    isOpen: boolean
    onClose: () => void
    notebooks: StoredNotebook[]
    onSelectNotebook: (id: string) => void
    onCreateNotebook: () => void
    onOpenTemplates: () => void
}

export function GlobalCommandPalette({
    isOpen,
    onClose,
    notebooks,
    onSelectNotebook,
    onCreateNotebook,
    onOpenTemplates,
}: GlobalCommandPaletteProps) {
    const [query, setQuery] = useState('')
    const [selectedIndex, setSelectedIndex] = useState(0)

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault()
                isOpen ? onClose() : null
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onClose])

    const filteredNotebooks = notebooks.filter((nb) => {
        if (!query.trim()) return true
        const q = query.toLowerCase()
        return nb.title.toLowerCase().includes(q) || nb.shortId.toLowerCase().includes(q)
    })

    const actions = [
        {
            id: 'action-new',
            title: 'Create New Notebook',
            description: 'Start with a clean block canvas.',
            icon: <Plus className="w-4 h-4 text-yellow" />,
            onRun: onCreateNotebook,
        },
        {
            id: 'action-templates',
            title: 'Browse SaaS Templates Gallery',
            description: 'Insert pre-built Craft & Notion docs.',
            icon: <LayoutTemplate className="w-4 h-4 text-blue-400" />,
            onRun: onOpenTemplates,
        },
    ]

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-start justify-center pt-20 p-4 animate-in fade-in duration-150 select-none">
            <div
                data-scheme="primary"
                className="w-full max-w-xl bg-primary/95 border border-primary rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl text-primary space-y-2 p-3"
            >
                {/* Search Input Bar */}
                <div className="relative flex items-center border-b border-primary pb-2">
                    <Search className="w-4 h-4 text-muted absolute left-3 pointer-events-none" />
                    <input
                        type="text"
                        autoFocus
                        placeholder="Search workspace documents, blocks, or run commands..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full bg-accent border border-primary rounded-xl pl-9 pr-8 py-2 text-xs text-primary placeholder-muted outline-none focus:border-accent"
                    />
                    <button onClick={onClose} className="absolute right-2 p-1 hover:bg-accent rounded-lg text-secondary">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content Items */}
                <div className="max-h-80 overflow-y-auto space-y-3 p-1">
                    {/* Quick System Actions */}
                    {!query.trim() && (
                        <div className="space-y-1">
                            <div className="px-2 py-0.5 text-[10px] font-extrabold text-muted uppercase tracking-wider flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-yellow" /> Quick Actions
                            </div>
                            {actions.map((act) => (
                                <button
                                    key={act.id}
                                    onClick={() => {
                                        act.onRun()
                                        onClose()
                                    }}
                                    className="w-full text-left p-2 rounded-xl hover:bg-accent flex items-center gap-3 transition-colors border border-transparent hover:border-primary"
                                >
                                    <div className="p-1.5 rounded-lg bg-primary border border-primary shrink-0 shadow-sm">
                                        {act.icon}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-xs font-bold text-primary leading-tight">{act.title}</div>
                                        <div className="text-[10px] text-muted leading-tight">{act.description}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Matching Documents */}
                    <div className="space-y-1">
                        <div className="px-2 py-0.5 text-[10px] font-extrabold text-muted uppercase tracking-wider">
                            Documents ({filteredNotebooks.length})
                        </div>
                        {filteredNotebooks.length === 0 ? (
                            <div className="p-4 text-center text-xs text-muted italic">No documents found matching "{query}"</div>
                        ) : (
                            filteredNotebooks.map((nb) => (
                                <button
                                    key={nb.id}
                                    onClick={() => {
                                        onSelectNotebook(nb.id)
                                        onClose()
                                    }}
                                    className="w-full text-left p-2 rounded-xl hover:bg-accent flex items-center justify-between transition-colors border border-transparent hover:border-primary group/item"
                                >
                                    <div className="flex items-center gap-3 truncate">
                                        <div className="p-1.5 rounded-lg bg-primary border border-primary shrink-0">
                                            <FileText className="w-4 h-4 text-yellow" />
                                        </div>
                                        <div className="truncate">
                                            <div className="text-xs font-bold text-primary group-hover/item:text-yellow truncate leading-tight">
                                                {nb.title || 'Untitled Document'}
                                            </div>
                                            <div className="text-[10px] font-mono text-muted truncate">ID: {nb.shortId}</div>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-muted font-mono">Open</span>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Footer hints */}
                <div className="pt-2 border-t border-primary flex items-center justify-between text-[10px] text-muted px-2">
                    <span>Navigation: <kbd className="px-1 bg-accent border rounded">↑</kbd> <kbd className="px-1 bg-accent border rounded">↓</kbd></span>
                    <span>Select: <kbd className="px-1 bg-accent border rounded">Enter</kbd></span>
                    <span>Close: <kbd className="px-1 bg-accent border rounded">Esc</kbd></span>
                </div>
            </div>
        </div>
    )
}
