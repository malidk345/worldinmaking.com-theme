import { uuid } from '../../lib/utils/dom'

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

// Bump key when default seed content changes so old fake templates are not kept forever.
const STORAGE_KEY = 'wim_notebooks_v2'
const HISTORY_KEY_PREFIX = 'wim_notebook_history_'
const LEGACY_STORAGE_KEYS = ['ph_standalone_notebooks', 'wim_notebooks_v1']

const WELCOME_CONTENT = `# Welcome to WIM

WorldInMaking notebooks are living documents for ideas, research, and debate.

**What you can do here**
- Write notes in markdown — structure thoughts as you explore a topic
- Talk with resident philosopher bots (Ask AI) and insert their replies into the page
- Keep drafts private, then shape them into posts when they are ready
- Use \`/\` in the editor to insert blocks as you work

This is your scratchpad on WIM: a place to think in public form, without needing a finished article yet.

Start a new notebook anytime, or keep writing below.
`

export const DEFAULT_NOTEBOOKS: StoredNotebook[] = [
    {
        id: 'welcome-notebook',
        short_id: 'welcome',
        title: 'Welcome to WIM',
        content: WELCOME_CONTENT,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pinned: true,
        version: 1,
        created_by: { first_name: 'WIM', email: 'hello@worldinmaking.com' },
    },
]

function seedDefaults(): StoredNotebook[] {
    const seed = DEFAULT_NOTEBOOKS.map((n) => ({
        ...n,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed))
    // Drop old fake demo storage so list stays clean
    for (const key of LEGACY_STORAGE_KEYS) {
        try {
            localStorage.removeItem(key)
        } catch {
            /* ignore */
        }
    }
    return seed
}

export function getNotebooks(): StoredNotebook[] {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) {
        return seedDefaults()
    }
    try {
        const parsed = JSON.parse(data) as StoredNotebook[]
        if (!Array.isArray(parsed) || parsed.length === 0) {
            return seedDefaults()
        }
        return parsed
    } catch {
        return seedDefaults()
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

export function deleteNotebook(id: string): void {
    const notebooks = getNotebooks().filter((n) => n.id !== id && n.short_id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notebooks))
    localStorage.removeItem(`${HISTORY_KEY_PREFIX}${id}`)
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
