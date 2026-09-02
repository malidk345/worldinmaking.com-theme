/**
 * WorldInMaking OS Working Memory & Knowledge Scratchpad Store.
 *
 * Provides a cognitive graph / working memory canvas of:
 * 1. Active Documents (PDFs, Book Chapters, Uploaded Files)
 * 2. Knowledge Nodes (Citations/Atıflar, Concepts/Kavramlar, Quotes, Excerpts, Syntheses)
 * 3. Execution Tasks & Plans
 *
 * Synchronized live across Ask AI, the OS Desktop Window (/scratchpad),
 * and Notebook pipelines.
 */

export type ScratchpadNodeType = 'citation' | 'concept' | 'source' | 'synthesis' | 'note'

export interface ScratchpadNode {
    id: string
    type: ScratchpadNodeType
    title?: string
    content: string
    source?: string // Book chapter, author, PDF page, or URL
    tags?: string[]
    timestamp: string
}

export interface ScratchpadDocument {
    id: string
    name: string
    content: string
    type?: string
    size?: number | string
    pageCount?: number
    preview?: string
    uploadedAt: string
}

export interface ScratchpadTask {
    id: string
    title: string
    status: 'pending' | 'in_progress' | 'completed'
    timestamp?: string
}

export interface ScratchpadMemory {
    id: string
    fact: string
    category?: string
    timestamp: string
}

export interface ScratchpadState {
    documents: ScratchpadDocument[]
    nodes: ScratchpadNode[]
    tasks: ScratchpadTask[]
    memories: ScratchpadMemory[]
    lastUpdated: number
}

const STORAGE_KEY = 'wim_os_scratchpad_v3'

let state: ScratchpadState = {
    documents: [],
    nodes: [],
    tasks: [],
    memories: [],
    lastUpdated: Date.now(),
}

// Load persisted state safely in browser
if (typeof window !== 'undefined') {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (raw) {
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed.nodes) || Array.isArray(parsed.tasks) || Array.isArray(parsed.documents) || Array.isArray(parsed.memories)) {
                state = {
                    documents: Array.isArray(parsed.documents) ? parsed.documents : [],
                    nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
                    tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
                    memories: Array.isArray(parsed.memories) ? parsed.memories : [],
                    lastUpdated: parsed.lastUpdated || Date.now(),
                }
            }
        }
    } catch {
        /* fallback to memory state */
    }
}

type Listener = (state: ScratchpadState) => void
const listeners = new Set<Listener>()

function emit() {
    state.lastUpdated = Date.now()
    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
        } catch {
            /* ignore quota err */
        }
    }
    listeners.forEach((l) => l(state))
}

export const ScratchpadStore = {
    getState(): ScratchpadState {
        return state
    },

    subscribe(listener: Listener): () => void {
        listeners.add(listener)
        return () => listeners.delete(listener)
    },

    addDocument(doc: {
        name: string
        content: string
        type?: string
        size?: number | string
        pageCount?: number
        preview?: string
    }): ScratchpadDocument {
        const existingIdx = state.documents.findIndex((d) => d.name === doc.name)
        const document: ScratchpadDocument = {
            id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: doc.name,
            content: doc.content,
            type: doc.type || 'document',
            size: doc.size,
            pageCount: doc.pageCount,
            preview: doc.preview,
            uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }

        if (existingIdx >= 0) {
            state.documents[existingIdx] = document
        } else {
            state.documents = [document, ...state.documents]
        }
        emit()
        return document
    },

    deleteDocument(docId: string): void {
        state.documents = state.documents.filter((d) => d.id !== docId)
        emit()
    },

    clearDocuments(): void {
        state.documents = []
        emit()
    },

    addNode(node: {
        content: string
        type?: ScratchpadNodeType
        title?: string
        source?: string
        tags?: string[]
    }): ScratchpadNode {
        const newNode: ScratchpadNode = {
            id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            type: node.type || (node.source ? 'citation' : 'concept'),
            title: node.title?.trim() || undefined,
            content: node.content.trim(),
            source: node.source?.trim() || undefined,
            tags: node.tags || [],
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }

        // Deduplicate identical content and source
        const exists = state.nodes.some(
            (n) => n.content === newNode.content && n.source === newNode.source && n.title === newNode.title
        )
        if (!exists) {
            state.nodes = [newNode, ...state.nodes]
            emit()
        }
        return newNode
    },

    // Backward compatible alias
    addNote(content: string, source?: string, tags?: string[]): ScratchpadNode {
        return this.addNode({ content, source, tags, type: source ? 'citation' : 'concept' })
    },

    deleteNode(nodeId: string): void {
        state.nodes = state.nodes.filter((n) => n.id !== nodeId)
        emit()
    },

    clearNodes(): void {
        state.nodes = []
        emit()
    },

    setTasks(tasks: ScratchpadTask[]): void {
        state.tasks = tasks.map((t, idx) => ({
            id: String(t.id || idx + 1),
            title: String(t.title || 'Untitled task'),
            status: t.status === 'completed' || t.status === 'in_progress' ? t.status : 'pending',
            timestamp: t.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }))
        emit()
    },

    toggleTask(taskId: string): void {
        state.tasks = state.tasks.map((t) => {
            if (t.id !== taskId) return t
            const nextStatus = t.status === 'completed' ? 'pending' : 'completed'
            return { ...t, status: nextStatus }
        })
        emit()
    },

    clearTasks(): void {
        state.tasks = []
        emit()
    },

    addMemory(input: { fact: string; category?: string }): ScratchpadMemory {
        const memory: ScratchpadMemory = {
            id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            fact: input.fact.trim(),
            category: input.category?.trim() || undefined,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
        const exists = state.memories.some((item) => item.fact === memory.fact)
        if (!exists && memory.fact) {
            state.memories = [memory, ...state.memories].slice(0, 48)
            emit()
        }
        return memory
    },

    clearAll(): void {
        state.documents = []
        state.nodes = []
        state.tasks = []
        state.memories = []
        emit()
    },

    asMarkdown(): string {
        const parts: string[] = []
        if (state.documents.length > 0) {
            parts.push('## Active Documents & PDF Sources\n')
            state.documents.forEach((d) => {
                parts.push(`- **${d.name}** (${d.type || 'file'}${d.size ? `, ${d.size}` : ''})`)
            })
            parts.push('')
        }
        if (state.tasks.length > 0) {
            parts.push('## Execution Plan & Tasks\n')
            state.tasks.forEach((t) => {
                const mark = t.status === 'completed' ? '[x]' : t.status === 'in_progress' ? '[-]' : '[ ]'
                parts.push(`- ${mark} ${t.title}`)
            })
            parts.push('')
        }
        if (state.memories.length > 0) {
            parts.push('## Remembered facts\n')
            state.memories.forEach((memory) => {
                parts.push(`- ${memory.category ? `[${memory.category}] ` : ''}${memory.fact}`)
            })
            parts.push('')
        }
        if (state.nodes.length > 0) {
            parts.push('## Knowledge Nodes & Citations\n')
            state.nodes.forEach((n, idx) => {
                const typeLabel =
                    n.type === 'citation'
                        ? 'Atıf / Citation'
                        : n.type === 'concept'
                        ? 'Kavram / Concept'
                        : n.type === 'source'
                        ? 'Kaynak / Source'
                        : 'Not / Synthesis'
                parts.push(`### [${typeLabel}] ${n.title || `Node ${idx + 1}`}${n.source ? ` — ${n.source}` : ''}`)
                parts.push(n.content)
                parts.push('')
            })
        }
        return parts.join('\n').trim()
    },

    /** Compact context summary formatted for AI prompt grounding. */
    getPromptGroundingContext(): string {
        const sections: string[] = []
        if (state.documents.length > 0) {
            sections.push(`Active Documents in Scratchpad (${state.documents.length}):\n` +
                state.documents.map((d) => `- ${d.name} (${d.type || 'file'}): ${d.content.slice(0, 500)}...`).join('\n')
            )
        }
        if (state.nodes.length > 0) {
            sections.push(`Active Knowledge Nodes & Citations (${state.nodes.length}):\n` +
                state.nodes.slice(0, 10).map((n) => `[${n.type.toUpperCase()}] ${n.title ? `${n.title}: ` : ''}"${n.content}"${n.source ? ` (Source: ${n.source})` : ''}`).join('\n')
            )
        }
        if (state.memories.length > 0) {
            sections.push(
                `Remembered facts (${state.memories.length}):\n` +
                    state.memories
                        .slice(0, 12)
                        .map((memory) => `- ${memory.category ? `[${memory.category}] ` : ''}${memory.fact}`)
                        .join('\n')
            )
        }
        return sections.join('\n\n')
    },
}
