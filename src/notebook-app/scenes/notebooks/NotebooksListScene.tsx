import React, { useState, useEffect, useCallback } from 'react'
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
import {
    IconEllipsis,
    IconTrash,
    IconCopy,
} from '@posthog/icons'
import {
    StoredNotebook,
    getNotebooks,
    deleteNotebook,
    duplicateNotebook,
    exportNotebookAsJSON,
    exportNotebookAsMarkdown,
} from './notebookStorage'
import { NotebookSelectButton } from './NotebookSelectButton/NotebookSelectButton'

interface NotebooksListSceneProps {
    onSelectNotebook: (id: string) => void
    onCreateNew: () => void
    onOpenCanvas?: () => void
    onSelectTemplate?: (template: StoredNotebook) => void
}

function timeAgo(dateStr: string): string {
    if (!dateStr) return 'â€”'
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 86400)}d ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return new Date(dateStr).toLocaleDateString()
}

const CONTAINING_OPTIONS = [
    { value: 'all', label: 'Any content' },
    { value: 'query', label: 'Queries' },
    { value: 'recording', label: 'Session recordings' },
    { value: 'feature-flag', label: 'Feature flags' },
    { value: 'cohort', label: 'Cohorts' },
    { value: 'experiment', label: 'Experiments' },
]

export function NotebooksListScene({
    onSelectNotebook,
    onCreateNew,
}: NotebooksListSceneProps): JSX.Element {
    const [searchQuery, setSearchQuery] = useState('')
    const [containsFilter, setContainsFilter] = useState('all')
    const [createdByFilter, setCreatedByFilter] = useState('all')
    const [notebooks, setNotebooks] = useState<StoredNotebook[]>(() => getNotebooks())

    const reloadNotebooks = useCallback(() => {
        setNotebooks(getNotebooks())
    }, [])

    useEffect(() => {
        reloadNotebooks()
    }, [reloadNotebooks])

    const handleDelete = (id: string, title: string) => {
        if (confirm(`Are you sure you want to delete "${title}"?`)) {
            deleteNotebook(id)
            reloadNotebooks()
        }
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

    // Filter notebooks list
    const filteredNotebooks = notebooks.filter((nb) => {
        if (searchQuery && !nb.title.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false
        }
        if (containsFilter !== 'all') {
            const tag = `<ph-${containsFilter}`
            if (!nb.content.toLowerCase().includes(tag)) {
                return false
            }
        }
        if (createdByFilter === 'templates' && !nb.isTemplate) {
            return false
        }
        if (createdByFilter === 'user' && nb.isTemplate) {
            return false
        }
        return true
    })

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
                        className="Link font-semibold flex items-center gap-2 cursor-pointer no-underline text-primary hover:underline text-sm"
                        onClick={(e) => {
                            e.preventDefault()
                            onSelectNotebook(notebook.id)
                        }}
                        href={`#/notebook/${notebook.id}`}
                    >
                        <span>{notebook.title || 'Untitled'}</span>
                        {notebook.isTemplate && <LemonTag type="highlight">TEMPLATE</LemonTag>}
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
                    ? { first_name: 'PostHog' }
                    : notebook.created_by || { first_name: 'Mustafa (you)' }

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
                            className="whitespace-nowrap align-middle border-b border-dotted border-border text-xs text-muted font-normal cursor-help"
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
                            className="whitespace-nowrap align-middle border-b border-dotted border-border text-xs text-muted font-normal cursor-help"
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
                            {
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

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Top Bar with Notebooks button & Search box side-by-side + Filters */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 items-stretch sm:items-center mb-4 sm:mb-6">
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
                        placeholder="Search for notebooks"
                        onChange={setSearchQuery}
                        value={searchQuery}
                        data-attr="notebooks-search"
                        size="small"
                        className="w-full sm:w-72"
                    />
                </div>

                <div className="flex items-center gap-4 sm:gap-6 flex-wrap text-xs text-secondary justify-between sm:justify-end">
                    <div className="flex items-center gap-2">
                        <span className="font-medium">Containing:</span>
                        <LemonSelect
                            size="small"
                            value={containsFilter}
                            onChange={(val) => setContainsFilter(val || 'all')}
                            options={CONTAINING_OPTIONS}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="font-medium">Created by:</span>
                        <LemonSelect
                            size="small"
                            value={createdByFilter}
                            onChange={(val) => setCreatedByFilter(val || 'all')}
                            options={[
                                { value: 'all', label: 'All users' },
                                { value: 'user', label: 'Mustafa (you)' },
                                { value: 'templates', label: 'PostHog' },
                            ]}
                        />
                    </div>
                </div>
            </div>

            {/* Table matching PostHog LemonTable with horizontal scroll for mobile */}
            <div className="overflow-x-auto max-w-full -mx-3 sm:mx-0 px-3 sm:px-0">
                <LemonTable
                    data-attr="notebooks-table"
                    dataSource={filteredNotebooks}
                    columns={columns}
                    rowKey="id"
                    loading={false}
                    emptyState="No notebooks matching your filters!"
                    nouns={['notebook', 'notebooks']}
                    useURLForSorting={false}
                />
            </div>
        </div>
    )
}
