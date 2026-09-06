import React, { useEffect, useMemo, useState } from 'react'
import SEO from 'components/seo'
import OSInput from 'components/OSForm/input'
import OSButton from 'components/OSButton'
import ScrollArea from 'components/RadixUI/ScrollArea'
import { IconNotebook, IconTrash } from '@posthog/icons'
import { useAppActions } from '../../context/App'
import { TrashStore, type TrashItem } from '../../lib/trash-store'
import { emptyNotebookTrash, restoreNotebookFromTrash } from '../../notebook-app/scenes/notebooks/notebookStorage'

function timeAgo(dateStr: string): string {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
    if (!Number.isFinite(seconds) || seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return new Date(dateStr).toLocaleDateString()
}

export function TrashWindow() {
    const { addWindow } = useAppActions()
    const [items, setItems] = useState<TrashItem[]>(() => TrashStore.getState().items)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        return TrashStore.subscribe((state) => setItems(state.items))
    }, [])

    const filtered = useMemo(() => {
        if (!searchQuery.trim()) return items
        const q = searchQuery.toLowerCase()
        return items.filter((item) => item.title.toLowerCase().includes(q))
    }, [items, searchQuery])

    const handleRestore = (id: string) => {
        const restored = restoreNotebookFromTrash(id)
        if (!restored) return
        addWindow({
            key: `notebook-${restored.id}`,
            path: `/notebooks/${restored.id}`,
            title: restored.title || 'Notebook',
            icon: 'notebook',
            focused: true,
        })
    }

    const handleEmpty = () => {
        if (!items.length) return
        emptyNotebookTrash()
    }

    return (
        <div data-scheme="primary" className="@container bg-primary text-primary h-full flex flex-col min-h-0 font-sans">
            <SEO title="Trash" description="Deleted notebooks on WorldInMaking." />
            <div className="flex items-center gap-1 min-w-0 px-2 py-2 border-b border-primary bg-primary flex-shrink-0">
                <div className="w-[min(16rem,50vw)] shrink-0">
                    <OSInput
                        label="Search trash"
                        showLabel={false}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search trash"
                        size="sm"
                    />
                </div>
                {items.length ? (
                    <OSButton size="sm" hover="background" onClick={handleEmpty}>
                        <span className="text-red">Empty trash</span>
                    </OSButton>
                ) : null}
            </div>
            <ScrollArea className="flex-1 min-h-0">
                <div className="p-3 @2xl:p-4 space-y-2">
                    {!items.length ? (
                        <div className="text-center py-12">
                            <IconTrash className="size-10 mx-auto mb-2 text-muted" />
                            <h3 className="text-base font-semibold m-0">Trash is empty</h3>
                            <p className="text-muted text-sm m-0 mt-1 max-w-sm mx-auto">
                                Deleted notebooks land here. Restore them, or empty trash to drop the copies on this
                                device.
                            </p>
                        </div>
                    ) : null}
                    {items.length && !filtered.length ? (
                        <p className="text-muted text-sm m-0">No matching items.</p>
                    ) : null}
                    {filtered.map((item) => (
                        <div
                            key={item.id}
                            className="flex items-center gap-2 p-2.5 rounded-sm border border-primary bg-primary"
                        >
                            <IconNotebook className="size-5 text-muted shrink-0" />
                            <div className="min-w-0 flex-1">
                                <p className="m-0 text-sm font-medium truncate">{item.title}</p>
                                <p className="m-0 text-xs text-muted">Deleted {timeAgo(item.deletedAt)}</p>
                            </div>
                            <OSButton size="sm" hover="background" onClick={() => handleRestore(item.id)}>
                                Restore
                            </OSButton>
                            <OSButton size="sm" hover="background" onClick={() => TrashStore.remove(item.id)}>
                                <span className="text-red">Delete</span>
                            </OSButton>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    )
}

export default TrashWindow
