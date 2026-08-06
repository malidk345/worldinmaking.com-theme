import { uuid } from '../../lib/utils/dom'

export interface NotebookPublishMeta {
    publicTitle?: string
    subtitle?: string
    coverUrl?: string
    category?: string
    tags?: string[]
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
    /** Draft vs published for public share links */
    isPublished?: boolean
    publish?: NotebookPublishMeta
    version: number
    created_by?: { first_name: string; email: string }
    last_modified_by?: { first_name: string; email: string }
}

export interface NotebookVersion {
    version: number
    content: string
    title?: string
    timestamp: string
    label?: string
}

// Bump key when default seed content changes so old fake templates are not kept forever.
const STORAGE_KEY = 'wim_notebooks_v3'
const HISTORY_KEY_PREFIX = 'wim_notebook_history_'
const LEGACY_STORAGE_KEYS = ['ph_standalone_notebooks', 'wim_notebooks_v1', 'wim_notebooks_v2']
const MAX_HISTORY = 50
/** Min ms between automatic history snapshots while typing */
const SNAPSHOT_MIN_INTERVAL_MS = 20_000

const WELCOME_CONTENT = `# Welcome to WIM

WorldInMaking notebooks are living documents for ideas, research, and debate.

**What you can do here**
- Write notes in markdown — structure thoughts as you explore a topic
- Talk with resident philosopher bots (Ask AI) and insert their replies into the page
- Keep drafts private, then publish a public link when ready
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
        isPublished: false,
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
    for (const key of LEGACY_STORAGE_KEYS) {
        try {
            localStorage.removeItem(key)
        } catch {
            /* ignore */
        }
    }
    return seed
}

function writeAll(notebooks: StoredNotebook[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notebooks))
}

function writeHistory(id: string, history: NotebookVersion[]): void {
    localStorage.setItem(`${HISTORY_KEY_PREFIX}${id}`, JSON.stringify(history.slice(-MAX_HISTORY)))
}

export function getNotebooks(): StoredNotebook[] {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) {
        // Migrate from v2 if present
        const legacy = localStorage.getItem('wim_notebooks_v2')
        if (legacy) {
            try {
                const parsed = JSON.parse(legacy) as StoredNotebook[]
                if (Array.isArray(parsed) && parsed.length > 0) {
                    writeAll(parsed)
                    return parsed
                }
            } catch {
                /* fall through */
            }
        }
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

/** Public share URL for a published notebook (hash route inside /notebooks). */
export function getNotebookPublicUrl(notebook: Pick<StoredNotebook, 'short_id' | 'id'>): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://worldinmaking.com'
    const path = typeof window !== 'undefined' ? window.location.pathname : '/notebooks'
    const base = path.includes('/notebooks') ? path.split('?')[0] : '/notebooks'
    return `${origin}${base}#/n/${notebook.short_id || notebook.id}`
}

export function getNotebookEditorUrl(notebook: Pick<StoredNotebook, 'id'>): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://worldinmaking.com'
    const path = typeof window !== 'undefined' ? window.location.pathname : '/notebooks'
    const base = path.includes('/notebooks') ? path.split('?')[0] : '/notebooks'
    return `${origin}${base}#/notebook/${notebook.id}`
}

/**
 * Persist notebook content/meta without always creating a history snapshot.
 * Use `snapshot: true` (or automatic interval) for version history entries.
 */
export function saveNotebook(
    notebook: StoredNotebook,
    options: { snapshot?: boolean; snapshotLabel?: string } = {}
): StoredNotebook {
    const notebooks = getNotebooks()
    const index = notebooks.findIndex((n) => n.id === notebook.id)
    const previous = index >= 0 ? notebooks[index] : undefined
    const now = new Date().toISOString()

    const next: StoredNotebook = {
        ...notebook,
        updatedAt: now,
    }

    const contentChanged =
        !previous || previous.content !== next.content || previous.title !== next.title

    const history = getNotebookHistory(notebook.id)
    const lastSnap = history[history.length - 1]
    const lastSnapAge = lastSnap ? Date.now() - new Date(lastSnap.timestamp).getTime() : Infinity
    const shouldSnapshot =
        options.snapshot === true ||
        (contentChanged && (history.length === 0 || lastSnapAge >= SNAPSHOT_MIN_INTERVAL_MS))

    if (shouldSnapshot && contentChanged) {
        history.push({
            version: next.version,
            content: next.content,
            title: next.title,
            timestamp: now,
            label: options.snapshotLabel,
        })
        writeHistory(notebook.id, history)
        next.version = (next.version || 1) + 1
    }

    if (index >= 0) {
        notebooks[index] = next
    } else {
        notebooks.push(next)
    }
    writeAll(notebooks)
    return next
}

/** Force a named history snapshot (e.g. before publish). */
export function snapshotNotebook(id: string, label?: string): StoredNotebook | undefined {
    const notebook = getNotebook(id)
    if (!notebook) return undefined
    return saveNotebook(notebook, { snapshot: true, snapshotLabel: label })
}

export function publishNotebook(
    id: string,
    meta: NotebookPublishMeta & { isPublished?: boolean }
): StoredNotebook | undefined {
    const notebook = getNotebook(id)
    if (!notebook) return undefined

    const published: StoredNotebook = {
        ...notebook,
        isPublished: meta.isPublished !== false,
        title: meta.publicTitle?.trim() || notebook.title,
        publish: {
            publicTitle: meta.publicTitle?.trim() || notebook.title,
            subtitle: meta.subtitle,
            coverUrl: meta.coverUrl,
            category: meta.category,
            tags: meta.tags,
        },
    }

    return saveNotebook(published, { snapshot: true, snapshotLabel: 'Published' })
}

export function unpublishNotebook(id: string): StoredNotebook | undefined {
    const notebook = getNotebook(id)
    if (!notebook) return undefined
    return saveNotebook({ ...notebook, isPublished: false }, { snapshot: true, snapshotLabel: 'Unpublished' })
}

export function deleteNotebook(id: string): void {
    const notebooks = getNotebooks().filter((n) => n.id !== id && n.short_id !== id)
    writeAll(notebooks)
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
        isPublished: false,
    }

    const notebooks = getNotebooks()
    notebooks.push(notebook)
    writeAll(notebooks)

    return notebook
}

export function duplicateNotebook(id: string): StoredNotebook | undefined {
    const source = getNotebook(id)
    if (!source) return undefined
    const copy = createNotebook(`${source.title} (Copy)`, source.content)
    if (source.publish) {
        return saveNotebook({ ...copy, publish: { ...source.publish }, isPublished: false })
    }
    return copy
}

export function getNotebookHistory(id: string): NotebookVersion[] {
    const data = localStorage.getItem(`${HISTORY_KEY_PREFIX}${id}`)
    if (!data) return []
    try {
        return JSON.parse(data) as NotebookVersion[]
    } catch {
        return []
    }
}

/** Newest first for UI. */
export function getNotebookHistoryNewestFirst(id: string): NotebookVersion[] {
    return [...getNotebookHistory(id)].reverse()
}

export function restoreNotebookVersion(id: string, version: number): StoredNotebook | undefined {
    const notebook = getNotebook(id)
    if (!notebook) return undefined

    const history = getNotebookHistory(id)
    const targetVersion = history.find((h) => h.version === version)
    if (!targetVersion) return undefined

    return saveNotebook(
        {
            ...notebook,
            content: targetVersion.content,
            title: targetVersion.title || notebook.title,
        },
        { snapshot: true, snapshotLabel: `Restored v${version}` }
    )
}

export function importNotebookFromJSON(jsonStr: string): StoredNotebook {
    const parsed = JSON.parse(jsonStr)
    const notebook = createNotebook(parsed.title, parsed.content)
    if (parsed.pinned !== undefined) notebook.pinned = parsed.pinned
    if (parsed.publish) notebook.publish = parsed.publish
    return saveNotebook(notebook)
}

export function exportNotebookAsJSON(id: string): string {
    const notebook = getNotebook(id)
    if (!notebook) throw new Error('Notebook not found')
    const payload = {
        app: 'WorldInMaking Notebooks',
        exportedAt: new Date().toISOString(),
        notebook: {
            id: notebook.id,
            short_id: notebook.short_id,
            title: notebook.title,
            content: notebook.content,
            version: notebook.version,
            isPublished: notebook.isPublished ?? false,
            publish: notebook.publish ?? null,
            createdAt: notebook.createdAt,
            updatedAt: notebook.updatedAt,
        },
    }
    return JSON.stringify(payload, null, 2)
}

export function exportNotebookAsMarkdown(id: string): string {
    const notebook = getNotebook(id)
    if (!notebook) throw new Error('Notebook not found')
    return notebook.content
}

/**
 * Markdown with YAML-ish front matter for paper / archive paste.
 * Safe plain text — no HTML.
 */
export function exportNotebookAsPaperMarkdown(id: string): string {
    const notebook = getNotebook(id)
    if (!notebook) throw new Error('Notebook not found')

    const title = notebook.publish?.publicTitle || notebook.title || 'Untitled Notebook'
    const subtitle = notebook.publish?.subtitle?.trim()
    const category = notebook.publish?.category?.trim()
    const tags = notebook.publish?.tags?.filter(Boolean) ?? []
    const lines = [
        '---',
        `title: ${JSON.stringify(title)}`,
        subtitle ? `subtitle: ${JSON.stringify(subtitle)}` : null,
        category ? `category: ${JSON.stringify(category)}` : null,
        tags.length ? `tags: ${JSON.stringify(tags)}` : null,
        `updated: ${JSON.stringify(notebook.updatedAt)}`,
        `source: WorldInMaking`,
        '---',
        '',
        `# ${title}`,
        subtitle ? `\n*${subtitle}*\n` : '',
        notebook.content.replace(/^\s*#\s+.+\n?/, ''), // drop duplicate leading H1 if same title
    ].filter((line) => line !== null) as string[]

    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
}

export function downloadTextFile(filename: string, content: string, mime: string): void {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}
