import React, { useState, useMemo } from 'react'
import { useArchive } from 'context/ArchiveContext'
import Link from 'components/Link'
import SEO from 'components/seo'
import OSTable from 'components/OSTable'
import { AppIcon } from 'components/OSIcons/AppIcon'
import { IconRefresh, IconExternal, IconSearch } from '@posthog/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

interface DesktopAppMeta {
    url: string
    label: string
    iconName: string
}

const KNOWN_DESKTOP_APPS: Record<string, DesktopAppMeta> = {
    '/': { url: '/', label: 'home.mdx', iconName: 'doc' },
    '/editor': { url: '/editor', label: 'Editor', iconName: 'typewriter' },
    '/community/new': { url: '/community/new', label: 'Write Post', iconName: 'notebook' },
    '/community': { url: '/community', label: 'Community', iconName: 'forums' },
    '/notebooks': { url: '/notebooks', label: 'Notebooks', iconName: 'notebook' },
    '/customers': { url: '/customers', label: 'customers.mdx', iconName: 'spreadsheet' },
    '/contact': { url: '/contact', label: 'Contact', iconName: 'envelope' },
    '/display-options': { url: '/display-options', label: 'Display Options', iconName: 'page' },
    '/trash': { url: '/trash', label: 'Trash', iconName: 'trash' },
    '/admin': { url: '/admin', label: 'Admin OS Dashboard', iconName: 'bookmark' },
}

export default function ArchiveWindow() {
    const { archivedItems, unarchiveApp, clearArchive } = useArchive()
    const [searchQuery, setSearchQuery] = useState('')

    const enrichedItems = useMemo(() => {
        return (archivedItems || []).map((item) => {
            const known = KNOWN_DESKTOP_APPS[item.url]
            return {
                ...item,
                label: known?.label || item.label || item.url.replace('/', ''),
                iconName: known?.iconName || 'doc',
            }
        })
    }, [archivedItems])

    const filteredItems = useMemo(() => {
        if (!searchQuery.trim()) return enrichedItems
        const q = searchQuery.toLowerCase()
        return enrichedItems.filter(
            (item) => item.label.toLowerCase().includes(q) || item.url.toLowerCase().includes(q)
        )
    }, [enrichedItems, searchQuery])

    // Exact Column Definition from customers/index.tsx
    const columns = [
        { name: '#', width: '50px', align: 'center' as const },
        { name: 'Resource / App', width: 'minmax(200px, 1fr)', align: 'left' as const },
        { name: 'Date archived', width: 'minmax(140px, 180px)', align: 'left' as const },
        { name: 'Actions', width: 'minmax(120px, 160px)', align: 'right' as const },
    ]

    const tableRows = useMemo(() => {
        return filteredItems.map((item, index) => {
            return {
                key: item.url,
                cells: [
                    // Cell 1: Index Number
                    { content: <span className="font-mono text-muted text-xs">{index + 1}</span> },

                    // Cell 2: Icon + App/Resource Name & URL
                    {
                        content: (
                            <div className="flex h-10 items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-accent border border-primary flex items-center justify-center p-1 shrink-0">
                                    <AppIcon name={item.iconName as any} className="size-6 object-contain" />
                                </div>
                                <div className="min-w-0">
                                    <div className="font-bold text-primary text-xs truncate">{item.label}</div>
                                    <div className="text-[10px] font-mono text-muted truncate">{item.url}</div>
                                </div>
                            </div>
                        ),
                        className: '!p-3',
                    },

                    // Cell 3: Date Archived
                    {
                        content: (
                            <span className="text-xs text-muted font-medium">
                                {dayjs(item.archivedAt).fromNow()}
                            </span>
                        ),
                        className: 'text-xs',
                    },

                    // Cell 4: Actions (Icon buttons for individual restore)
                    {
                        content: (
                            <div className="flex items-center justify-end gap-2">
                                <button
                                    onClick={() => unarchiveApp(item.url, item.label)}
                                    title="Restore to Desktop"
                                    className="p-1.5 rounded-lg bg-yellow/10 hover:bg-yellow/20 text-yellow border border-yellow/30 transition-colors inline-flex items-center gap-1 text-xs font-bold"
                                >
                                    <IconRefresh className="size-3.5" />
                                    <span>Restore</span>
                                </button>

                                <Link
                                    href={item.url}
                                    state={{ newWindow: true }}
                                    title="Open application"
                                    className="p-1.5 rounded-lg bg-primary hover:bg-accent text-secondary border border-primary transition-colors inline-flex items-center gap-1 text-xs font-bold"
                                >
                                    <IconExternal className="size-3.5" />
                                </Link>
                            </div>
                        ),
                    },
                ],
            }
        })
    }, [filteredItems, unarchiveApp])

    return (
        <div data-scheme="primary" className="h-full bg-primary text-primary flex flex-col overflow-hidden select-none p-6 space-y-4">
            <SEO title="Archive – WorldInMaking OS" />

            <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col min-h-0 space-y-4">
                {/* Header matching customers/index.tsx title format */}
                <div className="flex items-start justify-between border-b border-primary pb-3">
                    <div>
                        <h1 className="text-2xl font-bold m-0">Archive</h1>
                        <p className="!mt-1 text-xs text-secondary m-0">
                            Archived desktop items, notebook links, and saved resources. Restore any item back to your desktop at any time.
                        </p>
                    </div>

                    {archivedItems && archivedItems.length > 0 && (
                        <button
                            onClick={clearArchive}
                            className="px-3 py-1.5 bg-primary hover:bg-accent text-secondary border border-primary rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
                        >
                            <IconRefresh className="size-3.5" />
                            <span>Restore All</span>
                        </button>
                    )}
                </div>

                {/* Search Box */}
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search archived resources, links & notebooks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-accent border border-primary rounded-xl pl-9 pr-3.5 py-2 text-xs text-primary placeholder-muted outline-none focus:border-accent transition-colors"
                    />
                    <IconSearch className="size-4 text-muted absolute left-3 top-2.5 pointer-events-none" />
                </div>

                {/* Exact Customers Page OSTable Implementation */}
                <div className="flex-1 overflow-y-auto min-h-0">
                    {filteredItems.length === 0 ? (
                        <div className="h-48 flex items-center justify-center text-center p-6 bg-accent/30 border border-primary rounded-xl">
                            <p className="text-xs text-secondary m-0">
                                {searchQuery ? 'No archived items match your search query.' : 'No archived items. Drag any desktop icon here to save it.'}
                            </p>
                        </div>
                    ) : (
                        <OSTable
                            className="mt-2"
                            columns={columns}
                            width="full"
                            rows={tableRows}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}
