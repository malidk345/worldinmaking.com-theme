import { uuid } from '../../lib/utils/dom'
import {
    deleteNotebookRemote,
    isNotebookRemoteKnownAvailable,
    mergeNotebookLists,
    notebookChromeSyncFromRemoteResult,
    pickNewerNotebook,
    pullNotebooksFromRemote,
    pushAllNotebooksToRemote,
    pushNotebookToRemote,
    rememberDeletedNotebookId,
    forgetDeletedNotebookId,
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
    getAuthUserId,
    getDeviceOwnerKey,
    namespacedStorageKey,
} from '../../../lib/wim-identity'
import { adoptDeviceCacheToAccount, adoptStringIdLists } from '../../../lib/adopt-device-cache'
import { getNotebookActor, personDisplayName, type NotebookPerson } from '../../../lib/notebook-actor'
import { persistNotebookLocal, createDocumentSnapshot } from '../../../lib/indexeddb-storage'
import { TrashStore } from '../../../lib/trash-store'
import type { NotebookAccessRole } from '../../../lib/notebook-sharing'
import { formatDailyTitle, normalizeFolder, todayKey, uniqueTags, type NotebookKind } from './notebookOrganize'
import { notebookPreviewExcerpt } from './notebookPreview'

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
    access_role?: NotebookAccessRole
    created_by?: NotebookPerson
    last_modified_by?: NotebookPerson
    folder?: string
    tags?: string[]
    kind?: NotebookKind
    dailyDate?: string
    preview?: string
    contentOmitted?: boolean
}

export interface NotebookVersion {
    version: number
    content: string
    title?: string
    timestamp: string
    label?: string
    author?: NotebookPerson
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
function queueRemote(promise: Promise<unknown>, options: { report?: boolean } = {}): void {
    const report = options.report !== false
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
            }

            if (result && typeof result === 'object' && result.ok && result.notebook?.id) {
                const localList = readLocalNotebooks()
                const idx = localList.findIndex((nb) => nb.id === result.notebook.id)
                if (idx >= 0 && localList[idx].version !== result.notebook.version) {
                    localList[idx].version = result.notebook.version
                    writeAll(localList)
                }
            }

            const chrome = notebookChromeSyncFromRemoteResult(result, {
                report,
                remoteAvailable: isNotebookRemoteKnownAvailable(),
            })
            if (chrome) emitWindowEvent(WIM_NOTEBOOK_SYNC_EVENT, chrome satisfies NotebookSyncEventDetail)
        })
        .catch(() => {
            const chrome = notebookChromeSyncFromRemoteResult(false, {
                report,
                remoteAvailable: isNotebookRemoteKnownAvailable(),
            })
            if (chrome) emitWindowEvent(WIM_NOTEBOOK_SYNC_EVENT, chrome satisfies NotebookSyncEventDetail)
        })
}

function canPushNotebook(notebook: StoredNotebook): boolean {
    if (notebook.contentOmitted) return false
    if (notebook.access_role === 'viewer') return false
    if (notebook.isTemplate) return false
    if (notebook.id === 'welcome-notebook' && notebook.content === WELCOME_CONTENT) return false
    return true
}

function schedulePushNotebook(notebook: StoredNotebook): void {
    if (typeof window === 'undefined') return
    if (!canPushNotebook(notebook)) return
    const history = getNotebookHistory(notebook.id)
    queueRemote(pushNotebookToRemote(notebook, history))
}


function schedulePushAll(): void {
    if (typeof window === 'undefined') return
    const notebooks = readLocalNotebooks().filter(canPushNotebook)
    if (!notebooks.length) return
    const history: Record<string, NotebookVersion[]> = {}
    for (const nb of notebooks) {
        history[nb.id] = getNotebookHistory(nb.id)
    }
    queueRemote(pushAllNotebooksToRemote(notebooks, history), { report: false })
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
    for (const id of remote.deletedIds) rememberDeletedNotebookId(id)
    const local = readLocalNotebooks()
    const deletedIds = [...readLocalDeletedNotebookIds(), ...remote.deletedIds]
    const merged = withCanonicalTemplates(mergeNotebookLists(local, remote.notebooks, deletedIds))
    writeAll(merged)
    const remoteById = new Map(remote.notebooks.map((nb) => [nb.id, nb]))
    const outgoing = merged.filter((nb) => {
        if (deletedIds.includes(nb.id) || deletedIds.includes(nb.short_id)) return false
        const remoteNb = remoteById.get(nb.id)
        if (!remoteNb) return Boolean(options.pushMissing) && canPushNotebook(nb)
        return (
            canPushNotebook(nb) &&
            pickNewerNotebook(nb, remoteNb) === nb &&
            nb !== remoteNb &&
            (nb.version || 0) > (remoteNb.version || 0)
        )
    })
    if (outgoing.length) {
        const history: Record<string, NotebookVersion[]> = {}
        for (const nb of outgoing) history[nb.id] = getNotebookHistory(nb.id)
        queueRemote(pushAllNotebooksToRemote(outgoing, history), { report: false })
    }
}

function refreshNotebooksFromRemote(claim = false): void {
    queueRemote(
        (async () => {
            if (claim) await claimDeviceAccountOnLogin()
            const remote = await pullNotebooksFromRemote({ force: true })
            if (!remote) return
            mergeRemoteIntoLocal(remote, { pushMissing: true })
            emitWindowEvent(WIM_NOTEBOOKS_HYDRATED_EVENT)
        })(),
        { report: false }
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
            for (const id of remote.deletedIds) rememberDeletedNotebookId(id)
            const local = readLocalNotebooks()
            const deletedIds = [...readLocalDeletedNotebookIds(), ...remote.deletedIds]
            if (!remote.notebooks.length) {
                const kept = withCanonicalTemplates(mergeNotebookLists(local, [], deletedIds))
                if (kept.length !== local.length) writeAll(kept)
                const fresh = kept.filter(
                    (nb) =>
                        canPushNotebook(nb) &&
                        !deletedIds.includes(nb.id) &&
                        !deletedIds.includes(nb.short_id)
                )
                if (fresh.length) {
                    const history: Record<string, NotebookVersion[]> = {}
                    for (const nb of fresh) history[nb.id] = getNotebookHistory(nb.id)
                    queueRemote(pushAllNotebooksToRemote(fresh, history), { report: false })
                }
                emitWindowEvent(WIM_NOTEBOOKS_HYDRATED_EVENT)
                return
            }
            mergeRemoteIntoLocal(remote, { pushMissing: true })
            emitWindowEvent(WIM_NOTEBOOKS_HYDRATED_EVENT)
        })(),
        { report: false }
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

const INTRODUCTION_TEMPLATE_ID = 'template-introduction'

const RETIRED_TEMPLATE_IDS = new Set([
    'template-feature-release',
    'template-root-cause',
    'template-sql-report',
    'template-session-replay',
    'template-ab-test',
    'template-retention',
    'template-feature-flag',
    'template-introducing',
    'template-release-plan',
    'template-rca',
])

function isRetiredTemplate(notebook: StoredNotebook): boolean {
    if (notebook.id === INTRODUCTION_TEMPLATE_ID) return false
    if (RETIRED_TEMPLATE_IDS.has(notebook.id)) return true
    return Boolean(notebook.isTemplate && notebook.id.startsWith('template-'))
}

function introductionTemplate(): StoredNotebook {
    const now = new Date().toISOString()
    return {
        id: INTRODUCTION_TEMPLATE_ID,
        short_id: 'tmpl-intro',
        title: 'How to use a notebook',
        content: WELCOME_CONTENT,
        createdAt: now,
        updatedAt: now,
        pinned: false,
        version: 1,
        isTemplate: true,
        isPublished: false,
        created_by: { first_name: 'WIM', email: 'hello@worldinmaking.com' },
    }
}

function withCanonicalTemplates(notebooks: StoredNotebook[]): StoredNotebook[] {
    const kept: StoredNotebook[] = []
    for (const notebook of notebooks) {
        if (isRetiredTemplate(notebook)) {
            rememberDeletedNotebookId(notebook.id)
            continue
        }
        kept.push(notebook)
    }
    if (!kept.some((notebook) => notebook.id === INTRODUCTION_TEMPLATE_ID)) {
        kept.unshift(introductionTemplate())
    }
    return kept
}

function newWelcomeNotebook(): StoredNotebook {
    const id =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? `welcome-${crypto.randomUUID()}`
            : `welcome-${Date.now().toString(36)}`
    return {
        id,
        short_id: id.replace(/-/g, '').slice(0, 12),
        title: 'Welcome to WIM',
        content: WELCOME_CONTENT,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pinned: true,
        version: 1,
        isPublished: false,
        created_by: { first_name: 'WIM', email: 'hello@worldinmaking.com' },
    }
}

export const DEFAULT_NOTEBOOKS: StoredNotebook[] = [introductionTemplate(), newWelcomeNotebook()]

function seedDefaults(): StoredNotebook[] {
    const deleted = readLocalDeletedNotebookIds()
    if (deleted.includes('welcome-notebook') || deleted.includes('welcome')) {
        const seed = withCanonicalTemplates([])
        setLocalStorageItem(storageKey(), JSON.stringify(seed))
        return seed
    }
    const seed = withCanonicalTemplates([newWelcomeNotebook()])
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
    const name = (person.first_name || '').trim()
    return (
        (!name || name === 'You' || name === 'WIM') &&
        !person.username &&
        !person.email &&
        !person.avatar_url
    )
}

function sameNotebookPerson(person?: NotebookPerson, actor?: NotebookPerson): boolean {
    if (!person || !actor) return false
    const personUser = (person.username || '').trim().toLowerCase()
    const actorUser = (actor.username || '').trim().toLowerCase()
    if (personUser && actorUser && personUser === actorUser) return true
    const personEmail = (person.email || '').trim().toLowerCase()
    const actorEmail = (actor.email || '').trim().toLowerCase()
    if (personEmail && actorEmail && personEmail === actorEmail) return true
    return isWeakPerson(person)
}

function personChanged(left?: NotebookPerson, right?: NotebookPerson): boolean {
    return JSON.stringify(left || null) !== JSON.stringify(right || null)
}

/** Fill missing or stale actors from the signed-in profile. */
export function backfillNotebookActors(): boolean {
    if (typeof window === 'undefined') return false
    const actor = getNotebookActor()
    if (isWeakPerson(actor)) return false
    const notebooks = readLocalNotebooks()
    let changed = false
    const next = notebooks.map((nb) => {
        let created_by = nb.created_by
        let last_modified_by = nb.last_modified_by

        if (!created_by || sameNotebookPerson(created_by, actor)) {
            if (personChanged(created_by, actor)) {
                created_by = actor
                changed = true
            }
        }

        if (!last_modified_by || sameNotebookPerson(last_modified_by, actor)) {
            if (personChanged(last_modified_by, actor)) {
                last_modified_by = actor
                changed = true
            }
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
            author: entry.author,
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
                    const kept = withCanonicalTemplates(parsed)
                    writeAll(kept)
                    return kept
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
        const kept = withCanonicalTemplates(parsed)
        if (kept.length !== parsed.length || !parsed.some((notebook) => notebook.id === INTRODUCTION_TEMPLATE_ID)) {
            writeAll(kept)
        }
        inMemoryNotebooksCache = kept
        return kept
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

export type NotebookBrowserItem = Omit<StoredNotebook, 'content'> & {
    preview: string
    content?: string
}

export function toNotebookBrowserItem(notebook: StoredNotebook, keepContent = false): NotebookBrowserItem {
    const { content, ...rest } = notebook
    return {
        ...rest,
        preview: notebook.preview || notebookPreviewExcerpt(content, 2000),
        ...(keepContent ? { content } : {}),
    }
}

export function listNotebooksForBrowser(): NotebookBrowserItem[] {
    return getNotebooks().map(toNotebookBrowserItem)
}

export function adoptGuestNotebooksIntoAccount(): void {
    if (typeof window === 'undefined') return
    const authId = getAuthUserId()
    if (!authId) return
    const deviceKey = getDeviceOwnerKey(DEVICE_NOTEBOOK_OWNER_KEY)
    const accountKey = namespacedStorageKey(STORAGE_KEY_BASE, authId)
    adoptDeviceCacheToAccount({
        storage: window.localStorage,
        accountKey,
        sourceKeys: [
            namespacedStorageKey(STORAGE_KEY_BASE, deviceKey),
            STORAGE_KEY_BASE,
            'wim_notebooks_v2',
            'wim_notebooks_v1',
            'ph_standalone_notebooks',
        ],
        merge: (fromSources, existing) =>
            mergeNotebookLists(fromSources as StoredNotebook[], existing as StoredNotebook[]),
    })
    adoptStringIdLists({
        storage: window.localStorage,
        accountKey: namespacedStorageKey('wim_notebook_deleted_ids', authId),
        sourceKeys: [
            namespacedStorageKey('wim_notebook_deleted_ids', deviceKey),
            'wim_notebook_deleted_ids',
        ],
    })
}

export function rehydrateNotebooksForIdentity(): void {
    adoptGuestNotebooksIntoAccount()
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

/** Merge a remote/shared notebook into local storage without bumping version. */
export function rememberRemoteNotebook(notebook: StoredNotebook): StoredNotebook {
    const notebooks = getNotebooks()
    const index = notebooks.findIndex((n) => n.id === notebook.id || n.short_id === notebook.short_id)
    if (index >= 0) {
        const merged = pickNewerNotebook(notebooks[index], notebook)
        const next = {
            ...merged,
            access_role: notebook.access_role || merged.access_role,
        }
        notebooks[index] = next
        writeAll(notebooks)
        return next
    }
    notebooks.push(notebook)
    writeAll(notebooks)
    return notebook
}

export function rememberRemoteNotebooks(notebooks: StoredNotebook[]): void {
    if (!notebooks.length) return
    const current = getNotebooks()
    const map = new Map(current.map((nb) => [nb.id, nb]))
    for (const notebook of notebooks) {
        const existing = map.get(notebook.id)
        map.set(
            notebook.id,
            existing
                ? { ...pickNewerNotebook(existing, notebook), access_role: notebook.access_role || existing.access_role }
                : notebook
        )
    }
    writeAll(Array.from(map.values()))
}

export async function leaveSharedNotebook(id: string): Promise<boolean> {
    const target = getNotebook(id)
    if (!target) return false
    try {
        const { getAuthUserId } = await import('../../../lib/wim-identity')
        const { removeNotebookPerson } = await import('../../../lib/notebook-collaborators-client')
        const userId = getAuthUserId()
        if (userId) await removeNotebookPerson(target.id, { userId })
    } catch {
        /* still drop locally */
    }
    const notebooks = getNotebooks().filter((n) => n.id !== id && n.short_id !== id)
    writeAll(notebooks)
    unpinNotebookFromDesktop(id)
    if (target.short_id) unpinNotebookFromDesktop(target.short_id)
    return true
}

/** Public share URL for a published notebook. */
export function getNotebookPublicUrl(notebook: Pick<StoredNotebook, 'short_id' | 'id'>): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://worldinmaking.com'
    return `${origin}/notebooks/n/${notebook.short_id || notebook.id}`
}

export function getNotebookEditorUrl(notebook: Pick<StoredNotebook, 'id'>): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://worldinmaking.com'
    return `${origin}/notebooks/${notebook.id}`
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
                author: getNotebookActor(),
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
    // Local-First IndexedDB Persistence & Snapshots
    if (typeof window !== 'undefined') {
        persistNotebookLocal(next.id, next.title, next.content).catch(() => { /* ignore */ })
        if (shouldSnapshot && (contentChanged || options.snapshot)) {
            createDocumentSnapshot(
                next.id,
                next.title,
                next.content,
                options.snapshotLabel,
                personDisplayName(getNotebookActor())
            ).catch(() => { /* ignore */ })
        }
    }
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
    const target = getNotebook(id)
    if (target) {
        TrashStore.addNotebook(target, getNotebookHistory(target.id))
        rememberDeletedNotebookId(target.id)
        if (target.short_id) rememberDeletedNotebookId(target.short_id)
    }
    rememberDeletedNotebookId(id)
    const notebooks = getNotebooks().filter((n) => n.id !== id && n.short_id !== id)
    writeAll(notebooks)
    localStorage.removeItem(`${HISTORY_KEY_PREFIX}${id}`)
    unpinNotebookFromDesktop(id)
    if (target) {
        localStorage.removeItem(`${HISTORY_KEY_PREFIX}${target.id}`)
        unpinNotebookFromDesktop(target.id)
        if (target.short_id) unpinNotebookFromDesktop(target.short_id)
        queueRemote(deleteNotebookRemote(target.id), { report: false })
    } else {
        queueRemote(deleteNotebookRemote(id), { report: false })
    }
}

export function restoreNotebookFromTrash(id: string): StoredNotebook | undefined {
    const item = TrashStore.getItem(id)
    if (!item?.notebook) return undefined
    forgetDeletedNotebookId(item.notebook.id)
    if (item.notebook.short_id) forgetDeletedNotebookId(item.notebook.short_id)
    const notebooks = getNotebooks().filter((notebook) => notebook.id !== item.notebook.id)
    notebooks.push(item.notebook)
    writeAll(notebooks)
    if (item.history.length) writeNotebookHistory(item.notebook.id, item.history)
    TrashStore.remove(id)
    schedulePushNotebook(item.notebook)
    return item.notebook
}

export function emptyNotebookTrash(): void {
    TrashStore.empty()
}

export function createNotebook(
    title?: string,
    content?: string,
    organize?: { folder?: string; tags?: string[]; kind?: NotebookKind; dailyDate?: string }
): StoredNotebook {
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
        folder: organize?.folder ? normalizeFolder(organize.folder) || undefined : undefined,
        tags: organize?.tags ? uniqueTags(organize.tags) : undefined,
        kind: organize?.kind,
        dailyDate: organize?.dailyDate,
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
    const copy = createNotebook(`${source.title} (Copy)`, source.content, {
        folder: source.folder,
        tags: source.tags,
    })
    if (source.publish) {
        return saveNotebook({ ...copy, publish: { ...source.publish }, isPublished: false })
    }
    return copy
}

export function getOrCreateDailyNotebook(date = new Date()): StoredNotebook {
    const dailyDate = todayKey(date)
    const existing = getNotebooks().find((notebook) => notebook.kind === 'daily' && notebook.dailyDate === dailyDate)
    if (existing) return existing
    const title = formatDailyTitle(date)
    return createNotebook(title, `# ${title}\n\n`, { kind: 'daily', dailyDate })
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
    if (!targetVersion?.content) return undefined

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
    const source = parsed?.notebook && typeof parsed.notebook === 'object' ? parsed.notebook : parsed
    const notebook = createNotebook(source.title, source.content, {
        folder: source.folder,
        tags: source.tags,
        kind: source.kind === 'daily' ? 'daily' : undefined,
        dailyDate: source.dailyDate,
    })
    if (source.pinned !== undefined) notebook.pinned = source.pinned
    if (source.publish) notebook.publish = source.publish
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
            folder: notebook.folder,
            tags: notebook.tags,
            kind: notebook.kind,
            dailyDate: notebook.dailyDate,
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
