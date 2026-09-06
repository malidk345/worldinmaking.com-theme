import React, { useEffect, useMemo, useState } from 'react'
import {
    ScratchpadStore,
    ScratchpadDocument,
    ScratchpadNode,
    ScratchpadNodeType,
    ScratchpadState,
} from '../../lib/scratchpad-store'
import OSInput from 'components/OSForm/input'
import OSTextarea from 'components/OSForm/textarea'
import OSButton from 'components/OSButton'
import ScrollArea from 'components/RadixUI/ScrollArea'
import { Checkbox } from 'components/RadixUI/Checkbox'
import SEO from 'components/seo'
import { useAppActions } from '../../context/App'
import { createNotebook } from '../../notebook-app/scenes/notebooks/notebookStorage'
import {
    IconDocument,
    IconTrash,
    IconPlus,
    IconX,
    IconEye,
    IconPencil,
    IconNotebook,
    IconPin,
    IconPinFilled,
} from '@posthog/icons'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'

type ScratchpadTab = 'all' | 'citations' | 'concepts' | 'sources' | 'notes' | 'documents' | 'tasks' | 'memories'

const NAVY = '#1D4ED8'
const chipStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 6px',
    border: `1px solid ${NAVY}`,
    borderRadius: 4,
    background: 'rgba(29, 78, 216, 0.1)',
    color: NAVY,
    fontSize: 12,
    fontWeight: 400,
    lineHeight: 1,
    whiteSpace: 'nowrap',
}

const fieldClass =
    'w-full rounded-sm border border-primary bg-primary px-2 py-1.5 text-sm text-primary placeholder:text-muted'

const TYPE_LABEL: Record<ScratchpadNodeType, string> = {
    citation: 'Citation',
    concept: 'Concept',
    source: 'Source',
    synthesis: 'Synthesis',
    note: 'Note',
}

function Chip({ children }: { children: React.ReactNode }) {
    return <span style={chipStyle}>{children}</span>
}

function nodeMatchesTab(node: ScratchpadNode, tab: ScratchpadTab): boolean {
    if (tab === 'all' || tab === 'documents' || tab === 'tasks' || tab === 'memories') return true
    if (tab === 'citations') return node.type === 'citation'
    if (tab === 'concepts') return node.type === 'concept'
    if (tab === 'sources') return node.type === 'source'
    return node.type === 'note' || node.type === 'synthesis'
}

export function ScratchpadWindow() {
    const { addWindow } = useAppActions()
    const [storeState, setStoreState] = useState<ScratchpadState>(() => ScratchpadStore.getState())
    const [activeTab, setActiveTab] = useState<ScratchpadTab>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [copied, setCopied] = useState(false)
    const [isAddingNode, setIsAddingNode] = useState(false)
    const [newTitle, setNewTitle] = useState('')
    const [newContent, setNewContent] = useState('')
    const [newSource, setNewSource] = useState('')
    const [newTags, setNewTags] = useState('')
    const [newType, setNewType] = useState<ScratchpadNodeType>('note')
    const [taskDraft, setTaskDraft] = useState('')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editTitle, setEditTitle] = useState('')
    const [editContent, setEditContent] = useState('')
    const [editSource, setEditSource] = useState('')
    const [inspectedDoc, setInspectedDoc] = useState<ScratchpadDocument | null>(null)
    const [sentNotebook, setSentNotebook] = useState(false)

    useEffect(() => {
        return ScratchpadStore.subscribe((next) => setStoreState({ ...next }))
    }, [])

    const counts = useMemo(() => {
        const nodes = storeState.nodes
        return {
            all: nodes.length + storeState.documents.length + storeState.tasks.length + storeState.memories.length,
            citations: nodes.filter((n) => n.type === 'citation').length,
            concepts: nodes.filter((n) => n.type === 'concept').length,
            sources: nodes.filter((n) => n.type === 'source').length,
            notes: nodes.filter((n) => n.type === 'note' || n.type === 'synthesis').length,
            documents: storeState.documents.length,
            tasks: storeState.tasks.length,
            memories: storeState.memories.length,
        }
    }, [storeState])

    const filteredDocs = useMemo(() => {
        if (!searchQuery.trim()) return storeState.documents
        const q = searchQuery.toLowerCase()
        return storeState.documents.filter(
            (d) => d.name.toLowerCase().includes(q) || d.content.toLowerCase().includes(q)
        )
    }, [storeState.documents, searchQuery])

    const filteredNodes = useMemo(() => {
        let list = storeState.nodes.filter((node) => nodeMatchesTab(node, activeTab))
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            list = list.filter(
                (n) =>
                    n.content.toLowerCase().includes(q) ||
                    n.source?.toLowerCase().includes(q) ||
                    n.title?.toLowerCase().includes(q) ||
                    n.tags?.some((t) => t.toLowerCase().includes(q))
            )
        }
        return [...list].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)))
    }, [storeState.nodes, activeTab, searchQuery])

    const filteredTasks = useMemo(() => {
        if (!searchQuery.trim()) return storeState.tasks
        const q = searchQuery.toLowerCase()
        return storeState.tasks.filter((t) => t.title.toLowerCase().includes(q))
    }, [storeState.tasks, searchQuery])

    const filteredMemories = useMemo(() => {
        if (!searchQuery.trim()) return storeState.memories
        const q = searchQuery.toLowerCase()
        return storeState.memories.filter(
            (m) => m.fact.toLowerCase().includes(q) || m.category?.toLowerCase().includes(q)
        )
    }, [storeState.memories, searchQuery])

    const completedTasksCount = storeState.tasks.filter((t) => t.status === 'completed').length
    const hasAnyContent =
        storeState.nodes.length > 0 ||
        storeState.documents.length > 0 ||
        storeState.tasks.length > 0 ||
        storeState.memories.length > 0

    const showDocs = activeTab === 'all' || activeTab === 'documents'
    const showNodes = activeTab === 'all' || ['citations', 'concepts', 'sources', 'notes'].includes(activeTab)
    const showTasks = activeTab === 'all' || activeTab === 'tasks'
    const showMemories = activeTab === 'all' || activeTab === 'memories'

    const hasVisibleItems =
        (showDocs && filteredDocs.length > 0) ||
        (showNodes && filteredNodes.length > 0) ||
        (showMemories && filteredMemories.length > 0) ||
        (showTasks && filteredTasks.length > 0)

    const handleCopyAll = async () => {
        const md = ScratchpadStore.asMarkdown()
        if (!md) return
        try {
            await navigator.clipboard.writeText(md)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            /* ignore */
        }
    }

    const handleSendToNotebook = () => {
        const md = ScratchpadStore.asMarkdown()
        if (!md) return
        const notebook = createNotebook('Scratchpad', md)
        addWindow({
            key: `notebook-${notebook.id}`,
            path: `/notebooks/${notebook.id}`,
            title: notebook.title,
            icon: 'notebook',
            focused: true,
        })
        setSentNotebook(true)
        setTimeout(() => setSentNotebook(false), 2000)
    }

    const resetComposer = () => {
        setNewContent('')
        setNewTitle('')
        setNewSource('')
        setNewTags('')
        setNewType('note')
        setIsAddingNode(false)
    }

    const handleAddNodeSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!newContent.trim()) return
        ScratchpadStore.addNode({
            content: newContent,
            title: newTitle.trim() || undefined,
            source: newSource.trim() || undefined,
            type: newType,
            tags: newTags
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean),
        })
        resetComposer()
    }

    const startEdit = (node: ScratchpadNode) => {
        setEditingId(node.id)
        setEditTitle(node.title || '')
        setEditContent(node.content)
        setEditSource(node.source || '')
    }

    const saveEdit = () => {
        if (!editingId || !editContent.trim()) return
        ScratchpadStore.updateNode(editingId, {
            title: editTitle,
            content: editContent,
            source: editSource,
        })
        setEditingId(null)
    }

    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault()
        if (!ScratchpadStore.addTask(taskDraft)) return
        setTaskDraft('')
    }

    const copyText = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text)
        } catch {
            /* ignore */
        }
    }

    const rail: { id: ScratchpadTab; label: string; count: number }[] = [
        { id: 'all', label: 'All', count: counts.all },
        { id: 'notes', label: 'Notes', count: counts.notes },
        { id: 'citations', label: 'Citations', count: counts.citations },
        { id: 'concepts', label: 'Concepts', count: counts.concepts },
        { id: 'sources', label: 'Sources', count: counts.sources },
        { id: 'documents', label: 'Documents', count: counts.documents },
        { id: 'tasks', label: 'Tasks', count: counts.tasks },
        { id: 'memories', label: 'Memories', count: counts.memories },
    ]

    return (
        <div data-scheme="primary" className="@container bg-primary text-primary h-full flex flex-col min-h-0 font-sans">
            <SEO title="Scratchpad" description="Working memory and knowledge context on WorldInMaking." />
            <div className="flex items-center gap-1 min-w-0 px-2 py-2 border-b border-primary bg-primary flex-shrink-0">
                <div className="w-[min(16rem,50vw)] shrink-0">
                    <OSInput
                        label="Search scratchpad"
                        showLabel={false}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search notes, docs, tasks…"
                        size="sm"
                    />
                </div>
                <OSButton size="sm" hover="background" icon={<IconPlus />} onClick={() => setIsAddingNode((v) => !v)}>
                    {isAddingNode ? 'Cancel' : 'New note'}
                </OSButton>
                {hasAnyContent ? (
                    <>
                        <OSButton size="sm" hover="background" icon={<IconNotebook />} onClick={handleSendToNotebook}>
                            {sentNotebook ? 'Opened' : 'To notebook'}
                        </OSButton>
                        <OSButton size="sm" hover="background" onClick={handleCopyAll}>
                            {copied ? 'Copied' : 'Copy all'}
                        </OSButton>
                        <OSButton size="sm" hover="background" onClick={() => ScratchpadStore.clearAll()}>
                            <span className="text-red">Clear</span>
                        </OSButton>
                    </>
                ) : null}
            </div>

            <div className="flex @2xl:flex-row flex-col flex-1 min-h-0 overflow-hidden bg-primary">
                <aside className="w-full @2xl:w-56 bg-primary flex-shrink-0 @2xl:border-r border-primary @2xl:h-full @2xl:min-h-0">
                    <div className="flex flex-col h-full min-h-0">
                        <div className="px-2 py-2 flex @2xl:flex-col gap-1 overflow-x-auto @2xl:overflow-y-auto">
                            {rail.map((item) => (
                                <OSButton
                                    key={item.id}
                                    size="sm"
                                    width="full"
                                    hover="background"
                                    align="left"
                                    className={activeTab === item.id ? 'font-semibold bg-accent' : ''}
                                    onClick={() => setActiveTab(item.id)}
                                >
                                    <span className="flex-1 truncate text-left">{item.label}</span>
                                    <Chip>{item.count}</Chip>
                                </OSButton>
                            ))}
                        </div>
                    </div>
                </aside>

                <main className="flex-1 min-h-0 bg-primary overflow-hidden flex flex-col @2xl:border-none border-t border-primary">
                    <ScrollArea className="flex-1 min-h-0">
                        <div className="p-3 @2xl:p-4 space-y-4">
                            {isAddingNode ? (
                                <form
                                    onSubmit={handleAddNodeSubmit}
                                    className="p-3 rounded-sm border border-primary bg-primary space-y-2.5"
                                >
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <span className="text-sm font-semibold">New note</span>
                                        <div className="flex items-center gap-1 flex-wrap">
                                            {(Object.keys(TYPE_LABEL) as ScratchpadNodeType[]).map((type) => (
                                                <OSButton
                                                    key={type}
                                                    type="button"
                                                    size="xs"
                                                    hover="background"
                                                    className={newType === type ? 'font-semibold bg-accent' : ''}
                                                    onClick={() => setNewType(type)}
                                                >
                                                    {TYPE_LABEL[type]}
                                                </OSButton>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 @lg:grid-cols-2 gap-2">
                                        <OSInput
                                            label="Title"
                                            showLabel={false}
                                            value={newTitle}
                                            onChange={(e) => setNewTitle(e.target.value)}
                                            placeholder="Title (optional)"
                                            size="sm"
                                        />
                                        <OSInput
                                            label="Source"
                                            showLabel={false}
                                            value={newSource}
                                            onChange={(e) => setNewSource(e.target.value)}
                                            placeholder="Source or chapter"
                                            size="sm"
                                        />
                                    </div>
                                    <OSTextarea
                                        label="Note"
                                        showLabel={false}
                                        value={newContent}
                                        onChange={(e) => setNewContent(e.target.value)}
                                        placeholder="Quote, definition, or key note…"
                                        rows={3}
                                        size="sm"
                                        autoFocus
                                    />
                                    <OSInput
                                        label="Tags"
                                        showLabel={false}
                                        value={newTags}
                                        onChange={(e) => setNewTags(e.target.value)}
                                        placeholder="Tags, comma separated"
                                        size="sm"
                                    />
                                    <div className="flex justify-end gap-1">
                                        <OSButton type="button" size="sm" hover="background" onClick={resetComposer}>
                                            Cancel
                                        </OSButton>
                                        <OSButton size="sm" variant="primary" type="submit" disabled={!newContent.trim()}>
                                            Save
                                        </OSButton>
                                    </div>
                                </form>
                            ) : null}

                            {inspectedDoc ? (
                                <div className="p-3 rounded-sm border border-primary bg-primary space-y-2">
                                    <div className="flex items-center justify-between gap-2 border-b border-primary pb-2">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <IconDocument className="size-4 text-muted shrink-0" />
                                            <span className="text-sm font-semibold truncate">{inspectedDoc.name}</span>
                                            {inspectedDoc.size ? (
                                                <span className="text-xs text-muted">({inspectedDoc.size})</span>
                                            ) : null}
                                        </div>
                                        <OSButton
                                            size="xs"
                                            icon={<IconX />}
                                            hover="background"
                                            onClick={() => setInspectedDoc(null)}
                                            aria-label="Close document"
                                        />
                                    </div>
                                    <pre className="m-0 max-h-64 overflow-y-auto p-2 rounded-sm border border-primary bg-primary text-xs font-mono whitespace-pre-wrap leading-relaxed">
                                        {inspectedDoc.content}
                                    </pre>
                                </div>
                            ) : null}

                            {!hasAnyContent && !isAddingNode ? (
                                <div className="text-center py-12">
                                    <IconDocument className="size-10 mx-auto mb-2 text-muted" />
                                    <h3 className="text-base font-semibold m-0">Scratchpad is empty</h3>
                                    <p className="text-muted text-sm m-0 mt-1 max-w-sm mx-auto">
                                        Capture citations, tasks, and facts here. Ask AI can write to it, or add a note
                                        yourself.
                                    </p>
                                    <div className="mt-3">
                                        <OSButton size="sm" variant="primary" onClick={() => setIsAddingNode(true)}>
                                            New note
                                        </OSButton>
                                    </div>
                                </div>
                            ) : null}

                            {hasAnyContent && !hasVisibleItems && activeTab !== 'tasks' && !isAddingNode ? (
                                <p className="text-muted text-sm m-0">No matching items.</p>
                            ) : null}

                            {showDocs && filteredDocs.length > 0 ? (
                                <section className="space-y-2">
                                    <h4 className="m-0 text-xs font-semibold text-muted uppercase tracking-wide">
                                        Documents
                                    </h4>
                                    <div className="grid grid-cols-1 @lg:grid-cols-2 gap-2">
                                        {filteredDocs.map((doc) => (
                                            <div
                                                key={doc.id}
                                                className="p-2.5 rounded-sm border border-primary bg-primary flex items-center justify-between gap-2"
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <IconDocument className="size-4 text-muted shrink-0" />
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium truncate m-0">{doc.name}</p>
                                                        <span className="text-xs text-muted">
                                                            {doc.size ? `${doc.size} · ` : ''}Added {doc.uploadedAt}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-0.5 shrink-0">
                                                    <OSButton
                                                        size="xs"
                                                        icon={<IconEye />}
                                                        hover="background"
                                                        tooltip="View"
                                                        onClick={() => setInspectedDoc(doc)}
                                                    />
                                                    <OSButton
                                                        size="xs"
                                                        icon={<IconTrash />}
                                                        hover="background"
                                                        tooltip="Remove"
                                                        onClick={() => ScratchpadStore.deleteDocument(doc.id)}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            ) : null}

                            {showMemories && filteredMemories.length > 0 ? (
                                <section className="space-y-2">
                                    <h4 className="m-0 text-xs font-semibold text-muted uppercase tracking-wide">
                                        Memories
                                    </h4>
                                    <div className="space-y-1.5">
                                        {filteredMemories.map((memory) => (
                                            <div
                                                key={memory.id}
                                                className="p-2.5 rounded-sm border border-primary bg-primary flex items-start justify-between gap-2"
                                            >
                                                <div className="min-w-0">
                                                    {memory.category ? <Chip>{memory.category}</Chip> : null}
                                                    <p className="m-0 mt-1 text-sm leading-relaxed">{memory.fact}</p>
                                                    <span className="text-xs text-muted">{memory.timestamp}</span>
                                                </div>
                                                <OSButton
                                                    size="xs"
                                                    icon={<IconTrash />}
                                                    hover="background"
                                                    tooltip="Forget"
                                                    onClick={() => ScratchpadStore.deleteMemory(memory.id)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            ) : null}

                            {showNodes && filteredNodes.length > 0 ? (
                                <section className="space-y-2">
                                    <h4 className="m-0 text-xs font-semibold text-muted uppercase tracking-wide">
                                        Notes
                                    </h4>
                                    <div className="space-y-2">
                                        {filteredNodes.map((node) => (
                                            <article
                                                key={node.id}
                                                className="p-3 rounded-sm border border-primary bg-primary space-y-2"
                                            >
                                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <Chip>{TYPE_LABEL[node.type]}</Chip>
                                                        {node.pinned ? <Chip>Pinned</Chip> : null}
                                                        {node.title ? (
                                                            <strong className="text-sm truncate">{node.title}</strong>
                                                        ) : null}
                                                    </div>
                                                    <div className="flex items-center gap-0.5">
                                                        {node.source ? (
                                                            <span className="text-xs text-muted truncate max-w-[12rem] mr-1">
                                                                {node.source}
                                                            </span>
                                                        ) : null}
                                                        <span className="text-xs text-muted mr-1">{node.timestamp}</span>
                                                        <OSButton
                                                            size="xs"
                                                            icon={node.pinned ? <IconPinFilled /> : <IconPin />}
                                                            hover="background"
                                                            tooltip={node.pinned ? 'Unpin' : 'Pin'}
                                                            onClick={() => ScratchpadStore.toggleNodePin(node.id)}
                                                        />
                                                        <OSButton
                                                            size="xs"
                                                            icon={<IconPencil />}
                                                            hover="background"
                                                            tooltip="Edit"
                                                            onClick={() => startEdit(node)}
                                                        />
                                                        <OSButton
                                                            size="xs"
                                                            hover="background"
                                                            tooltip="Copy"
                                                            onClick={() =>
                                                                copyText(
                                                                    [node.title, node.content, node.source]
                                                                        .filter(Boolean)
                                                                        .join('\n')
                                                                )
                                                            }
                                                        >
                                                            Copy
                                                        </OSButton>
                                                        <OSButton
                                                            size="xs"
                                                            icon={<IconTrash />}
                                                            hover="background"
                                                            tooltip="Delete"
                                                            onClick={() => ScratchpadStore.deleteNode(node.id)}
                                                        />
                                                    </div>
                                                </div>

                                                {editingId === node.id ? (
                                                    <div className="space-y-2">
                                                        <input
                                                            className={fieldClass}
                                                            value={editTitle}
                                                            onChange={(e) => setEditTitle(e.target.value)}
                                                            placeholder="Title"
                                                        />
                                                        <input
                                                            className={fieldClass}
                                                            value={editSource}
                                                            onChange={(e) => setEditSource(e.target.value)}
                                                            placeholder="Source"
                                                        />
                                                        <textarea
                                                            className={`${fieldClass} min-h-[5rem] resize-y`}
                                                            value={editContent}
                                                            onChange={(e) => setEditContent(e.target.value)}
                                                            rows={4}
                                                        />
                                                        <div className="flex justify-end gap-1">
                                                            <OSButton
                                                                size="sm"
                                                                hover="background"
                                                                onClick={() => setEditingId(null)}
                                                            >
                                                                Cancel
                                                            </OSButton>
                                                            <OSButton
                                                                size="sm"
                                                                variant="primary"
                                                                onClick={saveEdit}
                                                                disabled={!editContent.trim()}
                                                            >
                                                                Save
                                                            </OSButton>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-sm leading-relaxed markdown prose dark:prose-invert prose-sm max-w-none break-words">
                                                        <ReactMarkdown
                                                            remarkPlugins={[remarkGfm]}
                                                            rehypePlugins={[rehypeSanitize]}
                                                        >
                                                            {node.content}
                                                        </ReactMarkdown>
                                                    </div>
                                                )}

                                                {node.tags && node.tags.length > 0 ? (
                                                    <div className="flex items-center gap-1 flex-wrap">
                                                        {node.tags.map((tag) => (
                                                            <Chip key={tag}>#{tag}</Chip>
                                                        ))}
                                                    </div>
                                                ) : null}
                                            </article>
                                        ))}
                                    </div>
                                </section>
                            ) : null}

                            {showTasks ? (
                                <section className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <h4 className="m-0 text-xs font-semibold text-muted uppercase tracking-wide">
                                            Tasks
                                            {storeState.tasks.length
                                                ? ` (${completedTasksCount}/${storeState.tasks.length})`
                                                : ''}
                                        </h4>
                                    </div>
                                    <form onSubmit={handleAddTask} className="flex items-center gap-1">
                                        <input
                                            className={fieldClass}
                                            value={taskDraft}
                                            onChange={(e) => setTaskDraft(e.target.value)}
                                            placeholder="Add a task…"
                                        />
                                        <OSButton
                                            size="sm"
                                            variant="primary"
                                            type="submit"
                                            disabled={!taskDraft.trim()}
                                        >
                                            Add
                                        </OSButton>
                                    </form>
                                    <div className="space-y-1">
                                        {filteredTasks.map((task) => (
                                            <div
                                                key={task.id}
                                                className={`flex items-center gap-2 p-2 rounded-sm border border-primary text-sm ${
                                                    task.status === 'completed' ? 'bg-primary text-muted' : 'bg-primary'
                                                }`}
                                            >
                                                <Checkbox
                                                    checked={task.status === 'completed'}
                                                    onCheckedChange={() => ScratchpadStore.toggleTask(task.id)}
                                                    ariaLabel={task.title}
                                                />
                                                <span
                                                    className={`flex-1 min-w-0 leading-snug break-words ${
                                                        task.status === 'completed' ? 'line-through' : ''
                                                    }`}
                                                >
                                                    {task.title}
                                                </span>
                                                {task.status === 'in_progress' ? <Chip>Doing</Chip> : null}
                                                <OSButton
                                                    size="xs"
                                                    icon={<IconTrash />}
                                                    hover="background"
                                                    tooltip="Delete task"
                                                    onClick={() => ScratchpadStore.deleteTask(task.id)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            ) : null}
                        </div>
                    </ScrollArea>
                </main>
            </div>
        </div>
    )
}
