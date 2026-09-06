import React, { useState, useEffect, useCallback, useRef } from 'react'
import { LemonTag, ProfilePicture } from '~nb-lib/lemon-ui/index'
import { LemonTable } from '../../lib/lemon-ui/LemonTable/LemonTable'
import type { LemonTableColumns } from '../../lib/lemon-ui/LemonTable/types'
import { notebookMatchesQuery } from './notebookPreview'
import { IconEllipsis, IconPlus, IconTrash, IconCopy } from '@posthog/icons'
import OSButton from 'components/OSButton'
import MenuBar from 'components/RadixUI/MenuBar'
import ScrollArea from 'components/RadixUI/ScrollArea'
import { Select } from 'components/RadixUI/Select'
import { useToast } from '../../../context/Toast'
import {
    StoredNotebook,
    getNotebooks,
    deleteNotebook,
    duplicateNotebook,
    leaveSharedNotebook,
    exportNotebookAsJSON,
    exportNotebookAsMarkdown,
    WIM_NOTEBOOKS_CHANGED_EVENT,
    WIM_NOTEBOOKS_HYDRATED_EVENT,
} from './notebookStorage'
import { NOTEBOOK_PRODUCT_SCOPE_CLASS } from '../../../lib/lemon/ensureNotebookProductStyles'

interface NotebooksListSceneProps {
    onSelectNotebook: (id: string) => void
    onCreateNew: () => void
}

function timeAgo(dateStr: string): string {
    if (!dateStr) return '—'
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
    if (!Number.isFinite(seconds) || seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return new Date(dateStr).toLocaleDateString()
}

export function NotebooksListScene({
    onSelectNotebook,
    onCreateNew,
}: NotebooksListSceneProps): JSX.Element {
    const [searchInput, setSearchInput] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [createdByFilter, setCreatedByFilter] = useState('all')
    const [notebooks, setNotebooks] = useState<StoredNotebook[]>(() => getNotebooks())
    const [leavingIds, setLeavingIds] = useState<Set<string>>(() => new Set())
    const leavingIdsRef = useRef<Set<string>>(new Set())
    const { addToast } = useToast()

    useEffect(() => {
        const timer = window.setTimeout(() => setSearchQuery(searchInput), 180)
        return () => window.clearTimeout(timer)
    }, [searchInput])

    const reloadNotebooks = useCallback(() => {
        const live = getNotebooks()
        const liveIds = new Set(live.map((nb) => nb.id))
        setNotebooks((current) => {
            const extras = current.filter((nb) => leavingIdsRef.current.has(nb.id) && !liveIds.has(nb.id))
            return extras.length ? [...live, ...extras] : live
        })
    }, [])

    useEffect(() => {
        reloadNotebooks()
        window.addEventListener(WIM_NOTEBOOKS_CHANGED_EVENT, reloadNotebooks)
        window.addEventListener(WIM_NOTEBOOKS_HYDRATED_EVENT, reloadNotebooks)
        return () => {
            window.removeEventListener(WIM_NOTEBOOKS_CHANGED_EVENT, reloadNotebooks)
            window.removeEventListener(WIM_NOTEBOOKS_HYDRATED_EVENT, reloadNotebooks)
        }
    }, [reloadNotebooks])

    const handleDelete = (id: string, title: string) => {
        leavingIdsRef.current = new Set(leavingIdsRef.current).add(id)
        setLeavingIds(new Set(leavingIdsRef.current))
        deleteNotebook(id)
        window.setTimeout(() => {
            leavingIdsRef.current.delete(id)
            setLeavingIds(new Set(leavingIdsRef.current))
            setNotebooks(getNotebooks())
            addToast({ description: `“${title}” deleted` })
        }, 240)
    }

    const handleDuplicate = (id: string) => {
        duplicateNotebook(id)
        reloadNotebooks()
    }

    const handleExportJSON = (notebook: StoredNotebook) => {
        const jsonStr = exportNotebookAsJSON(notebook.id)
        const blob = new Blob([jsonStr], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${notebook.title.replace(/\s+/g, '_')}.json`
        a.click()
        URL.revokeObjectURL(url)
    }

    const handleExportMd = (notebook: StoredNotebook) => {
        const md = exportNotebookAsMarkdown(notebook.id)
        const blob = new Blob([md], { type: 'text/markdown' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${notebook.title.replace(/\s+/g, '_')}.md`
        a.click()
        URL.revokeObjectURL(url)
    }

    const filteredNotebooks = notebooks.filter((nb) => {
        if (!notebookMatchesQuery(nb, searchQuery)) {
            return false
        }
        if (createdByFilter === 'templates' && !nb.isTemplate) {
            return false
        }
        if (createdByFilter === 'user' && (nb.isTemplate || (nb.access_role && nb.access_role !== 'owner'))) {
            return false
        }
        if (createdByFilter === 'shared' && (!nb.access_role || nb.access_role === 'owner')) {
            return false
        }
        return true
    })

    const handlePinToDesktop = (notebook: StoredNotebook) => {
        try {
            const customAppsKey = 'wim_os_desktop_pinned_items'
            const existing = JSON.parse(localStorage.getItem(customAppsKey) || '[]')
            const docTitle = notebook.title || 'Untitled'

            const newItem = {
                id: notebook.id,
                label: docTitle,
                url: `/notebooks/${notebook.id}`,
                notebookId: notebook.id,
                iconType: 'document',
                pinnedAt: new Date().toISOString(),
            }

            if (existing.some((item: { id?: string }) => item.id === notebook.id)) {
                addToast({ description: `“${docTitle}” is already on your Desktop.` })
                return
            }

            existing.push(newItem)
            localStorage.setItem(customAppsKey, JSON.stringify(existing))
            window.dispatchEvent(new Event('wimDesktopPinnedChanged'))
            addToast({ description: `“${docTitle}” added to your Desktop.` })
        } catch (e) {
            console.error('Failed to pin notebook to desktop:', e)
            addToast({ description: 'Could not add this notebook to the Desktop.', error: true })
        }
    }

    const columns: LemonTableColumns<StoredNotebook> = [
        {
            title: 'Title',
            dataIndex: 'title' as any,
            key: 'title',
            width: '100%',
            render: function RenderTitle(_: any, notebook: StoredNotebook) {
                return (
                    <a
                        data-attr="notebook-title"
                        className="Link font-semibold flex flex-wrap items-center gap-2 cursor-pointer no-underline text-primary hover:underline text-sm"
                        onClick={(e) => {
                            e.preventDefault()
                            onSelectNotebook(notebook.id)
                        }}
                        onContextMenu={(e) => e.preventDefault()}
                        href={`/notebooks/${notebook.id}`}
                    >
                        <span className="whitespace-normal break-words">{notebook.title || 'Untitled'}</span>
                        {notebook.isTemplate && <LemonTag type="highlight">TEMPLATE</LemonTag>}
                        {notebook.isPublished && !notebook.isTemplate && (
                            <LemonTag type="completion" size="small">
                                Live
                            </LemonTag>
                        )}
                        {notebook.access_role && notebook.access_role !== 'owner' && (
                            <LemonTag type="highlight" size="small">
                                {notebook.access_role === 'viewer' ? 'Shared' : 'Shared · edit'}
                            </LemonTag>
                        )}
                    </a>
                )
            },
            sorter: (a: StoredNotebook, b: StoredNotebook) =>
                (a.title ?? 'Untitled').localeCompare(b.title ?? 'Untitled'),
        },
        {
            title: 'Created by',
            key: 'created_by',
            render: function RenderCreatedBy(_: any, notebook: StoredNotebook) {
                const user = notebook.isTemplate
                    ? { first_name: 'WIM' }
                    : notebook.created_by || { first_name: 'You' }

                return (
                    <div className="flex flex-row items-center flex-nowrap">
                        <ProfilePicture user={user} size="md" showName />
                    </div>
                )
            },
        },
        {
            title: 'Created',
            key: 'createdAt',
            align: 'right',
            render: function RenderCreated(_: any, notebook: StoredNotebook) {
                return (
                    <div className="whitespace-nowrap text-right">
                        <span
                            className="whitespace-nowrap align-middle border-b border-dotted border-primary text-xs text-muted font-normal cursor-help"
                            title={new Date(notebook.createdAt).toLocaleString()}
                        >
                            {timeAgo(notebook.createdAt)}
                        </span>
                    </div>
                )
            },
            sorter: (a: StoredNotebook, b: StoredNotebook) =>
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        },
        {
            title: 'Last modified',
            key: 'updatedAt',
            align: 'right',
            render: function RenderModified(_: any, notebook: StoredNotebook) {
                return (
                    <div className="whitespace-nowrap text-right">
                        <span
                            className="whitespace-nowrap align-middle border-b border-dotted border-primary text-xs text-muted font-normal cursor-help"
                            title={new Date(notebook.updatedAt).toLocaleString()}
                        >
                            {timeAgo(notebook.updatedAt)}
                        </span>
                    </div>
                )
            },
            sorter: (a: StoredNotebook, b: StoredNotebook) =>
                new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
        },
        {
            title: '',
            key: 'actions',
            render: function RenderActions(_: any, notebook: StoredNotebook) {
                if (notebook.isTemplate) {
                    return null
                }
                const shared = Boolean(notebook.access_role && notebook.access_role !== 'owner')
                return (
                    <div
                        className="flex justify-end"
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                        }}
                    >
                        <MenuBar
                            triggerAsChild
                            menus={[
                                {
                                    hideChevron: true,
                                    trigger: (
                                        <button
                                            type="button"
                                            aria-label="more"
                                            className="flex items-center justify-center size-6 rotate-90 text-muted hover:text-primary"
                                        >
                                            <IconEllipsis className="size-4" />
                                        </button>
                                    ),
                                    items: [
                                        {
                                            type: 'item',
                                            label: 'Add to Desktop',
                                            onClick: () => handlePinToDesktop(notebook),
                                        },
                                        {
                                            type: 'item',
                                            label: 'Duplicate',
                                            icon: <IconCopy className="size-4" />,
                                            onClick: () => handleDuplicate(notebook.id),
                                        },
                                        {
                                            type: 'item',
                                            label: 'Download .md',
                                            onClick: () => handleExportMd(notebook),
                                        },
                                        {
                                            type: 'item',
                                            label: 'Export JSON',
                                            onClick: () => handleExportJSON(notebook),
                                        },
                                        { type: 'separator' },
                                        shared
                                            ? {
                                                  type: 'item' as const,
                                                  label: 'Leave',
                                                  icon: <IconTrash className="size-4" />,
                                                  onClick: () => {
                                                      void leaveSharedNotebook(notebook.id).then(() => {
                                                          reloadNotebooks()
                                                          addToast({ description: `Left “${notebook.title}”` })
                                                      })
                                                  },
                                              }
                                            : {
                                                  type: 'item' as const,
                                                  label: 'Delete',
                                                  icon: <IconTrash className="size-4" />,
                                                  onClick: () => handleDelete(notebook.id, notebook.title),
                                              },
                                    ],
                                },
                            ]}
                        />
                    </div>
                )
            },
        },
    ]

    const emptyLibrary = notebooks.length === 0
    const searchActive = Boolean(searchQuery.trim())
    const filters = [
        { id: 'all', label: 'All notebooks' },
        { id: 'user', label: 'Yours' },
        { id: 'shared', label: 'Shared with you' },
        { id: 'templates', label: 'Templates' },
    ] as const
    const filterCounts: Record<string, number> = {
        all: notebooks.length,
        user: notebooks.filter((nb) => !nb.isTemplate && (!nb.access_role || nb.access_role === 'owner')).length,
        shared: notebooks.filter((nb) => Boolean(nb.access_role && nb.access_role !== 'owner')).length,
        templates: notebooks.filter((nb) => Boolean(nb.isTemplate)).length,
    }

    return (
        <div className="@container w-full h-full min-h-0 flex flex-col bg-primary text-primary overflow-hidden">
            <div data-scheme="secondary" className="flex @2xl:flex-row flex-col flex-1 min-h-0 overflow-hidden">
                <aside
                    data-scheme="secondary"
                    className="w-full @2xl:w-64 bg-primary flex-shrink-0 @2xl:border-r border-primary @2xl:h-full @2xl:min-h-0"
                >
                    <div className="flex flex-col h-full min-h-0">
                        <div className="border-b border-primary px-2 pt-2 pb-2">
                            <OSButton variant="primary" size="md" width="full" onClick={onCreateNew}>
                                New notebook
                            </OSButton>
                        </div>
                        <div className="px-2 pt-2 pb-1">
                            <input
                                type="search"
                                placeholder="Search titles or content"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                data-attr="notebooks-search"
                                className="w-full rounded border border-primary bg-primary px-2 py-1.5 text-sm text-primary placeholder:text-muted"
                            />
                        </div>
                        <div className="@2xl:hidden">
                            <Select
                                className="w-full border-none rounded-none"
                                placeholder="Filter"
                                value={createdByFilter}
                                onValueChange={(value) => setCreatedByFilter(value || 'all')}
                                groups={[
                                    {
                                        label: 'Notebooks',
                                        items: filters.map((filter) => ({
                                            label: `${filter.label} (${filterCounts[filter.id]})`,
                                            value: filter.id,
                                        })),
                                    },
                                ]}
                            />
                        </div>
                        <ScrollArea className="hidden @2xl:block flex-1 min-h-0 p-2">
                            <div className="flex flex-col gap-px">
                                {filters.map((filter) => (
                                    <OSButton
                                        key={filter.id}
                                        align="left"
                                        width="full"
                                        hover="background"
                                        size="sm"
                                        className={createdByFilter === filter.id ? 'font-semibold bg-accent' : ''}
                                        onClick={() => setCreatedByFilter(filter.id)}
                                    >
                                        <span className="flex-1 truncate">{filter.label}</span>
                                        <span className="text-muted text-xs tabular-nums">
                                            {filterCounts[filter.id]}
                                        </span>
                                    </OSButton>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                </aside>

                <main
                    data-scheme="primary"
                    className="flex-1 min-h-0 bg-primary overflow-hidden @2xl:border-none border-t border-primary flex flex-col"
                >
                    <div className={`${NOTEBOOK_PRODUCT_SCOPE_CLASS} flex-1 min-h-0 overflow-auto p-3 sm:p-4`}>
                        <LemonTable
                            data-attr="notebooks-table"
                            dataSource={filteredNotebooks}
                            columns={columns}
                            rowKey="id"
                            rowClassName={(notebook) =>
                                leavingIds.has(notebook.id)
                                    ? 'opacity-0 -translate-y-1 transition duration-200 ease-out pointer-events-none'
                                    : 'transition duration-200 ease-out'
                            }
                            loading={false}
                            defaultSorting={{ columnKey: 'updatedAt', order: -1 }}
                            pagination={{ pageSize: 25, hideOnSinglePage: true }}
                            emptyState={
                                emptyLibrary ? (
                                    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                                        <p className="m-0 text-sm font-semibold text-primary">No notebooks yet</p>
                                        <p className="m-0 text-xs text-muted max-w-sm">
                                            Start a page. Inside the editor, type{' '}
                                            <span className="font-semibold">/</span> to insert a block.
                                        </p>
                                        <OSButton variant="primary" size="sm" icon={<IconPlus />} onClick={onCreateNew}>
                                            New notebook
                                        </OSButton>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center gap-1.5 py-8 text-center">
                                        <p className="m-0 text-sm font-medium text-primary">
                                            {searchActive
                                                ? `No notebooks match “${searchQuery.trim()}”`
                                                : 'No notebooks matching your filters'}
                                        </p>
                                        <p className="m-0 text-xs text-muted">
                                            Try another title, a word from the page, or clear the filter.
                                        </p>
                                    </div>
                                )
                            }
                            nouns={['notebook', 'notebooks']}
                            useURLForSorting={false}
                        />
                    </div>
                </main>
            </div>
        </div>
    )
}
