import React, { useState } from 'react'
import { StoredNotebook } from './notebookStorage'
import { ChevronRight, ChevronDown, FileText, Plus, Star, Folder, Search } from 'lucide-react'

interface SidebarPageTreeProps {
    notebooks: StoredNotebook[]
    activeNotebookId?: string
    onSelectNotebook: (id: string) => void
    onCreateNotebook: () => void
    onOpenCommandPalette: () => void
}

export function SidebarPageTree({
    notebooks,
    activeNotebookId,
    onSelectNotebook,
    onCreateNotebook,
    onOpenCommandPalette,
}: SidebarPageTreeProps) {
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [filterQuery, setFilterQuery] = useState('')
    const [favorites, setFavorites] = useState<string[]>([])

    const toggleFavorite = (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        setFavorites((prev) => (prev.includes(id) ? prev.filter((favId) => favId !== id) : [...prev, id]))
    }

    const filteredNotebooks = notebooks.filter((nb) => {
        if (!filterQuery.trim()) return true
        const q = filterQuery.toLowerCase()
        return nb.title.toLowerCase().includes(q) || nb.shortId.toLowerCase().includes(q)
    })

    const favoriteNotebooks = filteredNotebooks.filter((nb) => favorites.includes(nb.id))

    return (
        <aside
            data-scheme="primary"
            className="w-64 h-full bg-accent/30 border-r border-primary flex flex-col select-none overflow-hidden"
        >
            {/* Sidebar Header & Command Palette Button */}
            <div className="p-3 border-b border-primary space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-muted flex items-center gap-1.5">
                        <Folder className="w-3.5 h-3.5 text-yellow" /> Workspace Tree
                    </span>
                    <button
                        onClick={onCreateNotebook}
                        title="New Notebook"
                        className="p-1 rounded-lg bg-primary hover:bg-accent text-secondary border border-primary transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Command Palette Trigger */}
                <button
                    onClick={onOpenCommandPalette}
                    className="w-full p-2 bg-primary hover:bg-accent border border-primary rounded-xl flex items-center justify-between text-xs text-muted transition-colors shadow-sm"
                >
                    <span className="flex items-center gap-2">
                        <Search className="w-3.5 h-3.5" /> Search or ⌘K...
                    </span>
                    <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-accent border border-primary rounded text-secondary">
                        ⌘K
                    </kbd>
                </button>
            </div>

            {/* Tree Navigation Content */}
            <div className="flex-1 overflow-y-auto p-2 space-y-3 text-xs">
                {/* Favorites Section */}
                {favoriteNotebooks.length > 0 && (
                    <div className="space-y-1">
                        <div className="px-2 py-1 text-[10px] font-bold text-muted uppercase flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow fill-yellow" /> Favorites
                        </div>
                        {favoriteNotebooks.map((nb) => (
                            <button
                                key={nb.id}
                                onClick={() => onSelectNotebook(nb.id)}
                                className={`w-full text-left p-2 rounded-xl flex items-center justify-between transition-colors ${
                                    activeNotebookId === nb.id
                                        ? 'bg-yellow/15 text-yellow border border-yellow/30 font-bold'
                                        : 'hover:bg-accent/60 text-secondary'
                                }`}
                            >
                                <span className="flex items-center gap-2 truncate">
                                    <FileText className="w-3.5 h-3.5 shrink-0 text-yellow" />
                                    <span className="truncate">{nb.title || 'Untitled'}</span>
                                </span>
                                <Star
                                    onClick={(e) => toggleFavorite(nb.id, e)}
                                    className="w-3.5 h-3.5 text-yellow fill-yellow hover:scale-110"
                                />
                            </button>
                        ))}
                    </div>
                )}

                {/* All Notebooks Tree */}
                <div className="space-y-1">
                    <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold text-muted uppercase">
                        <span>Documents ({filteredNotebooks.length})</span>
                        <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-0.5 hover:text-primary">
                            {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                    </div>

                    {!isCollapsed &&
                        (filteredNotebooks.length === 0 ? (
                            <div className="p-3 text-center text-muted italic text-[11px]">No documents yet</div>
                        ) : (
                            filteredNotebooks.map((nb) => {
                                const isActive = activeNotebookId === nb.id
                                const isFav = favorites.includes(nb.id)
                                return (
                                    <button
                                        key={nb.id}
                                        onClick={() => onSelectNotebook(nb.id)}
                                        className={`w-full text-left p-2 rounded-xl flex items-center justify-between group/tree transition-colors ${
                                            isActive
                                                ? 'bg-accent text-primary border border-primary font-bold shadow-sm'
                                                : 'hover:bg-accent/50 text-secondary'
                                        }`}
                                    >
                                        <span className="flex items-center gap-2 truncate">
                                            <FileText className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-yellow' : 'text-muted'}`} />
                                            <span className="truncate">{nb.title || 'Untitled'}</span>
                                        </span>

                                        <Star
                                            onClick={(e) => toggleFavorite(nb.id, e)}
                                            className={`w-3.5 h-3.5 opacity-0 group-hover/tree:opacity-100 transition-opacity ${
                                                isFav ? 'text-yellow fill-yellow opacity-100' : 'text-muted hover:text-yellow'
                                            }`}
                                        />
                                    </button>
                                )
                            })
                        ))}
                </div>
            </div>
        </aside>
    )
}
