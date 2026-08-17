/**
 * Background Supabase sync for notebooks.
 * Never blocks the editor — failures are silent (localStorage remains source of truth).
 */
import { supabase, isSupabaseConfigured } from '../../../lib/supabase'
import { DEVICE_NOTEBOOK_OWNER_KEY, getActiveOwnerKey, getAuthUserId, namespacedStorageKey } from '../../../lib/wim-identity'
import type { NotebookVersion, StoredNotebook } from './notebookStorage'

const NOTEBOOK_DELETED_BASE = 'wim_notebook_deleted_ids'

export function getOrCreateOwnerKey(): string {
    return getActiveOwnerKey(DEVICE_NOTEBOOK_OWNER_KEY)
}

export function getNotebookDeletedStorageKey(): string {
    return namespacedStorageKey(NOTEBOOK_DELETED_BASE, getOrCreateOwnerKey())
}

export function readLocalDeletedNotebookIds(): string[] {
    if (typeof window === 'undefined') return []
    try {
        const raw = window.localStorage.getItem(getNotebookDeletedStorageKey())
        const parsed = raw ? JSON.parse(raw) : []
        return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []
    } catch {
        return []
    }
}

export function rememberDeletedNotebookId(id: string): void {
    if (typeof window === 'undefined' || !id) return
    const next = Array.from(new Set([...readLocalDeletedNotebookIds(), id]))
    try {
        window.localStorage.setItem(getNotebookDeletedStorageKey(), JSON.stringify(next.slice(-400)))
    } catch {
        /* ignore */
    }
}

/** Headers required by /api/notebooks authz (TSK-19). */
function notebookAuthHeaders(ownerKey: string, jsonBody = false): HeadersInit {
    const headers: Record<string, string> = {
        Accept: 'application/json',
        'X-WIM-Owner-Key': ownerKey,
    }
    if (jsonBody) headers['Content-Type'] = 'application/json'
    try {
        const jwt = localStorage.getItem('jwt')
        if (jwt && jwt.length > 20) {
            headers.Authorization = `Bearer ${jwt}`
        }
    } catch {
        /* ignore */
    }
    return headers
}

async function notebookAuthHeadersFresh(ownerKey: string, jsonBody = false): Promise<HeadersInit> {
    const headers = { ...(notebookAuthHeaders(ownerKey, jsonBody) as Record<string, string>) }
    try {
        const { supabase, isSupabaseConfigured } = await import('../../../lib/supabase')
        if (isSupabaseConfigured) {
            const { data } = await supabase.auth.getSession()
            if (data.session?.access_token) {
                headers.Authorization = `Bearer ${data.session.access_token}`
                localStorage.setItem('jwt', data.session.access_token)
            }
        }
    } catch {
        /* keep cached jwt */
    }
    return headers
}

type ListResponse = { notebooks: StoredNotebook[]; deleted_ids?: string[] }
type OneResponse = { notebook: StoredNotebook }
type ErrorBody = { error?: string; code?: string }

let remoteAvailable: boolean | null = null
let lastPullAt = 0
const PULL_MIN_INTERVAL_MS = 15_000

export function isNotebookRemoteKnownAvailable(): boolean | null {
    return remoteAvailable
}

async function parseJson<T>(res: Response): Promise<T | null> {
    try {
        return (await res.json()) as T
    } catch {
        return null
    }
}

export function resetNotebookPullThrottle(): void {
    lastPullAt = 0
}

export async function pullNotebooksFromRemote(options?: {
    force?: boolean
}): Promise<{ notebooks: StoredNotebook[]; deletedIds: string[] } | null> {
    if (typeof window === 'undefined') return null
    const now = Date.now()
    if (!options?.force && now - lastPullAt < PULL_MIN_INTERVAL_MS && remoteAvailable === false) {
        return null
    }
    lastPullAt = now

    const ownerKey = getOrCreateOwnerKey()
    try {
        const res = await fetch(`/api/notebooks?owner_key=${encodeURIComponent(ownerKey)}`, {
            method: 'GET',
            headers: await notebookAuthHeadersFresh(ownerKey),
            cache: 'no-store',
        })
        if (res.status === 503) {
            remoteAvailable = false
            return null
        }
        if (!res.ok) {
            remoteAvailable = res.status !== 404
            return null
        }
        const body = await parseJson<ListResponse & ErrorBody>(res)
        if (!body || !Array.isArray(body.notebooks)) {
            remoteAvailable = false
            return null
        }
        remoteAvailable = true
        return {
            notebooks: body.notebooks,
            deletedIds: Array.isArray(body.deleted_ids) ? body.deleted_ids : [],
        }
    } catch {
        remoteAvailable = false
        return null
    }
}

export async function pullNotebookById(id: string): Promise<StoredNotebook | null> {
    if (typeof window === 'undefined' || !id) return null
    const ownerKey = getOrCreateOwnerKey()
    try {
        const res = await fetch(
            `/api/notebooks/${encodeURIComponent(id)}?owner_key=${encodeURIComponent(ownerKey)}`,
            { method: 'GET', headers: await notebookAuthHeadersFresh(ownerKey) }
        )
        if (!res.ok) return null
        const body = await parseJson<OneResponse>(res)
        return body?.notebook ?? null
    } catch {
        return null
    }
}

export async function pushNotebookToRemote(
    notebook: StoredNotebook,
    historyEntries?: NotebookVersion[]
): Promise<{ ok: boolean; notebook?: StoredNotebook; conflict?: boolean }> {
    if (typeof window === 'undefined') return { ok: false }
    const ownerKey = getOrCreateOwnerKey()
    try {
        const res = await fetch('/api/notebooks', {
            method: 'POST',
            headers: await notebookAuthHeadersFresh(ownerKey, true),
            body: JSON.stringify({
                owner_key: ownerKey,
                notebook,
                history_entries: historyEntries,
            }),
        })
        if (res.status === 503) {
            remoteAvailable = false
            return { ok: false }
        }
        if (res.status === 409) {
            const remote = await pullNotebookById(notebook.id)
            return { ok: false, conflict: true, notebook: remote || undefined }
        }
        if (res.status === 410) {
            rememberDeletedNotebookId(notebook.id)
            return { ok: false }
        }
        if (!res.ok) return { ok: false }
        remoteAvailable = true
        const data = await parseJson<OneResponse>(res)
        return { ok: true, notebook: data?.notebook || undefined }
    } catch {
        return { ok: false }
    }
}


export async function pushAllNotebooksToRemote(
    notebooks: StoredNotebook[],
    history?: Record<string, NotebookVersion[]>
): Promise<boolean> {
    if (typeof window === 'undefined') return false
    if (!notebooks.length) return true
    const ownerKey = getOrCreateOwnerKey()
    try {
        const res = await fetch('/api/notebooks', {
            method: 'POST',
            headers: await notebookAuthHeadersFresh(ownerKey, true),
            body: JSON.stringify({
                owner_key: ownerKey,
                notebooks,
                history,
            }),
        })
        if (res.status === 503) {
            remoteAvailable = false
            return false
        }
        if (!res.ok) return false
        remoteAvailable = true
        return true
    } catch {
        return false
    }
}

export async function deleteNotebookRemote(id: string): Promise<boolean> {
    if (typeof window === 'undefined') return false
    const ownerKey = getOrCreateOwnerKey()
    try {
        const res = await fetch(
            `/api/notebooks/${encodeURIComponent(id)}?owner_key=${encodeURIComponent(ownerKey)}`,
            { method: 'DELETE', headers: await notebookAuthHeadersFresh(ownerKey) }
        )
        if (res.status === 503) {
            remoteAvailable = false
            return false
        }
        return res.ok || res.status === 404
    } catch {
        return false
    }
}

export async function pullPublishedNotebook(shortId: string): Promise<StoredNotebook | null> {
    if (typeof window === 'undefined') return null
    try {
        const res = await fetch(
            `/api/notebooks?short_id=${encodeURIComponent(shortId)}&public=1`,
            { method: 'GET', headers: { Accept: 'application/json' }, cache: 'no-store' }
        )
        if (!res.ok) return null
        const body = await parseJson<OneResponse>(res)
        return body?.notebook ?? null
    } catch {
        return null
    }
}

/** True when the remote copy should replace the stored row / become the editor merge base. */
export function shouldAdoptRemoteNotebook(
    current: Pick<StoredNotebook, 'version' | 'updatedAt' | 'content'>,
    remote: Pick<StoredNotebook, 'version' | 'updatedAt' | 'content'>
): boolean {
    const currentVersion = Number(current.version || 0)
    const remoteVersion = Number(remote.version || 0)
    if (remoteVersion > currentVersion) return true
    if (remoteVersion < currentVersion) return false
    const currentTs = Date.parse(current.updatedAt || '') || 0
    const remoteTs = Date.parse(remote.updatedAt || '') || 0
    return remoteTs > currentTs && remote.content !== current.content
}

/** How an open editor should absorb a newer remote copy without clobbering unsaved typing. */
export function planOpenNotebookRemoteApply(input: {
    current: Pick<StoredNotebook, 'version' | 'updatedAt' | 'content' | 'title'>
    latest: Pick<StoredNotebook, 'version' | 'updatedAt' | 'content' | 'title'>
    draftContent: string
    draftTitle: string
}): { adopt: boolean; applyContent: boolean; applyTitle: boolean } {
    if (!shouldAdoptRemoteNotebook(input.current, input.latest)) {
        return { adopt: false, applyContent: false, applyTitle: false }
    }
    return {
        adopt: true,
        applyContent: input.draftContent === input.current.content,
        applyTitle: input.draftTitle === input.current.title,
    }
}

export function subscribeToWorkspaceNotebooks(onChange: () => void): () => void {
    if (typeof window === 'undefined' || !isSupabaseConfigured || !getAuthUserId()) {
        return () => {}
    }
    const channel = supabase
        .channel(`wim-notebooks-live-${getAuthUserId()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'wim_notebooks' }, () => onChange())
        .subscribe()
    return () => {
        void supabase.removeChannel(channel)
    }
}

export function startNotebookPolling(onTick: () => void, intervalMs = 20000): () => void {
    if (typeof window === 'undefined') return () => {}
    const timer = window.setInterval(() => {
        if (document.visibilityState === 'visible') onTick()
    }, intervalMs)
    const onVisible = () => {
        if (document.visibilityState === 'visible') onTick()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
        window.clearInterval(timer)
        document.removeEventListener('visibilitychange', onVisible)
        window.removeEventListener('focus', onVisible)
    }
}

/** Last-write-wins merge by updatedAt (ISO strings). Local id wins on equal timestamps. */
export function pickNewerNotebook(local: StoredNotebook, remote: StoredNotebook): StoredNotebook {
    const localVersion = Number(local.version || 0)
    const remoteVersion = Number(remote.version || 0)
    if (remoteVersion > localVersion) return { ...local, ...remote }
    if (localVersion > remoteVersion) return local
    const localTs = Date.parse(local.updatedAt || '') || 0
    const remoteTs = Date.parse(remote.updatedAt || '') || 0
    return remoteTs > localTs ? { ...local, ...remote } : local
}

export function mergeNotebookLists(
    local: StoredNotebook[],
    remote: StoredNotebook[],
    deletedIds: string[] = []
): StoredNotebook[] {
    const dead = new Set(deletedIds)
    const map = new Map<string, StoredNotebook>()

    for (const nb of local) {
        if (!dead.has(nb.id) && !dead.has(nb.short_id)) map.set(nb.id, nb)
    }
    for (const nb of remote) {
        if (dead.has(nb.id) || dead.has(nb.short_id)) continue
        const existing = map.get(nb.id)
        if (!existing) {
            map.set(nb.id, nb)
            continue
        }
        map.set(nb.id, pickNewerNotebook(existing, nb))
    }

    return Array.from(map.values()).sort(
        (a, b) => (Date.parse(b.updatedAt || '') || 0) - (Date.parse(a.updatedAt || '') || 0)
    )
}
