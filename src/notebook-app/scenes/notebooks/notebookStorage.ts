import { uuid } from '../../lib/utils/dom'
import {
    deleteNotebookRemote,
    isNotebookRemoteKnownAvailable,
    mergeNotebookLists,
    pickNewerNotebook,
    pullNotebooksFromRemote,
    pushAllNotebooksToRemote,
    pushNotebookToRemote,
    rememberDeletedNotebookId,
    readLocalDeletedNotebookIds,
    resetNotebookPullThrottle,
    startNotebookPolling,
    subscribeToWorkspaceNotebooks,
} from './notebookRemote'
import { claimDeviceAccountOnLogin } from '../../../lib/chat-remote'
import {
    DEVICE_NOTEBOOK_OWNER_KEY,
    WIM_IDENTITY_EVENT,
    getActiveOwnerKey,
    namespacedStorageKey,
} from '../../../lib/wim-identity'
import { getNotebookActor, type NotebookPerson } from '../../../lib/notebook-actor'

export const WIM_NOTEBOOKS_CHANGED_EVENT = 'wimNotebooksChanged'
export const WIM_NOTEBOOKS_HYDRATED_EVENT = 'wimNotebooksHydrated'
export const WIM_NOTEBOOK_SYNC_EVENT = 'wimNotebookSync'

export type NotebookSyncEventDetail = {
    status: 'ok' | 'error' | 'offline'
    message?: string
}

function emitWindowEvent(name: string, detail?: unknown): void {
    if (typeof window === 'undefined') return
    window.dispatchEvent(detail !== undefined ? new CustomEvent(name, { detail }) : new Event(name))
}

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
    created_by?: NotebookPerson
    last_modified_by?: NotebookPerson
}

export interface NotebookVersion {
    version: number
    content: string
    title?: string
    timestamp: string
    label?: string
}

// Bump key when default seed content changes so old fake templates are not kept forever.
const STORAGE_KEY_BASE = 'wim_notebooks_v3'

function storageKey(): string {
    return namespacedStorageKey(STORAGE_KEY_BASE, getActiveOwnerKey(DEVICE_NOTEBOOK_OWNER_KEY))
}
const HISTORY_KEY_PREFIX = 'wim_notebook_history_'
const LEGACY_STORAGE_KEYS = ['ph_standalone_notebooks', 'wim_notebooks_v1', 'wim_notebooks_v2', STORAGE_KEY_BASE]
const MAX_HISTORY = 12
const MAX_FULL_HISTORY_BODIES = 3
const HISTORY_QUOTA_KEEP = [12, 6, 3, 1]
/** Min ms between automatic history snapshots while typing */
const SNAPSHOT_MIN_INTERVAL_MS = 20_000

function isQuotaExceeded(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false
    const name = 'name' in error ? String(error.name) : ''
    const code = 'code' in error ? Number(error.code) : 0
    return name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED' || code === 22 || code === 1014
}

function setLocalStorageItem(key: string, value: string): boolean {
    if (typeof window === 'undefined') return false
    try {
        window.localStorage.setItem(key, value)
        return true
    } catch (error) {
        if (!isQuotaExceeded(error)) return false
        evictStaleNotebookHistory(key)
        try {
            window.localStorage.setItem(key, value)
            return true
        } catch {
            return false
        }
    }
}

function evictStaleNotebookHistory(keepKey?: string): void {
    if (typeof window === 'undefined') return
    const keys: string[] = []
    for (let index = 0; index < window.localStorage.length; index++) {
        const key = window.localStorage.key(index)
        if (key && key.startsWith(HISTORY_KEY_PREFIX) && key !== keepKey) keys.push(key)
    }
    // Drop oldest-looking keys first (prefix + id is stable; last written keys tend to be later in the list).
    for (const key of keys) {
        try {
            window.localStorage.removeItem(key)
        } catch {
            /* ignore */
        }
    }
}

/** Fire-and-forget remote sync — never throws into UI paths. Emits sync status for the chrome. */
function queueRemote(promise: Promise<unknown>): void {
    promise
        .then((result: any) => {
            if (result && typeof result === 'object' && result.conflict) {
                if (result.notebook?.id) {
                    const localList = readLocalNotebooks()
                    const idx = localList.findIndex((nb) => nb.id === result.notebook.id)
                    if (idx >= 0) {
                        localList[idx] = pickNewerNotebook(localList[idx], result.notebook)
                    } else {
                        localList.unshift(result.notebook)
                    }
                    writeAll(localList)
                }
                emitWindowEvent(WIM_NOTEBOOK_SYNC_EVENT, {
                    status: 'error',
                    message: 'Updated from another device.',
                } satisfies NotebookSyncEventDetail)
                return
            }

            if (result === false || (result && typeof result === 'object' && result.ok === false)) {
                const offline = isNotebookRemoteKnownAvailable() === false
                emitWindowEvent(WIM_NOTEBOOK_SYNC_EVENT, {
                    status: offline ? 'offline' : 'error',
                    message: offline
                        ? 'Offline. Notebook is saved on this device.'
                        : 'Cloud sync failed. Notebook is still saved on this device.',
                } satisfies NotebookSyncEventDetail)
                return
            }

            if (result && typeof result === 'object' && result.ok && result.notebook?.id) {
                // Sync version back to local storage if returned by remote API
                const localList = readLocalNotebooks()
                const idx = localList.findIndex((nb) => nb.id === result.notebook.id)
                if (idx >= 0 && localList[idx].version !== result.notebook.version) {
                    localList[idx].version = result.notebook.version
                    writeAll(localList)
                }
            }

            emitWindowEvent(WIM_NOTEBOOK_SYNC_EVENT, { status: 'ok' } satisfies NotebookSyncEventDetail)
        })
        .catch(() => {
            emitWindowEvent(WIM_NOTEBOOK_SYNC_EVENT, {
                status: 'error',
                message: 'Cloud sync failed. Notebook is still saved on this device.',
            } satisfies NotebookSyncEventDetail)
        })
}

function schedulePushNotebook(notebook: StoredNotebook): void {
    if (typeof window === 'undefined') return
    const history = getNotebookHistory(notebook.id)
    queueRemote(pushNotebookToRemote(notebook, history))
}


function schedulePushAll(): void {
    if (typeof window === 'undefined') return
    const notebooks = readLocalNotebooks()
    if (!notebooks.length) return
    const history: Record<string, NotebookVersion[]> = {}
    for (const nb of notebooks) {
        history[nb.id] = getNotebookHistory(nb.id)
    }
    queueRemote(pushAllNotebooksToRemote(notebooks, history))
}

/** Background pull + merge into localStorage (no React state — next read/remount sees data) */
let hydrateStarted = false
let liveSyncStarted = false
let stopLiveSync: (() => void) | null = null
let livePullTimer: number | undefined

function mergeRemoteIntoLocal(
    remote: { notebooks: StoredNotebook[]; deletedIds: string[] },
    options: { pushMissing?: boolean } = {}
): void {
    const local = readLocalNotebooks()
    const deletedIds = [...readLocalDeletedNotebookIds(), ...remote.deletedIds]
    const merged = mergeNotebookLists(local, remote.notebooks, deletedIds)
    writeAll(merged)
    const remoteById = new Map(remote.notebooks.map((nb) => [nb.id, nb]))
    const outgoing = merged.filter((nb) => {
        if (deletedIds.includes(nb.id) || deletedIds.includes(nb.short_id)) return false
        const remoteNb = remoteById.get(nb.id)
        if (!remoteNb) return Boolean(options.pushMissing)
        return pickNewerNotebook(nb, remoteNb) === nb && nb !== remoteNb && (nb.version || 0) > (remoteNb.version || 0)
    })
    if (outgoing.length) {
        const history: Record<string, NotebookVersion[]> = {}
        for (const nb of outgoing) history[nb.id] = getNotebookHistory(nb.id)
        queueRemote(pushAllNotebooksToRemote(outgoing, history))
    }
}

function refreshNotebooksFromRemote(claim = false): void {
    queueRemote(
        (async () => {
            if (claim) await claimDeviceAccountOnLogin()
            const remote = await pullNotebooksFromRemote({ force: true })
            if (!remote) return false
            mergeRemoteIntoLocal(remote, { pushMissing: false })
            emitWindowEvent(WIM_NOTEBOOKS_HYDRATED_EVENT)
            return true
        })()
    )
}

function ensureRemoteHydrate(): void {
    if (typeof window === 'undefined' || hydrateStarted) return
    hydrateStarted = true
    queueRemote(
        (async () => {
            await claimDeviceAccountOnLogin()
            const remote = await pullNotebooksFromRemote()
            if (!remote) {
                // Table missing or offline: still try to push local when API becomes ready later
                schedulePushAll()
                emitWindowEvent(WIM_NOTEBOOKS_HYDRATED_EVENT)
                return
            }
            const local = readLocalNotebooks()
            const deletedIds = [...readLocalDeletedNotebookIds(), ...remote.deletedIds]
            if (!remote.notebooks.length) {
                const kept = mergeNotebookLists(local, [], deletedIds)
                if (kept.length !== local.length) writeAll(kept)
                const fresh = kept.filter((nb) => !deletedIds.includes(nb.id) && !deletedIds.includes(nb.short_id))
                if (fresh.length) {
                    const history: Record<string, NotebookVersion[]> = {}
                    for (const nb of fresh) history[nb.id] = getNotebookHistory(nb.id)
                    queueRemote(pushAllNotebooksToRemote(fresh, history))
                }
                emitWindowEvent(WIM_NOTEBOOKS_HYDRATED_EVENT)
                return
            }
            mergeRemoteIntoLocal(remote, { pushMissing: true })
            emitWindowEvent(WIM_NOTEBOOKS_HYDRATED_EVENT)
        })()
    )
}

function ensureLiveNotebookSync(): void {
    if (typeof window === 'undefined') return
    if (liveSyncStarted) {
        ensureRemoteHydrate()
        return
    }
    liveSyncStarted = true
    const schedulePull = () => {
        window.clearTimeout(livePullTimer)
        livePullTimer = window.setTimeout(() => refreshNotebooksFromRemote(false), 350)
    }
    const stopRealtime = subscribeToWorkspaceNotebooks(schedulePull)
    const stopPolling = startNotebookPolling(schedulePull, 20_000)
    stopLiveSync = () => {
        window.clearTimeout(livePullTimer)
        stopRealtime()
        stopPolling()
    }
    ensureRemoteHydrate()
}

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
    const deleted = readLocalDeletedNotebookIds()
    if (deleted.includes('welcome-notebook') || deleted.includes('welcome')) {
        setLocalStorageItem(storageKey(), '[]')
        return []
    }
    const seed = DEFAULT_NOTEBOOKS.map((n) => ({
        ...n,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    }))
    setLocalStorageItem(storageKey(), JSON.stringify(seed))
    for (const key of LEGACY_STORAGE_KEYS) {
        try {
            localStorage.removeItem(key)
        } catch {
            /* ignore */
        }
    }
    return seed
}

let inMemoryNotebooksCache: StoredNotebook[] | null = null

function writeAll(notebooks: StoredNotebook[]): void {
    inMemoryNotebooksCache = notebooks
    if (!setLocalStorageItem(storageKey(), JSON.stringify(notebooks))) {
        evictStaleNotebookHistory()
        setLocalStorageItem(storageKey(), JSON.stringify(notebooks))
    }
    emitWindowEvent(WIM_NOTEBOOKS_CHANGED_EVENT)
}

function isWeakPerson(person?: NotebookPerson): boolean {
    if (!person) return true
    return person.first_name === 'You' && !person.username && !person.email && !person.avatar_url
}

/** Fill missing or placeholder actors from the signed-in profile (old local rows). */
export function backfillNotebookActors(): boolean {
    if (typeof window === 'undefined') return false
    const actor = getNotebookActor()
    const actorIsWeak = isWeakPerson(actor)
    const notebooks = readLocalNotebooks()
    let changed = false
    const next = notebooks.map((nb) => {
        let created_by = nb.created_by
        let last_modified_by = nb.last_modified_by

        if (!created_by) {
            created_by = actor
            changed = true
        } else if (!actorIsWeak && isWeakPerson(created_by)) {
            created_by = actor
            changed = true
        }

        if (!last_modified_by) {
            last_modified_by = actor
            changed = true
        } else if (!actorIsWeak && isWeakPerson(last_modified_by)) {
            last_modified_by = actor
            changed = true
        }

        if (created_by === nb.created_by && last_modified_by === nb.last_modified_by) return nb
        return { ...nb, created_by, last_modified_by }
    })
    if (!changed) return false
    writeAll(next)
    schedulePushAll()
    return true
}

/** Retry a background push of every local notebook. */
export function retryNotebookRemoteSync(): void {
    schedulePushAll()
}

/** Newest `MAX_FULL_HISTORY_BODIES` keep content; older rows are metadata only. */
export function compactHistoryForStorage(history: NotebookVersion[]): NotebookVersion[] {
    const sliced = history.slice(-MAX_HISTORY)
    return sliced.map((entry, index) => {
        if (index >= sliced.length - MAX_FULL_HISTORY_BODIES) return entry
        if (!entry.content) return entry
        return {
            version: entry.version,
            title: entry.title,
            timestamp: entry.timestamp,
            label: entry.label,
        }
    })
}

function writeHistory(id: string, history: NotebookVersion[]): void {
    const key = `${HISTORY_KEY_PREFIX}${id}`
    const compacted = compactHistoryForStorage(history)
    for (const keep of HISTORY_QUOTA_KEEP) {
        const slice = compacted.slice(-Math.min(keep, compacted.length))
        if (setLocalStorageItem(key, JSON.stringify(slice))) return
    }
    if (typeof window === 'undefined') return
    try {
        window.localStorage.removeItem(key)
    } catch {
        /* ignore */
    }
}

/** Test / drawer helper: persist a history list without throwing. */
export function writeNotebookHistory(id: string, history: NotebookVersion[]): void {
    writeHistory(id, history)
}

/** Pure local read — cached in-memory with automatic invalidation. */
function readLocalNotebooks(): StoredNotebook[] {
    if (inMemoryNotebooksCache) return inMemoryNotebooksCache
    if (typeof window === 'undefined') return [...DEFAULT_NOTEBOOKS]
    const data = localStorage.getItem(storageKey()) || localStorage.getItem(STORAGE_KEY_BASE)
    if (!data) {
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
        const seeded = seedDefaults()
        inMemoryNotebooksCache = seeded
        return seeded
    }
    try {
        const parsed = JSON.parse(data) as StoredNotebook[]
        if (!Array.isArray(parsed) || parsed.length === 0) {
            const seeded = seedDefaults()
            inMemoryNotebooksCache = seeded
            return seeded
        }
        inMemoryNotebooksCache = parsed
        return parsed
    } catch {
        const seeded = seedDefaults()
        inMemoryNotebooksCache = seeded
        return seeded
    }
}

export function getNotebooks(): StoredNotebook[] {
    ensureLiveNotebookSync()
    return readLocalNotebooks()
}

export function rehydrateNotebooksForIdentity(): void {
    inMemoryNotebooksCache = null
    hydrateStarted = false
    resetNotebookPullThrottle()
    stopLiveSync?.()
    liveSyncStarted = false
    ensureLiveNotebookSync()
    emitWindowEvent(WIM_NOTEBOOKS_CHANGED_EVENT)
}

if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
        if (e.key === storageKey() || e.key === STORAGE_KEY_BASE) {
            inMemoryNotebooksCache = null
        }
    })
    window.addEventListener(WIM_IDENTITY_EVENT, () => {
        rehydrateNotebooksForIdentity()
    })
    ensureLiveNotebookSync()
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
        last_modified_by: getNotebookActor(),
    }

    const contentChanged =
        !previous || previous.content !== next.content || previous.title !== next.title

    if (contentChanged) {
        next.version = Math.max(Number(previous?.version || 0), Number(next.version || 0)) + 1
    }

    const history = getNotebookHistory(notebook.id)
    const lastSnap = history[history.length - 1]
    const lastSnapAge = lastSnap ? Date.now() - new Date(lastSnap.timestamp).getTime() : Infinity
    const identicalToLastSnap =
        !!lastSnap && lastSnap.content === next.content && (lastSnap.title || '') === (next.title || '')

    // Auto: throttle by interval when content changes.
    // Manual / labeled: always snapshot unless identical to the last entry (no spam).
    const shouldSnapshot = options.snapshot
        ? !identicalToLastSnap || Boolean(options.snapshotLabel)
        : contentChanged && (history.length === 0 || lastSnapAge >= SNAPSHOT_MIN_INTERVAL_MS)

    if (shouldSnapshot && (contentChanged || options.snapshot)) {
        // Avoid pure duplicates on forced snapshot without label
        if (!(identicalToLastSnap && !options.snapshotLabel)) {
            history.push({
                version: next.version,
                content: next.content,
                title: next.title,
                timestamp: now,
                label: options.snapshotLabel,
            })
            writeHistory(notebook.id, history)
        }
    }

    if (index >= 0) {
        notebooks[index] = next
    } else {
        notebooks.push(next)
    }
    writeAll(notebooks)
    schedulePushNotebook(next)
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
        isPublished: meta.isPublished === true,
        title: meta.publicTitle?.trim() || notebook.title,
        publish: {
            publicTitle: meta.publicTitle?.trim() || notebook.title,
            subtitle: meta.subtitle,
            coverUrl: meta.coverUrl,
            category: meta.category,
            tags: meta.tags,
        },
    }

    return saveNotebook(published, {
        snapshot: true,
        snapshotLabel: meta.isPublished === true ? 'Published' : 'Saved draft',
    })
}

export function unpublishNotebook(id: string): StoredNotebook | undefined {
    const notebook = getNotebook(id)
    if (!notebook) return undefined
    return saveNotebook({ ...notebook, isPublished: false }, { snapshot: true, snapshotLabel: 'Unpublished' })
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
                !String(item.url || '').endsWith(`=${id}`)
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
    const target = getNotebook(id)
    rememberDeletedNotebookId(id)
    if (target) rememberDeletedNotebookId(target.id)
    const notebooks = getNotebooks().filter((n) => n.id !== id && n.short_id !== id)
    writeAll(notebooks)
    localStorage.removeItem(`${HISTORY_KEY_PREFIX}${id}`)
    unpinNotebookFromDesktop(id)
    if (target) {
        localStorage.removeItem(`${HISTORY_KEY_PREFIX}${target.id}`)
        unpinNotebookFromDesktop(target.id)
        if (target.short_id) unpinNotebookFromDesktop(target.short_id)
        queueRemote(deleteNotebookRemote(target.id))
    } else {
        queueRemote(deleteNotebookRemote(id))
    }
}

export function createNotebook(title?: string, content?: string): StoredNotebook {
    const id = uuid()
    const now = new Date().toISOString()

    const actor = getNotebookActor()

    const notebook: StoredNotebook = {
        id,
        short_id: id.substring(0, 8),
        title: title || 'Untitled Notebook',
        content: content || '',
        createdAt: now,
        updatedAt: now,
        version: 1,
        isPublished: false,
        created_by: actor,
        last_modified_by: actor,
    }

    const notebooks = getNotebooks()
    notebooks.push(notebook)
    writeAll(notebooks)
    schedulePushNotebook(notebook)

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
    if (typeof window === 'undefined') return []
    try {
        const data = window.localStorage.getItem(`${HISTORY_KEY_PREFIX}${id}`)
        if (!data) return []
        const parsed = JSON.parse(data) as NotebookVersion[]
        return Array.isArray(parsed) ? parsed : []
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
