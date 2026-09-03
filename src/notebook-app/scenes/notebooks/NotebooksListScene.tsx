import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
    LemonButton,
    LemonInput,
    LemonMenu,
    LemonTag,
    LemonSelect,
    ProfilePicture,
} from '~nb-lib/lemon-ui/index'
import { LemonTable } from '../../lib/lemon-ui/LemonTable/LemonTable'
import type { LemonTableColumns } from '../../lib/lemon-ui/LemonTable/types'
import { notebookMatchesQuery } from './notebookPreview'
import { Download } from 'lucide-react'
import {
    IconEllipsis,
    IconPlus,
    IconTrash,
    IconCopy,
} from '@posthog/icons'
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
import { NotebookSelectButton } from './NotebookSelectButton/NotebookSelectButton'

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

    // PostHog's exact columns: Title, Created by, Created, Last modified, Actions
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
            sorter: (a: StoredNotebook, b: StoredNotebook) => (a.title ?? 'Untitled').localeCompare(b.title ?? 'Untitled'),
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
            sorter: (a: StoredNotebook, b: StoredNotebook) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
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
            sorter: (a: StoredNotebook, b: StoredNotebook) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
        },
        {
            title: '',
            key: 'actions',
            render: function RenderActions(_: any, notebook: StoredNotebook) {
                if (notebook.isTemplate) {
                    return null
                }
                return (
                    <LemonMenu
                        items={[
                            {
                                label: 'Add to Desktop',
                                icon: <Download className="size-4" />,
                                onClick: () => handlePinToDesktop(notebook),
                            },
                            {
                                label: 'Duplicate',
                                icon: <IconCopy />,
                                onClick: () => handleDuplicate(notebook.id),
                            },
                            {
                                label: 'Download .md',
                                onClick: () => handleExportMd(notebook),
                            },
                            {
                                label: 'Export JSON',
                                onClick: () => handleExportJSON(notebook),
                            },
                            notebook.access_role && notebook.access_role !== 'owner'
                                ? {
                                      label: 'Leave',
                                      icon: <IconTrash />,
                                      status: 'danger' as const,
                                      onClick: () => {
                                          void leaveSharedNotebook(notebook.id).then(() => {
                                              reloadNotebooks()
                                              addToast({ description: `Left “${notebook.title}”` })
                                          })
                                      },
                                  }
                                : {
                                      label: 'Delete',
                                      icon: <IconTrash />,
                                      status: 'danger' as const,
                                      onClick: () => handleDelete(notebook.id, notebook.title),
                                  },
                        ]}
                    >
                        <LemonButton aria-label="more" icon={<IconEllipsis />} size="small" />
                    </LemonMenu>
                )
            },
        },
    ]

    const emptyLibrary = notebooks.length === 0
    const searchActive = Boolean(searchQuery.trim())

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4 items-stretch sm:items-center mb-2 sm:mb-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
                    <NotebookSelectButton
                        onSelectNotebook={onSelectNotebook}
                        onCreateNew={onCreateNew}
                        buttonText="Notebooks"
                        size="small"
                        type="secondary"
                    />
                    <LemonInput
                        type="search"
                        placeholder="Search titles or content"
                        onChange={setSearchInput}
                        value={searchInput}
                        data-attr="notebooks-search"
                        size="small"
                        className="w-full sm:w-72"
                    />
                </div>

                <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
                    <div className="flex items-center gap-2 text-xs text-secondary">
                        <span className="font-medium">Created by:</span>
                        <LemonSelect
                            size="small"
                            value={createdByFilter}
                            onChange={(val) => setCreatedByFilter(val || 'all')}
                            options={[
                                { value: 'all', label: 'All users' },
                                { value: 'user', label: 'You' },
                                { value: 'shared', label: 'Shared with you' },
                                { value: 'templates', label: 'WIM Templates' },
                            ]}
                        />
                    </div>
                    <LemonButton size="small" type="primary" icon={<IconPlus />} onClick={onCreateNew}>
                        New notebook
                    </LemonButton>
                </div>
            </div>

            <div className="flex items-center justify-between gap-3 text-[11px] text-muted px-0.5">
                <span>
                    {filteredNotebooks.length === notebooks.length
                        ? `${notebooks.length} ${notebooks.length === 1 ? 'notebook' : 'notebooks'}`
                        : `${filteredNotebooks.length} of ${notebooks.length}`}
                </span>
                <span className="hidden sm:inline select-none">
                    <kbd className="px-1.5 py-0.5 rounded-md border border-primary bg-surface-secondary font-medium">
                        ⌘K
                    </kbd>{' '}
                    to jump
                </span>
            </div>

            <div className="overflow-x-auto max-w-full -mx-3 sm:mx-0 px-3 sm:px-0">
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
                                    Start a page. Inside the editor, type <span className="font-semibold">/</span> to
                                    insert a block.
                                </p>
                                <LemonButton type="primary" size="small" icon={<IconPlus />} onClick={onCreateNew}>
                                    New notebook
                                </LemonButton>
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
        </div>
    )
}
