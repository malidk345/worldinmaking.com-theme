import { ScratchpadStore } from './scratchpad-store'
import { createNotebook, getNotebook, getNotebooks, saveNotebook } from '../notebook-app/scenes/notebooks/notebookStorage'

export const ASSISTANT_OPEN_PATH_EVENT = 'wim-os-open-path'

export type AssistantActionType =
    | 'open_window'
    | 'insert_notebook_block'
    | 'create_notebook'
    | 'scratchpad_note'
    | 'scratchpad_task'
    | 'scratchpad_memory'

export type AssistantAction = {
    type: AssistantActionType
    path?: string
    notebookId?: string
    title?: string
    content?: string
}

const ACTION_TYPES = new Set<AssistantActionType>([
    'open_window',
    'insert_notebook_block',
    'create_notebook',
    'scratchpad_note',
    'scratchpad_task',
    'scratchpad_memory',
])

export function parseAssistantAction(raw: unknown): AssistantAction | undefined {
    if (!raw || typeof raw !== 'object') return undefined
    const row = raw as Record<string, unknown>
    if (typeof row.type !== 'string' || !ACTION_TYPES.has(row.type as AssistantActionType)) return undefined
    const action: AssistantAction = { type: row.type as AssistantActionType }
    if (typeof row.path === 'string') action.path = row.path.slice(0, 200)
    if (typeof row.notebookId === 'string') action.notebookId = row.notebookId.slice(0, 80)
    if (typeof row.title === 'string') action.title = row.title.slice(0, 160)
    if (typeof row.content === 'string') action.content = row.content.slice(0, 1200)
    return action
}

function openPath(path: string): void {
    if (typeof window === 'undefined' || !path) return
    window.dispatchEvent(new CustomEvent(ASSISTANT_OPEN_PATH_EVENT, { detail: { path } }))
}

function resolveNotebook(id?: string) {
    if (id) {
        const found = getNotebook(id)
        if (found) return found
    }
    return getNotebooks().filter((nb) => !nb.isTemplate)[0] || getNotebooks()[0]
}

export function applyAssistantAction(action: AssistantAction, source: 'nag' | 'answer' = 'nag'): string | null {
    try {
        if (action.type === 'open_window') {
            if (source === 'nag') return null
            const path = action.path || '/assistant'
            openPath(path)
            return `Opened ${path}`
        }
        if (action.type === 'create_notebook') {
            const notebook = createNotebook(action.title || 'From your assistant', action.content || '')
            openPath(`/notebooks/${notebook.id}`)
            return `Opened a notebook: ${notebook.title}`
        }
        if (action.type === 'insert_notebook_block') {
            const notebook = resolveNotebook(action.notebookId)
            if (!notebook) return null
            const block = (action.content || action.title || '').trim()
            if (!block) return null
            const stamp = `> ${block.replace(/\n/g, '\n> ')}`
            saveNotebook({ ...notebook, content: `${notebook.content || ''}\n\n${stamp}\n` })
            openPath(`/notebooks/${notebook.id}`)
            return `Wrote into “${notebook.title}”`
        }
        if (action.type === 'scratchpad_note') {
            const content = (action.content || action.title || '').trim()
            if (!content) return null
            ScratchpadStore.addNode({
                content,
                title: action.title,
                type: 'note',
                source: 'assistant',
            })
            return 'Pinned a note on the scratchpad'
        }
        if (action.type === 'scratchpad_task') {
            const title = (action.title || action.content || '').trim()
            if (!title) return null
            ScratchpadStore.addTask(title)
            return `Pinned a task: ${title}`
        }
        if (action.type === 'scratchpad_memory') {
            const fact = (action.content || action.title || '').trim()
            if (!fact) return null
            ScratchpadStore.addMemory({ fact, category: 'assistant' })
            return 'Remembered it on the scratchpad'
        }
    } catch {
        return null
    }
    return null
}
