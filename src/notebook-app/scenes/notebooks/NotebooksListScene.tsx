import React, { useState, useEffect, useCallback, useRef } from 'react'
import { collectLocalNotebookFaces } from './notebookFaces'
import { NotebookFaceStack } from './NotebookFaceStack'
import { NotebookTag } from './NotebookMeta'
import { LemonTable } from '../../lib/lemon-ui/LemonTable/LemonTable'
import type { LemonTableColumns } from '../../lib/lemon-ui/LemonTable/types'
import { notebookMatchesQuery } from './notebookPreview'
import { IconCheckCircle, IconCopy, IconEllipsis, IconFolder, IconNotebook, IconPlus, IconTrash } from '@posthog/icons'
import OSButton from 'components/OSButton'
import { Fieldset } from 'components/OSFieldset'
import { Checkbox } from 'components/RadixUI/Checkbox'
import MenuBar from 'components/RadixUI/MenuBar'
import ScrollArea from 'components/RadixUI/ScrollArea'
import { Select } from 'components/RadixUI/Select'
import { useToast } from '../../../context/Toast'
import {
    StoredNotebook,
    getNotebooks,
    getNotebook,
    saveNotebook,
    deleteNotebook,
    duplicateNotebook,
    leaveSharedNotebook,
    exportNotebookAsJSON,
    exportNotebookAsMarkdown,
    getOrCreateDailyNotebook,
    WIM_NOTEBOOKS_CHANGED_EVENT,
    WIM_NOTEBOOKS_HYDRATED_EVENT,
} from './notebookStorage'
import {
    collectNotebookTasks,
    dateFromKey,
    folderDepth,
    folderLeaf,
    groupNotebookTasks,
    listNotebookFolders,
    listNotebookTags,
    normalizeFolder,
    normalizeTag,
    todayKey,
    uniqueTags,
    toggleTaskLine,
} from './notebookOrganize'
import { NOTEBOOK_PRODUCT_SCOPE_CLASS } from '../../../lib/lemon/ensureNotebookProductStyles'
import { NotebookDailyCalendar } from './NotebookDailyCalendar'

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
    const [folderFilter, setFolderFilter] = useState('')
    const [tagFilter, setTagFilter] = useState('')
    const [listView, setListView] = useState<'notebooks' | 'tasks'>('notebooks')
    const [dailyJump, setDailyJump] = useState(() => todayKey())
    const [organizeDraft, setOrganizeDraft] = useState<{
        id: string
        mode: 'folder' | 'tag'
        value: string
    } | null>(null)
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
        if (createdByFilter === 'daily' && nb.kind !== 'daily') {
            return false
        }
        if (folderFilter && normalizeFolder(nb.folder) !== folderFilter) {
            return false
        }
        if (tagFilter && !uniqueTags(nb.tags).some((tag) => tag.toLowerCase() === tagFilter.toLowerCase())) {
            return false
        }
        return true
    })

    const folders = listNotebookFolders(notebooks)
    const tags = listNotebookTags(notebooks)
    const dailyDates = notebooks
        .filter((notebook) => notebook.kind === 'daily' && notebook.dailyDate)
        .map((notebook) => notebook.dailyDate as string)
    const allTasks = collectNotebookTasks(notebooks)
    const tasks = collectNotebookTasks(filteredNotebooks)
    const taskGroups = groupNotebookTasks(tasks)
    const openTaskCount = allTasks.filter((task) => !task.done).length

    const handleOpenDaily = (key?: string) => {
        const date = key ? dateFromKey(key) : new Date()
        if (!date) return
        setDailyJump(todayKey(date))
        const notebook = getOrCreateDailyNotebook(date)
        reloadNotebooks()
        onSelectNotebook(notebook.id)
    }

    const handleSetFolder = (id: string, folder: string) => {
        const notebook = getNotebook(id)
        if (!notebook) return
        saveNotebook({ ...notebook, folder: normalizeFolder(folder) || undefined })
        reloadNotebooks()
    }

    const handleAddTag = (id: string, raw: string) => {
        const notebook = getNotebook(id)
        if (!notebook) return
        const tag = normalizeTag(raw)
        if (!tag) return
        saveNotebook({ ...notebook, tags: uniqueTags([...(notebook.tags || []), tag]) })
        reloadNotebooks()
    }

    const handleClearTags = (id: string) => {
        const notebook = getNotebook(id)
        if (!notebook) return
        saveNotebook({ ...notebook, tags: [] })
        reloadNotebooks()
    }

    const submitOrganizeDraft = () => {
        if (!organizeDraft) return
        if (organizeDraft.mode === 'folder') {
            handleSetFolder(organizeDraft.id, organizeDraft.value)
        } else {
            handleAddTag(organizeDraft.id, organizeDraft.value)
        }
        setOrganizeDraft(null)
    }

    const handleToggleTask = (notebookId: string, line: number) => {
        const notebook = getNotebook(notebookId)
        if (!notebook) return
        saveNotebook({ ...notebook, content: toggleTaskLine(notebook.content, line) })
        reloadNotebooks()
    }

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
            // Graceful fallback (kept for production safety)
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
                    <div className="flex flex-wrap items-center gap-1.5">
                    <a
                        data-attr="notebook-title"
                        className="Link font-semibold cursor-pointer no-underline text-primary hover:underline text-sm"
                        onClick={(e) => {
                            e.preventDefault()
                            onSelectNotebook(notebook.id)
                        }}
                        onContextMenu={(e) => e.preventDefault()}
                        href={`/notebooks/${notebook.id}`}
                    >
                        <span className="whitespace-normal break-words">{notebook.title || 'Untitled'}</span>
                    </a>
                        {notebook.folder ? (
                            <span
                                role="button"
                                className="text-xs text-muted font-normal"
                                onClick={(event) => {
                                    event.preventDefault()
                                    event.stopPropagation()
                                    setListView('notebooks')
                                    setCreatedByFilter('all')
                                    setTagFilter('')
                                    setFolderFilter(normalizeFolder(notebook.folder))
                                }}
                            >
                                {notebook.folder}
                            </span>
                        ) : null}
                        {uniqueTags(notebook.tags).map((tag) => (
                            <NotebookTag
                                key={tag}
                                onClick={(event) => {
                                    event.preventDefault()
                                    event.stopPropagation()
                                    setListView('notebooks')
                                    setCreatedByFilter('all')
                                    setFolderFilter('')
                                    setTagFilter(tag)
                                }}
                            >
                                #{tag}
                            </NotebookTag>
                        ))}
                        {notebook.kind === 'daily' && <NotebookTag>Daily</NotebookTag>}
                        {notebook.isTemplate && <NotebookTag>Template</NotebookTag>}
                        {notebook.isPublished && !notebook.isTemplate && <NotebookTag>Live</NotebookTag>}
                        {notebook.access_role && notebook.access_role !== 'owner' && (
                            <NotebookTag>
                                {notebook.access_role === 'viewer' ? 'Shared' : 'Shared · edit'}
                            </NotebookTag>
                        )}
                    </div>
                )
            },
            sorter: (a: StoredNotebook, b: StoredNotebook) =>
                (a.title ?? 'Untitled').localeCompare(b.title ?? 'Untitled'),
        },
        {
            title: 'Created by',
            key: 'created_by',
            render: function RenderCreatedBy(_: any, notebook: StoredNotebook) {
                const faces = notebook.isTemplate
                    ? [{ key: 'wim', name: 'WIM', role: 'author' as const }]
                    : collectLocalNotebookFaces({
                          createdBy: notebook.created_by || { first_name: 'You' },
                          lastModifiedBy: notebook.last_modified_by,
                          markdown: notebook.content,
                      })
                const lead = faces[0]
                return (
                    <div className="flex flex-row items-center flex-nowrap gap-1.5 min-w-0">
                        <NotebookFaceStack faces={faces} size={24} />
                        <span className="text-sm truncate">{lead?.name || 'You'}</span>
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
                                            label: 'Move to folder…',
                                            onClick: () =>
                                                setOrganizeDraft({
                                                    id: notebook.id,
                                                    mode: 'folder',
                                                    value: notebook.folder || '',
                                                }),
                                        },
                                        ...folders.map((folder) => ({
                                            type: 'item' as const,
                                            label: `Folder: ${folder}`,
                                            onClick: () => handleSetFolder(notebook.id, folder),
                                        })),
                                        notebook.folder
                                            ? {
                                                  type: 'item' as const,
                                                  label: 'Remove from folder',
                                                  onClick: () => handleSetFolder(notebook.id, ''),
                                              }
                                            : null,
                                        {
                                            type: 'item',
                                            label: 'Add tag…',
                                            onClick: () =>
                                                setOrganizeDraft({ id: notebook.id, mode: 'tag', value: '' }),
                                        },
                                        notebook.tags?.length
                                            ? {
                                                  type: 'item' as const,
                                                  label: 'Clear tags',
                                                  onClick: () => handleClearTags(notebook.id),
                                              }
                                            : null,
                                        { type: 'separator' },
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
                                    ].filter((item): item is NonNullable<typeof item> => item != null),
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
        { id: 'daily', label: 'Daily notes' },
        { id: 'templates', label: 'Templates' },
    ] as const
    const filterCounts: Record<string, number> = {
        all: notebooks.length,
        user: notebooks.filter((nb) => !nb.isTemplate && (!nb.access_role || nb.access_role === 'owner')).length,
        shared: notebooks.filter((nb) => Boolean(nb.access_role && nb.access_role !== 'owner')).length,
        daily: notebooks.filter((nb) => nb.kind === 'daily').length,
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
                        <div className="border-b border-primary px-2 pt-2 pb-2 space-y-1">
                            <OSButton variant="primary" size="md" width="full" onClick={onCreateNew}>
                                New notebook
                            </OSButton>
                            <OSButton
                                size="sm"
                                width="full"
                                hover="background"
                                icon={<IconNotebook />}
                                onClick={() => handleOpenDaily()}
                            >
                                Today
                            </OSButton>
                            <NotebookDailyCalendar
                                selected={dailyJump}
                                markedDates={dailyDates}
                                onSelect={handleOpenDaily}
                            />
                            <OSButton
                                size="sm"
                                width="full"
                                hover="background"
                                icon={<IconCheckCircle />}
                                className={listView === 'tasks' ? 'font-semibold bg-accent' : ''}
                                onClick={() => setListView((current) => (current === 'tasks' ? 'notebooks' : 'tasks'))}
                            >
                                <span className="flex-1 truncate text-left">Tasks</span>
                                <NotebookTag>{openTaskCount}</NotebookTag>
                            </OSButton>
                        </div>
                        <div className="px-2 pt-2 pb-1">
                            <input
                                type="search"
                                placeholder="Search titles or content"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                data-attr="notebooks-search"
                                className="notebook-native-field w-full rounded-sm border border-primary px-2 py-1.5 text-sm text-primary placeholder:text-muted"
                            />
                        </div>
                        <div className="@2xl:hidden">
                            <Select
                                className="w-full border-none rounded-none"
                                placeholder="Filter"
                                value={
                                    listView === 'tasks'
                                        ? 'view:tasks'
                                        : folderFilter
                                          ? `folder:${folderFilter}`
                                          : tagFilter
                                            ? `tag:${tagFilter}`
                                            : `filter:${createdByFilter}`
                                }
                                onValueChange={(value) => {
                                    if (!value) return
                                    if (value === 'view:tasks') {
                                        setListView('tasks')
                                        return
                                    }
                                    if (value.startsWith('folder:')) {
                                        setListView('notebooks')
                                        setCreatedByFilter('all')
                                        setTagFilter('')
                                        setFolderFilter(value.slice('folder:'.length))
                                        return
                                    }
                                    if (value.startsWith('tag:')) {
                                        setListView('notebooks')
                                        setCreatedByFilter('all')
                                        setFolderFilter('')
                                        setTagFilter(value.slice('tag:'.length))
                                        return
                                    }
                                    setListView('notebooks')
                                    setFolderFilter('')
                                    setTagFilter('')
                                    setCreatedByFilter(value.replace(/^filter:/, '') || 'all')
                                }}
                                groups={[
                                    {
                                        label: 'Notebooks',
                                        items: [
                                            {
                                                label: `Tasks (${openTaskCount})`,
                                                value: 'view:tasks',
                                            },
                                            ...filters.map((filter) => ({
                                                label: `${filter.label} (${filterCounts[filter.id]})`,
                                                value: `filter:${filter.id}`,
                                            })),
                                        ],
                                    },
                                    ...(folders.length
                                        ? [
                                              {
                                                  label: 'Folders',
                                                  items: folders.map((folder) => ({
                                                      label: folder,
                                                      value: `folder:${folder}`,
                                                  })),
                                              },
                                          ]
                                        : []),
                                    ...(tags.length
                                        ? [
                                              {
                                                  label: 'Tags',
                                                  items: tags.map((tag) => ({
                                                      label: `#${tag}`,
                                                      value: `tag:${tag}`,
                                                  })),
                                              },
                                          ]
                                        : []),
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
                                        className={
                                            listView === 'notebooks' &&
                                            createdByFilter === filter.id &&
                                            !folderFilter &&
                                            !tagFilter
                                                ? 'font-semibold bg-accent'
                                                : ''
                                        }
                                        onClick={() => {
                                            setListView('notebooks')
                                            setCreatedByFilter(filter.id)
                                            setFolderFilter('')
                                            setTagFilter('')
                                        }}
                                    >
                                        <span className="flex-1 truncate">{filter.label}</span>
                                        <span className="text-muted text-xs tabular-nums">
                                            {filterCounts[filter.id]}
                                        </span>
                                    </OSButton>
                                ))}
                                {folders.length ? (
                                    <div className="pt-3">
                                        <p className="m-0 px-2 pb-1 text-[11px] uppercase tracking-wide text-muted">
                                            Folders
                                        </p>
                                        {folders.map((folder) => (
                                            <OSButton
                                                key={folder}
                                                align="left"
                                                width="full"
                                                hover="background"
                                                size="sm"
                                                icon={<IconFolder />}
                                                className={folderFilter === folder ? 'font-semibold bg-accent' : ''}
                                                onClick={() => {
                                                    setListView('notebooks')
                                                    setCreatedByFilter('all')
                                                    setTagFilter('')
                                                    setFolderFilter(folder)
                                                }}
                                            >
                                                <span
                                                    className="flex-1 truncate"
                                                    style={{ paddingLeft: folderDepth(folder) * 10 }}
                                                >
                                                    {folderLeaf(folder)}
                                                </span>
                                            </OSButton>
                                        ))}
                                    </div>
                                ) : null}
                                {tags.length ? (
                                    <div className="pt-3">
                                        <p className="m-0 px-2 pb-1 text-[11px] uppercase tracking-wide text-muted">
                                            Tags
                                        </p>
                                        {tags.map((tag) => (
                                            <OSButton
                                                key={tag}
                                                align="left"
                                                width="full"
                                                hover="background"
                                                size="sm"
                                                className={
                                                    tagFilter.toLowerCase() === tag.toLowerCase()
                                                        ? 'font-semibold bg-accent'
                                                        : ''
                                                }
                                                onClick={() => {
                                                    setListView('notebooks')
                                                    setCreatedByFilter('all')
                                                    setFolderFilter('')
                                                    setTagFilter(tag)
                                                }}
                                            >
                                                <span className="flex-1 truncate">#{tag}</span>
                                            </OSButton>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        </ScrollArea>
                    </div>
                </aside>

                <main
                    data-scheme="primary"
                    className="flex-1 min-h-0 bg-primary overflow-hidden @2xl:border-none border-t border-primary flex flex-col"
                >
                    <div className={`${NOTEBOOK_PRODUCT_SCOPE_CLASS} flex-1 min-h-0 overflow-auto p-3 sm:p-4`}>
                        {organizeDraft ? (
                            <div className="mb-3">
                                <Fieldset legend={organizeDraft.mode === 'folder' ? 'Move to folder' : 'Add tag'}>
                                    <input
                                        type="text"
                                        autoFocus
                                        value={organizeDraft.value}
                                        onChange={(event) =>
                                            setOrganizeDraft({ ...organizeDraft, value: event.target.value })
                                        }
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter') {
                                                event.preventDefault()
                                                submitOrganizeDraft()
                                            }
                                            if (event.key === 'Escape') setOrganizeDraft(null)
                                        }}
                                        placeholder={
                                            organizeDraft.mode === 'folder'
                                                ? 'Projects/Launch'
                                                : 'research'
                                        }
                                        className="notebook-native-field w-full rounded-sm border border-primary px-2 py-1.5 text-sm text-primary placeholder:text-muted"
                                    />
                                    <div className="flex items-center gap-1 pt-1">
                                        <OSButton variant="primary" size="sm" onClick={submitOrganizeDraft}>
                                            Save
                                        </OSButton>
                                        <OSButton size="sm" hover="background" onClick={() => setOrganizeDraft(null)}>
                                            Cancel
                                        </OSButton>
                                    </div>
                                </Fieldset>
                            </div>
                        ) : null}
                        {listView === 'tasks' ? (
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between gap-2 px-1">
                                    <p className="m-0 text-sm font-semibold text-primary">Tasks</p>
                                    <NotebookTag>{tasks.filter((task) => !task.done).length} open</NotebookTag>
                                </div>
                                {tasks.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center gap-1.5 py-10 text-center">
                                        <p className="m-0 text-sm font-semibold text-primary">No tasks yet</p>
                                        <p className="m-0 text-xs text-muted max-w-sm">
                                            Add a to-do list in a notebook with{' '}
                                            <span className="font-semibold">/ To-do list</span>. Write{' '}
                                            <span className="font-semibold">due:2026-09-10</span> on a line to sort it
                                            here.
                                        </p>
                                    </div>
                                ) : (
                                    taskGroups.map((group) => (
                                        <div key={group.notebookId} className="flex flex-col gap-px">
                                            <button
                                                type="button"
                                                className="px-2 pb-1 text-left text-[11px] uppercase tracking-wide text-muted hover:text-primary"
                                                onClick={() => onSelectNotebook(group.notebookId)}
                                            >
                                                {group.notebookTitle}
                                            </button>
                                            {group.tasks.map((task) => (
                                                <div
                                                    key={`${task.notebookId}-${task.line}`}
                                                    className="flex items-start gap-2 px-2 py-1.5 rounded-sm hover:bg-accent"
                                                >
                                                    <Checkbox
                                                        checked={task.done}
                                                        onCheckedChange={() =>
                                                            handleToggleTask(task.notebookId, task.line)
                                                        }
                                                        ariaLabel={task.text}
                                                        className="mt-0.5 size-4"
                                                    />
                                                    <button
                                                        type="button"
                                                        className="min-w-0 flex-1 text-left"
                                                        onClick={() => onSelectNotebook(task.notebookId)}
                                                    >
                                                        <span
                                                            className={`block text-sm ${
                                                                task.done
                                                                    ? 'line-through text-muted'
                                                                    : 'text-primary'
                                                            }`}
                                                        >
                                                            {task.text}
                                                        </span>
                                                        {task.due ? (
                                                            <span className="mt-0.5">
                                                                <NotebookTag>due {task.due}</NotebookTag>
                                                            </span>
                                                        ) : null}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
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
                                            <OSButton
                                                variant="primary"
                                                size="sm"
                                                icon={<IconPlus />}
                                                onClick={onCreateNew}
                                            >
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
                        )}
                    </div>
                </main>
            </div>
        </div>
    )
}
