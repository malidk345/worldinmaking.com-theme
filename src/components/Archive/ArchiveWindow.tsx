import React, { useMemo, useState } from 'react'
import { useArchive } from 'context/ArchiveContext'
import SEO from 'components/seo'
import HeaderBar from 'components/OSChrome/HeaderBar'
import OSInput from 'components/OSForm/input'
import OSButton from 'components/OSButton'
import ScrollArea from 'components/RadixUI/ScrollArea'
import { AppIcon, AppLink, AppItem } from 'components/OSIcons/AppIcon'
import { apps, useProductLinks } from 'components/Desktop/desktopApps'
import { IconArchive } from '@posthog/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const PINNED_APPS_KEY = 'wim_os_desktop_pinned_items'

const FALLBACK_APPS: Record<string, AppItem> = {
    '/': { label: 'Home', Icon: <AppIcon name="doc" />, url: '/' },
    '/editor': { label: 'Editor', Icon: <AppIcon name="typewriter" />, url: '/editor' },
    '/community/new': { label: 'Write Post', Icon: <AppIcon name="notebook" />, url: '/community/new' },
    '/customers': { label: 'Customers', Icon: <AppIcon name="spreadsheet" />, url: '/customers' },
    '/admin': { label: 'Admin', Icon: <AppIcon name="bookmark" />, url: '/admin' },
}

function loadPinnedApps(): AppItem[] {
    if (typeof window === 'undefined') return []
    try {
        const existing = JSON.parse(localStorage.getItem(PINNED_APPS_KEY) || '[]')
        if (!Array.isArray(existing)) return []
        return existing.map((item: { label?: string; notebookId?: string }) => ({
            label: item.label || 'Notebook',
            Icon: <AppIcon name="doc" />,
            url: item.notebookId ? `/notebooks?id=${item.notebookId}` : undefined,
        }))
    } catch {
        return []
    }
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
            <SEO title="Archive – WorldInMaking OS" />
            <HeaderBar
                className="!bg-transparent"
                showCustomLeft={
                    <div className="w-[min(16rem,70vw)]">
                        <OSInput
                            label="Search archive"
                            showLabel={false}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search archive"
                            size="sm"
                        />
                    </div>
                }
                rightActionButtons={
                    archivedItems && archivedItems.length > 0 ? (
                        <OSButton size="sm" onClick={clearArchive}>
                            Restore all
                        </OSButton>
                    ) : null
                }
            />
            <ScrollArea className="flex-1 min-h-0">
                <div className="p-4">
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
                                    <li
                                        key={item.url}
                                        className="w-28 min-h-[84px] flex justify-center items-start"
                                    >
                                        <div className="flex flex-col items-center">
                                            <AppLink
                                                {...app}
                                                source={undefined}
                                                customMenuItems={[
                                                    {
                                                        type: 'item',
                                                        label: 'Restore to Desktop',
                                                        onClick: () => unarchiveApp(item.url, app.label),
                                                    },
                                                ]}
                                            />
                                            <span className="text-[10px] text-muted mt-0.5 leading-tight">
                                                {dayjs(item.archivedAt).fromNow()}
                                            </span>
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}
