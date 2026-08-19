import React, { useMemo, useState } from 'react'
import { useArchive } from 'context/ArchiveContext'
import SEO from 'components/seo'
import OSInput from 'components/OSForm/input'
import OSButton from 'components/OSButton'
import ScrollArea from 'components/RadixUI/ScrollArea'
import { Popover } from 'components/RadixUI/Popover'
import { AppIcon, AppLink, AppItem } from 'components/OSIcons/AppIcon'
import { apps, useProductLinks } from 'components/Desktop/desktopApps'
import { IconArchive, IconEllipsis } from '@posthog/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const PINNED_APPS_KEY = 'wim_os_desktop_pinned_items'

const FALLBACK_APPS: Record<string, AppItem> = {
    '/': { label: 'Home', Icon: <AppIcon name="home" />, url: '/home' },
    '/home': { label: 'Home', Icon: <AppIcon name="home" />, url: '/home' },
    '/editor': { label: 'Editor', Icon: <AppIcon name="typewriter" />, url: '/editor' },
    '/community/new': { label: 'Write Post', Icon: <AppIcon name="notebook" />, url: '/community/new' },
    '/customers': { label: 'Customers', Icon: <AppIcon name="spreadsheet" />, url: '/customers' },
    '/admin': { label: 'Admin', Icon: <AppIcon name="bookmark" />, url: '/admin' },
    '/workspace-chat': { label: 'WIM AI', Icon: <AppIcon name="wimAi" />, url: '/workspace-chat' },
    '/posts': { label: 'Posts', Icon: <AppIcon name="posts" />, url: '/posts' },
    '/blog': { label: 'Posts', Icon: <AppIcon name="posts" />, url: '/posts' },
    '/login': { label: 'Sign In', Icon: <AppIcon name="signIn" />, url: '/login' },
}

function loadPinnedApps(): AppItem[] {
    if (typeof window === 'undefined') return []
    try {
        const existing = JSON.parse(localStorage.getItem(PINNED_APPS_KEY) || '[]')
        if (!Array.isArray(existing)) return []
        let deletedIds: string[] = []
        try {
            deletedIds = JSON.parse(localStorage.getItem('wim_os_deleted_notebook_ids') || '[]')
        } catch {
            deletedIds = []
        }
        const deletedSet = new Set(Array.isArray(deletedIds) ? deletedIds : [])

        return existing
            .filter((item: any) => {
                if (!item) return false
                const targetId = item.notebookId || item.id
                return !targetId || !deletedSet.has(targetId)
            })
            .map((item: { label?: string; notebookId?: string; url?: string }) => ({
                label: item.label || 'Notebook',
                Icon: <AppIcon name="doc" />,
                url: item.url || (item.notebookId ? `/notebooks?id=${item.notebookId}` : undefined),
            }))
    } catch {
        return []
    }
}

function ArchivedAppTile({
    app,
    archivedAt,
    onRestore,
}: {
    app: AppItem
    archivedAt: string
    onRestore: () => void
}) {
    const restoreItem = {
        type: 'item' as const,
        label: 'Restore to Desktop',
        onClick: onRestore,
    }

    return (
        <li className="group relative w-28 min-h-[84px] flex justify-center items-start">
            <div className="relative flex flex-col items-center w-full">
                <div
                    className="absolute -top-1 right-1 z-10"
                    onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                    }}
                >
                    <Popover
                        dataScheme="primary"
                        header={false}
                        side="bottom"
                        contentClassName="w-auto p-1 min-w-[10rem]"
                        trigger={
                            <button
                                type="button"
                                aria-label={`Actions for ${app.label}`}
                                className="flex items-center justify-center size-6 rounded text-muted hover:text-primary hover:bg-accent-2"
                            >
                                <IconEllipsis className="size-4 rotate-90" />
                            </button>
                        }
                    >
                        <OSButton size="sm" width="full" onClick={onRestore}>
                            Restore to Desktop
                        </OSButton>
                    </Popover>
                </div>
                <AppLink {...app} source={undefined} customMenuItems={[restoreItem]} />
                <span className="text-[10px] text-muted mt-0.5 leading-tight">{dayjs(archivedAt).fromNow()}</span>
            </div>
        </li>
    )
}

function resolveAppItem(url: string, label: string, catalog: Record<string, AppItem>): AppItem {
    const known = catalog[url]
    if (known) {
        return { ...known, label: known.label || label, url }
    }
    return {
        label: label || url.replace(/^\//, '') || 'App',
        Icon: <AppIcon name="doc" />,
        url,
    }
}

export default function ArchiveWindow() {
    const { archivedItems, archiveApp, unarchiveApp, clearArchive } = useArchive()
    const [searchQuery, setSearchQuery] = useState('')
    const [isDragOver, setIsDragOver] = useState(false)
    const productLinks = useProductLinks()

    const catalog = useMemo(() => {
        const map: Record<string, AppItem> = { ...FALLBACK_APPS }
        for (const item of [...productLinks, ...apps, ...loadPinnedApps()]) {
            if (item.url) map[item.url] = item
        }
        return map
    }, [productLinks])

    const filteredItems = useMemo(() => {
        const items = archivedItems || []
        if (!searchQuery.trim()) return items
        const q = searchQuery.toLowerCase()
        return items.filter(
            (item) => item.label.toLowerCase().includes(q) || item.url.toLowerCase().includes(q)
        )
    }, [archivedItems, searchQuery])

    const armDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setIsDragOver(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return
        setIsDragOver(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(false)
        const url = e.dataTransfer.getData('text/plain')
        const label = e.dataTransfer.getData('text/label')
        if (url && url !== '/archive') {
            archiveApp(url, label)
        }
    }

    return (
        <div
            data-scheme="primary"
            className={`@container bg-transparent text-primary h-full flex flex-col min-h-0 transition-colors ${
                isDragOver ? 'ring-2 ring-inset ring-blue/50 bg-blue/5' : ''
            }`}
            onDragOver={armDrop}
            onDragEnter={armDrop}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <SEO title="archive" description="archived desktop items on worldinmaking." />
            <div className="flex items-center gap-2 px-4 pt-3 pb-1 flex-shrink-0">
                <div className="flex-1 min-w-0 max-w-xs">
                    <OSInput
                        label="Search archive"
                        showLabel={false}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search archive"
                        size="sm"
                    />
                </div>
                {archivedItems && archivedItems.length > 0 ? (
                    <OSButton size="sm" variant="underlineOnHover" onClick={clearArchive}>
                        Restore all
                    </OSButton>
                ) : null}
            </div>
            <ScrollArea className="flex-1 min-h-0">
                <div className="p-4 pt-2">
                    {filteredItems.length === 0 ? (
                        <div className="text-center py-12">
                            <IconArchive className="size-12 mx-auto mb-2 text-muted" />
                            <h3 className="text-lg font-semibold m-0">
                                {searchQuery ? 'No matches' : 'Archive is empty'}
                            </h3>
                            <p className="text-muted m-0">
                                {searchQuery
                                    ? 'No archived apps match that search.'
                                    : 'Drag a desktop app here, or onto the Archive icon.'}
                            </p>
                        </div>
                    ) : (
                        <ul className="list-none m-0 p-0 flex flex-row flex-wrap">
                            {filteredItems.map((item) => {
                                const app = resolveAppItem(item.url, item.label, catalog)
                                return (
                                    <ArchivedAppTile
                                        key={item.url}
                                        app={app}
                                        archivedAt={item.archivedAt}
                                        onRestore={() => unarchiveApp(item.url, app.label)}
                                    />
                                )
                            })}
                        </ul>
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}
