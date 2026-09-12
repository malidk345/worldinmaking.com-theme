export function uuid(): string {
    if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
        return window.crypto.randomUUID()
    }
    return Math.random().toString(36).substring(2, 11)
}

export interface StoredNotebook {
    id: string
    short_id: string
    title: string
    content: string
    createdAt: string
    updatedAt: string
    pinned?: boolean
    isTemplate?: boolean
    version: number
    created_by?: { first_name: string; email: string }
    last_modified_by?: { first_name: string; email: string }
}

export interface NotebookVersion {
    version: number
    content: string
    timestamp: string
}

const STORAGE_KEY = 'ph_standalone_notebooks'
const HISTORY_KEY_PREFIX = 'ph_notebook_history_'

export const DEFAULT_NOTEBOOKS: StoredNotebook[] = [
    {
        id: 'introducing-wim-notebook',
        short_id: 'intro-wim',
        title: 'Introducing WIM Notebook',
        content:
            '# Introducing WIM Notebook\n\nWorldInMaking notebooks are living documents for ideas, research, and debate.\n\nType `/` to insert a block. Ask WIM AI, invite philosophers, then publish when ready.\n',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
    },
]

export function getNotebooks(): StoredNotebook[] {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_NOTEBOOKS))
        return DEFAULT_NOTEBOOKS
    }
    try {
        return JSON.parse(data)
    } catch {
        return DEFAULT_NOTEBOOKS
    }
}

export function getNotebook(id: string): StoredNotebook | undefined {
    return getNotebooks().find((n) => n.id === id || n.short_id === id)
}

export function saveNotebook(notebook: StoredNotebook): void {
    const notebooks = getNotebooks()
    const index = notebooks.findIndex((n) => n.id === notebook.id)
    
    notebook.updatedAt = new Date().toISOString()
    
    // Save version history before incrementing version
    const historyKey = `${HISTORY_KEY_PREFIX}${notebook.id}`
    const history = getNotebookHistory(notebook.id)
    history.push({
        version: notebook.version,
        content: notebook.content,
        timestamp: notebook.updatedAt
    })
    // Keep last 50 versions to avoid localstorage bloat
    if (history.length > 50) {
        history.shift()
    }
    localStorage.setItem(historyKey, JSON.stringify(history))
    
    notebook.version += 1
    
    if (index >= 0) {
        notebooks[index] = notebook
    } else {
        notebooks.push(notebook)
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notebooks))
}

const DESKTOP_PINNED_APPS_KEY = 'wim_os_desktop_pinned_items'

export function unpinNotebookFromDesktop(id: string): void {
    if (typeof window === 'undefined' || !id) return
    try {
        const raw = localStorage.getItem(DESKTOP_PINNED_APPS_KEY)
        if (!raw) return
        const existing = JSON.parse(raw)
        if (!Array.isArray(existing)) return
        const filtered = existing.filter(
            (item: any) =>
                item &&
                item.id !== id &&
                item.notebookId !== id &&
                item.url !== `/notebooks?id=${id}` &&
                item.url !== `/notebooks/${id}` &&
                !String(item.url || '').endsWith(`=${id}`) &&
                !String(item.url || '').endsWith(`/notebooks/${id}`)
        )
        if (filtered.length !== existing.length) {
            localStorage.setItem(DESKTOP_PINNED_APPS_KEY, JSON.stringify(filtered))
            window.dispatchEvent(new Event('wimDesktopPinnedChanged'))
        }
    } catch {
        /* ignore */
    }
}

export function deleteNotebook(id: string): void {
    const notebooks = getNotebooks().filter((n) => n.id !== id && n.short_id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notebooks))
    localStorage.removeItem(`${HISTORY_KEY_PREFIX}${id}`)
    unpinNotebookFromDesktop(id)
}

export function createNotebook(title?: string, content?: string): StoredNotebook {
    const id = uuid()
    const now = new Date().toISOString()
    const notebook: StoredNotebook = {
        id,
        short_id: id.substring(0, 8),
        title: title || 'Untitled Notebook',
        content: content || '',
        createdAt: now,
        updatedAt: now,
        version: 1,
    }
    
    const notebooks = getNotebooks()
    notebooks.push(notebook)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notebooks))
    
    return notebook
}

export function duplicateNotebook(id: string): StoredNotebook | undefined {
    const source = getNotebook(id)
    if (!source) return undefined
    
    return createNotebook(`${source.title} (Copy)`, source.content)
}

export function getNotebookHistory(id: string): NotebookVersion[] {
    const data = localStorage.getItem(`${HISTORY_KEY_PREFIX}${id}`)
    if (!data) return []
    try {
        return JSON.parse(data)
    } catch {
        return []
    }
}

export function restoreNotebookVersion(id: string, version: number): StoredNotebook | undefined {
    const notebook = getNotebook(id)
    if (!notebook) return undefined
    
    const history = getNotebookHistory(id)
    const targetVersion = history.find(h => h.version === version)
    
    if (!targetVersion) return undefined
    
    notebook.content = targetVersion.content
    saveNotebook(notebook)
    
    return notebook
}

export function importNotebookFromJSON(jsonStr: string): StoredNotebook {
    const parsed = JSON.parse(jsonStr)
    const notebook = createNotebook(parsed.title, parsed.content)
    if (parsed.pinned !== undefined) notebook.pinned = parsed.pinned
    saveNotebook(notebook)
    return notebook
}

export function exportNotebookAsJSON(id: string): string {
    const notebook = getNotebook(id)
    if (!notebook) throw new Error('Notebook not found')
    return JSON.stringify(notebook, null, 2)
}

export function exportNotebookAsMarkdown(id: string): string {
    const notebook = getNotebook(id)
    if (!notebook) throw new Error('Notebook not found')
    return notebook.content
}
