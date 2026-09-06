import { DEVICE_NOTEBOOK_OWNER_KEY, getActiveOwnerKey, namespacedStorageKey } from './wim-identity'
import type { NotebookVersion, StoredNotebook } from '../notebook-app/scenes/notebooks/notebookStorage'

export type TrashItem = {
    id: string
    kind: 'notebook'
    title: string
    deletedAt: string
    notebook: StoredNotebook
    history: NotebookVersion[]
}

type TrashState = {
    items: TrashItem[]
}

const STORAGE_BASE = 'wim_os_trash_v1'
const MAX_ITEMS = 80

function storageKey(): string {
    return namespacedStorageKey(STORAGE_BASE, getActiveOwnerKey(DEVICE_NOTEBOOK_OWNER_KEY))
}

function emptyState(): TrashState {
    return { items: [] }
}

function readState(): TrashState {
    if (typeof window === 'undefined') return emptyState()
    try {
        const raw = window.localStorage.getItem(storageKey())
        if (!raw) return emptyState()
        const parsed = JSON.parse(raw) as TrashState
        if (!parsed || !Array.isArray(parsed.items)) return emptyState()
        return {
            items: parsed.items.filter(
                (item) => item && item.kind === 'notebook' && item.notebook && typeof item.notebook.id === 'string'
            ),
        }
    } catch {
        return emptyState()
    }
}

function writeState(state: TrashState): void {
    if (typeof window === 'undefined') return
    try {
        window.localStorage.setItem(storageKey(), JSON.stringify({ items: state.items.slice(0, MAX_ITEMS) }))
    } catch {
        /* quota */
    }
    listeners.forEach((listener) => listener(state))
}

type Listener = (state: TrashState) => void
const listeners = new Set<Listener>()

export const TrashStore = {
    getState(): TrashState {
        return readState()
    },

    subscribe(listener: Listener): () => void {
        listeners.add(listener)
        return () => listeners.delete(listener)
    },

    addNotebook(notebook: StoredNotebook, history: NotebookVersion[] = []): TrashItem {
        const state = readState()
        const item: TrashItem = {
            id: notebook.id,
            kind: 'notebook',
            title: notebook.title || 'Untitled',
            deletedAt: new Date().toISOString(),
            notebook: { ...notebook },
            history: Array.isArray(history) ? history : [],
        }
        state.items = [item, ...state.items.filter((entry) => entry.id !== notebook.id)].slice(0, MAX_ITEMS)
        writeState(state)
        return item
    },

    getItem(id: string): TrashItem | undefined {
        return readState().items.find((item) => item.id === id)
    },

    remove(id: string): void {
        const state = readState()
        state.items = state.items.filter((item) => item.id !== id)
        writeState(state)
    },

    empty(): void {
        writeState(emptyState())
    },
}
