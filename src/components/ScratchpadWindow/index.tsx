import React, { useEffect, useState, useMemo } from 'react'
import {
    ScratchpadStore,
    ScratchpadDocument,
    ScratchpadNode,
    ScratchpadNodeType,
    ScratchpadTask,
    ScratchpadState,
} from '../../lib/scratchpad-store'
import OSInput from 'components/OSForm/input'
import OSButton from 'components/OSButton'
import ScrollArea from 'components/RadixUI/ScrollArea'
import SEO from 'components/seo'
import {
    IconDocument,
    IconTrash,
    IconCopy,
    IconCheck,
    IconPlus,
    IconClock,
    IconSearch,
    IconX,
    IconEye,
    IconExternal,
} from '@posthog/icons'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'

export function ScratchpadWindow() {
    const [storeState, setStoreState] = useState<ScratchpadState>(() => ScratchpadStore.getState())
    const [activeTab, setActiveTab] = useState<'all' | 'citations' | 'concepts' | 'documents' | 'tasks'>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [copied, setCopied] = useState(false)
    const [isAddingNode, setIsAddingNode] = useState(false)
    const [newTitle, setNewTitle] = useState('')
    const [newContent, setNewContent] = useState('')
    const [newSource, setNewSource] = useState('')
    const [newType, setNewType] = useState<ScratchpadNodeType>('citation')
    const [inspectedDoc, setInspectedDoc] = useState<ScratchpadDocument | null>(null)

    useEffect(() => {
        const unsubscribe = ScratchpadStore.subscribe((next) => {
            setStoreState({ ...next })
        })
        return unsubscribe
    }, [])

    const filteredDocs = useMemo(() => {
        if (!searchQuery.trim()) return storeState.documents
        const q = searchQuery.toLowerCase()
        return storeState.documents.filter(
            (d) => d.name.toLowerCase().includes(q) || d.content.toLowerCase().includes(q)
        )
    }, [storeState.documents, searchQuery])

    const filteredNodes = useMemo(() => {
        let list = storeState.nodes
        if (activeTab === 'citations') list = list.filter((n) => n.type === 'citation')
        else if (activeTab === 'concepts') list = list.filter((n) => n.type === 'concept')

        if (!searchQuery.trim()) return list
        const q = searchQuery.toLowerCase()
        return list.filter(
            (n) =>
                n.content.toLowerCase().includes(q) ||
                n.source?.toLowerCase().includes(q) ||
                n.title?.toLowerCase().includes(q) ||
                n.tags?.some((t) => t.toLowerCase().includes(q))
        )
    }, [storeState.nodes, activeTab, searchQuery])

    const filteredTasks = useMemo(() => {
        if (!searchQuery.trim()) return storeState.tasks
        const q = searchQuery.toLowerCase()
        return storeState.tasks.filter((t) => t.title.toLowerCase().includes(q))
    }, [storeState.tasks, searchQuery])

    const totalNodesCount = storeState.nodes.length
    const totalDocsCount = storeState.documents.length
    const totalTasksCount = storeState.tasks.length
    const completedTasksCount = storeState.tasks.filter((t) => t.status === 'completed').length

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

    const handleAddNodeSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!newContent.trim()) return
        ScratchpadStore.addNode({
            content: newContent,
            title: newTitle.trim() || undefined,
            source: newSource.trim() || undefined,
            type: newType,
        })
        setNewContent('')
        setNewTitle('')
        setNewSource('')
        setIsAddingNode(false)
    }

    const hasAnyContent = totalNodesCount > 0 || totalDocsCount > 0 || totalTasksCount > 0

    return (
        <div
            data-scheme="primary"
            className="@container bg-transparent text-primary h-full flex flex-col min-h-0 select-none font-sans"
        >
            <SEO title="scratchpad" description="Working memory and knowledge context on worldinmaking." />

            {/* Top Toolbar (Archive-style minimal row) */}
            <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2 flex-shrink-0 flex-wrap border-b border-primary/10">
                {/* Search Bar */}
                <div className="flex-1 min-w-[140px] max-w-xs">
                    <OSInput
                        label="Search scratchpad"
                        showLabel={false}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search notes, citations, docs..."
                        size="sm"
                    />
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1 text-xs">
                    <button
                        type="button"
                        onClick={() => setActiveTab('all')}
                        className={`px-2 py-1 rounded transition-colors ${
                            activeTab === 'all'
                                ? 'bg-primary text-background font-medium'
                                : 'text-muted hover:text-primary'
                        }`}
                    >
                        All ({totalNodesCount + totalDocsCount})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('citations')}
                        className={`px-2 py-1 rounded transition-colors ${
                            activeTab === 'citations'
                                ? 'bg-primary text-background font-medium'
                                : 'text-muted hover:text-primary'
                        }`}
                    >
                        Citations ({storeState.nodes.filter((n) => n.type === 'citation').length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('concepts')}
                        className={`px-2 py-1 rounded transition-colors ${
                            activeTab === 'concepts'
                                ? 'bg-primary text-background font-medium'
                                : 'text-muted hover:text-primary'
                        }`}
                    >
                        Concepts ({storeState.nodes.filter((n) => n.type === 'concept').length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('documents')}
                        className={`px-2 py-1 rounded transition-colors ${
                            activeTab === 'documents'
                                ? 'bg-primary text-background font-medium'
                                : 'text-muted hover:text-primary'
                        }`}
                    >
                        Docs ({totalDocsCount})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('tasks')}
                        className={`px-2 py-1 rounded transition-colors ${
                            activeTab === 'tasks'
                                ? 'bg-primary text-background font-medium'
                                : 'text-muted hover:text-primary'
                        }`}
                    >
                        Tasks ({totalTasksCount})
                    </button>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                    <OSButton
                        size="sm"
                        variant="underlineOnHover"
                        onClick={() => setIsAddingNode(!isAddingNode)}
                    >
                        {isAddingNode ? 'Cancel' : '+ New note'}
                    </OSButton>

                    {hasAnyContent && (
                        <>
                            <OSButton
                                size="sm"
                                variant="underlineOnHover"
                                onClick={handleCopyAll}
                            >
                                {copied ? 'Copied' : 'Copy all'}
                            </OSButton>

                            <OSButton
                                size="sm"
                                variant="underlineOnHover"
                                onClick={() => ScratchpadStore.clearAll()}
                            >
                                Clear all
                            </OSButton>
                        </>
                    )}
                </div>
            </div>

            {/* Scrollable Content Area */}
            <ScrollArea className="flex-1 min-h-0">
                <div className="p-4 space-y-3">
                    {/* Add Node Inline Form */}
                    {isAddingNode && (
                        <form
                            onSubmit={handleAddNodeSubmit}
                            className="p-3.5 rounded-lg border border-primary/15 bg-accent/20 space-y-2.5 mb-3"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold">New Knowledge Entry</span>
                                <div className="flex items-center gap-1 text-[11px]">
                                    <button
                                        type="button"
                                        onClick={() => setNewType('citation')}
                                        className={`px-2 py-0.5 rounded border transition-colors ${
                                            newType === 'citation'
                                                ? 'bg-primary text-background border-primary'
                                                : 'border-primary/15 text-muted hover:text-primary'
                                        }`}
                                    >
                                        Citation
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewType('concept')}
                                        className={`px-2 py-0.5 rounded border transition-colors ${
                                            newType === 'concept'
                                                ? 'bg-primary text-background border-primary'
                                                : 'border-primary/15 text-muted hover:text-primary'
                                        }`}
                                    >
                                        Concept
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewType('source')}
                                        className={`px-2 py-0.5 rounded border transition-colors ${
                                            newType === 'source'
                                                ? 'bg-primary text-background border-primary'
                                                : 'border-primary/15 text-muted hover:text-primary'
                                        }`}
                                    >
                                        Chapter
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <input
                                    type="text"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    placeholder="Title or headline (optional)"
                                    className="w-full px-2.5 py-1 text-xs bg-background border border-primary/15 rounded text-primary focus:outline-hidden"
                                />
                                <input
                                    type="text"
                                    value={newSource}
                                    onChange={(e) => setNewSource(e.target.value)}
                                    placeholder="Source or chapter (e.g. Book 1, p. 12)"
                                    className="w-full px-2.5 py-1 text-xs bg-background border border-primary/15 rounded text-primary focus:outline-hidden"
                                />
                            </div>

                            <textarea
                                value={newContent}
                                onChange={(e) => setNewContent(e.target.value)}
                                placeholder="Quote, definition, or key note..."
                                rows={3}
                                className="w-full p-2 text-xs bg-background border border-primary/15 rounded text-primary focus:outline-hidden placeholder:text-muted"
                                autoFocus
                            />

                            <div className="flex justify-end gap-2">
                                <OSButton size="sm" variant="underlineOnHover" onClick={() => setIsAddingNode(false)}>
                                    Cancel
                                </OSButton>
                                <OSButton size="sm" variant="primary" type="submit">
                                    Save Note
                                </OSButton>
                            </div>
                        </form>
                    )}

                    {/* Document Inspector Modal */}
                    {inspectedDoc && (
                        <div className="p-3.5 rounded-lg border border-primary/20 bg-background space-y-2 mb-3 shadow-xs">
                            <div className="flex items-center justify-between border-b border-primary/10 pb-1.5">
                                <div className="flex items-center gap-1.5 text-xs font-medium">
                                    <IconDocument className="size-4 text-muted" />
                                    <span>{inspectedDoc.name}</span>
                                    {inspectedDoc.size && (
                                        <span className="text-muted text-[11px]">({inspectedDoc.size})</span>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setInspectedDoc(null)}
                                    className="p-1 rounded text-muted hover:text-primary"
                                >
                                    <IconX className="size-3.5" />
                                </button>
                            </div>
                            <div className="max-h-60 overflow-y-auto p-2 bg-accent/20 rounded border border-primary/10 text-xs font-mono whitespace-pre-wrap leading-relaxed">
                                {inspectedDoc.content}
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {!hasAnyContent && (
                        <div className="text-center py-12">
                            <IconDocument className="size-12 mx-auto mb-2 text-muted opacity-60" />
                            <h3 className="text-base font-semibold m-0">
                                {searchQuery ? 'No matching items' : 'Scratchpad is empty'}
                            </h3>
                            <p className="text-muted text-xs m-0 mt-1 max-w-sm mx-auto">
                                {searchQuery
                                    ? 'No notes or documents match that search.'
                                    : 'Upload a PDF, ask Ask AI to research, or create notes to store citations and concepts.'}
                            </p>
                        </div>
                    )}

                    {/* Active Documents List */}
                    {(activeTab === 'all' || activeTab === 'documents') && filteredDocs.length > 0 && (
                        <div className="space-y-1.5">
                            <div className="text-[11px] font-semibold text-muted uppercase tracking-wider px-1">
                                Context Documents ({filteredDocs.length})
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {filteredDocs.map((doc) => (
                                    <div
                                        key={doc.id}
                                        className="p-2.5 rounded-lg border border-primary/10 bg-accent/15 flex items-center justify-between gap-2 hover:border-primary/25 transition-colors"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <IconDocument className="size-4 text-muted flex-shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-xs font-medium truncate m-0">{doc.name}</p>
                                                <span className="text-[10px] text-muted">
                                                    {doc.size ? `${doc.size} • ` : ''}Added {doc.uploadedAt}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => setInspectedDoc(doc)}
                                                className="p-1 rounded text-muted hover:text-primary hover:bg-accent/40"
                                                title="View document content"
                                            >
                                                <IconEye className="size-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => ScratchpadStore.deleteDocument(doc.id)}
                                                className="p-1 rounded text-muted hover:text-red-500 hover:bg-accent/40"
                                                title="Remove document"
                                            >
                                                <IconTrash className="size-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Knowledge Nodes List */}
                    {(activeTab === 'all' || activeTab === 'citations' || activeTab === 'concepts') &&
                        filteredNodes.length > 0 && (
                            <div className="space-y-2 mt-3">
                                <div className="text-[11px] font-semibold text-muted uppercase tracking-wider px-1">
                                    Knowledge Nodes & Notes ({filteredNodes.length})
                                </div>

                                <div className="space-y-2">
                                    {filteredNodes.map((node) => (
                                        <div
                                            key={node.id}
                                            className="p-3 rounded-lg border border-primary/10 bg-accent/10 hover:border-primary/25 transition-colors space-y-1.5"
                                        >
                                            <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/10">
                                                        {node.type}
                                                    </span>
                                                    {node.title && (
                                                        <strong className="font-semibold text-xs truncate">
                                                            {node.title}
                                                        </strong>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-1.5 text-muted text-[11px]">
                                                    {node.source && (
                                                        <span className="bg-background/80 px-1.5 py-0.5 rounded border border-primary/10 truncate max-w-[220px]">
                                                            {node.source}
                                                        </span>
                                                    )}
                                                    <span className="text-[10px]">{node.timestamp}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => ScratchpadStore.deleteNode(node.id)}
                                                        className="p-0.5 text-muted hover:text-red-500"
                                                        title="Delete note"
                                                    >
                                                        <IconTrash className="size-3" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="text-xs leading-relaxed text-primary markdown prose dark:prose-invert prose-xs max-w-none break-words">
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm]}
                                                    rehypePlugins={[rehypeSanitize]}
                                                >
                                                    {node.content}
                                                </ReactMarkdown>
                                            </div>

                                            {node.tags && node.tags.length > 0 && (
                                                <div className="flex items-center gap-1 flex-wrap pt-0.5">
                                                    {node.tags.map((tag) => (
                                                        <span
                                                            key={tag}
                                                            className="text-[10px] text-muted px-1.5 py-0.2 rounded bg-primary/5 border border-primary/10"
                                                        >
                                                            #{tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                    {/* Task Checklist */}
                    {(activeTab === 'all' || activeTab === 'tasks') && filteredTasks.length > 0 && (
                        <div className="space-y-2 mt-3">
                            <div className="flex items-center justify-between px-1 text-[11px] font-semibold text-muted uppercase tracking-wider">
                                <span>Execution Plan ({completedTasksCount}/{totalTasksCount})</span>
                            </div>

                            <div className="space-y-1">
                                {filteredTasks.map((task) => (
                                    <div
                                        key={task.id}
                                        onClick={() => ScratchpadStore.toggleTask(task.id)}
                                        className={`flex items-start gap-2 p-2 rounded-md border text-xs cursor-pointer transition-colors ${
                                            task.status === 'completed'
                                                ? 'bg-accent/10 border-primary/10 opacity-70 line-through text-muted'
                                                : task.status === 'in_progress'
                                                ? 'bg-primary/5 border-primary/25 font-medium'
                                                : 'bg-background border-primary/10 hover:border-primary/20'
                                        }`}
                                    >
                                        <div className="mt-0.5 flex-shrink-0">
                                            {task.status === 'completed' ? (
                                                <IconCheck className="size-3.5 text-emerald-600" />
                                            ) : task.status === 'in_progress' ? (
                                                <IconClock className="size-3.5 text-blue-600 animate-spin" />
                                            ) : (
                                                <div className="size-3.5 rounded-full border border-primary/30" />
                                            )}
                                        </div>
                                        <span className="flex-1 min-w-0 leading-snug break-words">
                                            {task.title}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}
