/**
 * Background Supabase sync for notebooks.
 * Never blocks the editor — failures are silent (localStorage remains source of truth).
 */
import type { NotebookVersion, StoredNotebook } from './notebookStorage'
import { DEVICE_NOTEBOOK_OWNER_KEY, getActiveOwnerKey, namespacedStorageKey } from '../../../lib/wim-identity'

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

export async function pullNotebooksFromRemote(): Promise<{ notebooks: StoredNotebook[]; deletedIds: string[] } | null> {
    if (typeof window === 'undefined') return null
    const now = Date.now()
    if (now - lastPullAt < PULL_MIN_INTERVAL_MS && remoteAvailable === false) {
        return null
    }
    lastPullAt = now

    const ownerKey = getOrCreateOwnerKey()
    try {
        const res = await fetch(`/api/notebooks?owner_key=${encodeURIComponent(ownerKey)}`, {
            method: 'GET',
            headers: notebookAuthHeaders(ownerKey),
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

export async function pushNotebookToRemote(
    notebook: StoredNotebook,
    historyEntries?: NotebookVersion[]
): Promise<{ ok: boolean; notebook?: StoredNotebook; conflict?: boolean }> {
    if (typeof window === 'undefined') return { ok: false }
    const ownerKey = getOrCreateOwnerKey()
    try {
        const res = await fetch('/api/notebooks', {
            method: 'POST',
            headers: notebookAuthHeaders(ownerKey, true),
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
            return { ok: false, conflict: true }
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
            headers: notebookAuthHeaders(ownerKey, true),
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
            { method: 'DELETE', headers: notebookAuthHeaders(ownerKey) }
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

/** Last-write-wins merge by updatedAt (ISO strings). Local id wins on equal timestamps. */
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
        const localTs = Date.parse(existing.updatedAt || '') || 0
        const remoteTs = Date.parse(nb.updatedAt || '') || 0
        if (remoteTs > localTs) {
            map.set(nb.id, { ...existing, ...nb })
        }
    }

    return Array.from(map.values()).sort(
        (a, b) => (Date.parse(b.updatedAt || '') || 0) - (Date.parse(a.updatedAt || '') || 0)
    )
}
