/**
 * Background Supabase sync for notebooks.
 * Never blocks the editor — failures are silent (localStorage remains source of truth).
 */
import { supabase, isSupabaseConfigured } from '../../../lib/supabase'
import { DEVICE_NOTEBOOK_OWNER_KEY, getActiveOwnerKey, getAuthUserId, getDeviceOwnerKey, namespacedStorageKey } from '../../../lib/wim-identity'
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

export function forgetDeletedNotebookId(id: string): void {
    if (typeof window === 'undefined' || !id) return
    const next = readLocalDeletedNotebookIds().filter((entry) => entry !== id)
    try {
        window.localStorage.setItem(getNotebookDeletedStorageKey(), JSON.stringify(next))
    } catch {
        /* ignore */
    }
}

/** Headers required by /api/notebooks authz (TSK-19). */
function notebookAuthHeaders(ownerKey: string, jsonBody = false): HeadersInit {
    const headers: Record<string, string> = {
        Accept: 'application/json',
        'X-WIM-Owner-Key': ownerKey,
        'X-WIM-Device-Key': getDeviceOwnerKey(DEVICE_NOTEBOOK_OWNER_KEY),
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

export async function notebookAuthHeadersFresh(ownerKey?: string, jsonBody = false): Promise<HeadersInit> {
    try {
        const { supabase, isSupabaseConfigured } = await import('../../../lib/supabase')
        if (isSupabaseConfigured) {
            try {
                const { data } = await supabase.auth.getSession()
                let session = data?.session

                const nowSec = Math.floor(Date.now() / 1000)
                const isExpiringSoon = session?.expires_at ? session.expires_at < nowSec + 120 : false

                if (!session || isExpiringSoon) {
                    const refreshed = await supabase.auth.refreshSession()
                    if (refreshed.data?.session) {
                        session = refreshed.data.session
                    }
                }

                if (session?.access_token) {
                    localStorage.setItem('jwt', session.access_token)
                    if (session.user?.id) {
                        localStorage.setItem('wim_auth_user_id', session.user.id)
                    }
                }
            } catch {
                /* fallback to cached token */
            }
        }
    } catch {
        /* keep cached headers */
    }

    const resolvedOwner = getOrCreateOwnerKey() || ownerKey || ''
    const headers = { ...(notebookAuthHeaders(resolvedOwner, jsonBody) as Record<string, string>) }
    try {
        const { getStoredJwt } = await import('../../../lib/chat-remote')
        const token = getStoredJwt()
        if (token && token.length >= 20) {
            headers.Authorization = `Bearer ${token}`
        }
    } catch {
        /* keep cached token */
    }
    return headers
}

type ListResponse = { notebooks: StoredNotebook[]; deleted_ids?: string[] }
type OneResponse = { notebook: StoredNotebook; history?: NotebookVersion[] }
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
    includeContent?: boolean
}): Promise<{ notebooks: StoredNotebook[]; deletedIds: string[] } | null> {
    if (typeof window === 'undefined') return null
    const now = Date.now()
    if (!options?.force && now - lastPullAt < PULL_MIN_INTERVAL_MS && remoteAvailable === false) {
        return null
    }
    lastPullAt = now

    const headers = await notebookAuthHeadersFresh(getOrCreateOwnerKey())
    const ownerKey = getOrCreateOwnerKey()
    try {
        const params = new URLSearchParams({ owner_key: ownerKey })
        if (options?.includeContent) params.set('include', 'content')
        const res = await fetch(`/api/notebooks?${params.toString()}`, {
            method: 'GET',
            headers,
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
    const headers = await notebookAuthHeadersFresh(getOrCreateOwnerKey())
    const ownerKey = getOrCreateOwnerKey()
    try {
        const res = await fetch(
            `/api/notebooks/${encodeURIComponent(id)}?owner_key=${encodeURIComponent(ownerKey)}`,
            { method: 'GET', headers }
        )
        if (!res.ok) return null
        const body = await parseJson<OneResponse>(res)
        return body?.notebook ?? null
    } catch {
        return null
    }
}

export async function pullNotebookHistory(id: string): Promise<NotebookVersion[] | null> {
    if (typeof window === 'undefined' || !id) return null
    const headers = await notebookAuthHeadersFresh(getOrCreateOwnerKey())
    const ownerKey = getOrCreateOwnerKey()
    try {
        const res = await fetch(
            `/api/notebooks/${encodeURIComponent(id)}?owner_key=${encodeURIComponent(ownerKey)}&history=1`,
            { method: 'GET', headers }
        )
        if (!res.ok) return null
        const body = await parseJson<OneResponse>(res)
        return Array.isArray(body?.history) ? body.history : null
    } catch {
        return null
    }
}

export type NotebookRemoteWriteResult = {
    ok?: boolean
    conflict?: boolean
    forbidden?: boolean
    gone?: boolean
}

/** Chrome chip for a remote call. Background pulls/bulk sync pass `report: false` so idle GET blips stay quiet. */
export function notebookChromeSyncFromRemoteResult(
    result: unknown,
    options: { report: boolean; remoteAvailable: boolean | null }
): { status: 'ok' | 'error' | 'offline'; message?: string } | null {
    if (!options.report) return null
    if (result && typeof result === 'object') {
        const value = result as NotebookRemoteWriteResult
        if (value.forbidden || value.gone) return null
        if (value.conflict) return { status: 'ok' }
        if (value.ok === false) {
            return chromeFailure(options.remoteAvailable)
        }
    }
    if (result === false) return chromeFailure(options.remoteAvailable)
    return { status: 'ok' }
}

function chromeFailure(remoteAvailable: boolean | null): {
    status: 'error' | 'offline'
    message: string
} {
    if (remoteAvailable === false) {
        return { status: 'offline', message: 'Offline. Notebook is saved on this device.' }
    }
    return { status: 'error', message: 'Cloud sync failed. Notebook is still saved on this device.' }
}

export async function pushNotebookToRemote(
    notebook: StoredNotebook,
    historyEntries?: NotebookVersion[]
): Promise<{ ok: boolean; notebook?: StoredNotebook; conflict?: boolean; forbidden?: boolean; gone?: boolean }> {
    if (typeof window === 'undefined') return { ok: false }
    if (notebook.contentOmitted) return { ok: true }
    const headers = await notebookAuthHeadersFresh(getOrCreateOwnerKey(), true)
    const ownerKey = getOrCreateOwnerKey()
    try {
        const res = await fetch('/api/notebooks', {
            method: 'POST',
            headers,
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
            return { ok: false, gone: true }
        }
        if (res.status === 403) return { ok: false, forbidden: true }
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
    const writable = notebooks.filter((nb) => !nb.contentOmitted)
    if (!writable.length) return true
    const headers = await notebookAuthHeadersFresh(getOrCreateOwnerKey(), true)
    const ownerKey = getOrCreateOwnerKey()
    try {
        const res = await fetch('/api/notebooks', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                owner_key: ownerKey,
                notebooks: writable,
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
    const headers = await notebookAuthHeadersFresh(getOrCreateOwnerKey())
    const ownerKey = getOrCreateOwnerKey()
    try {
        const res = await fetch(
            `/api/notebooks/${encodeURIComponent(id)}?owner_key=${encodeURIComponent(ownerKey)}`,
            { method: 'DELETE', headers }
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
}): { adopt: boolean; applyContent: boolean; applyTitle: boolean; applyRemoteBase: boolean } {
    if (!shouldAdoptRemoteNotebook(input.current, input.latest)) {
        return { adopt: false, applyContent: false, applyTitle: false, applyRemoteBase: false }
    }
    const currentTs = Date.parse(input.current.updatedAt || '') || 0
    const latestTs = Date.parse(input.latest.updatedAt || '') || 0
    const latestIsOlderThanLocal = latestTs > 0 && currentTs > 0 && latestTs < currentTs

    const dirtyContent = input.draftContent !== input.current.content
    const latestIsLastSave = input.latest.content === input.current.content
    const latestIsDraft = input.latest.content === input.draftContent
    // Own save / version echo: the draft already continues from this body. Feeding it back
    // as remoteValue makes the editor merge a stale ancestor and can rewind keystrokes or deletions.
    const latestLooksLikeRewind =
        dirtyContent &&
        ((input.latest.content.length < input.draftContent.length &&
            input.draftContent.startsWith(input.latest.content)) ||
        (input.latest.content.length > input.draftContent.length &&
            (input.latest.content.startsWith(input.draftContent) ||
                input.latest.content.includes(input.draftContent))))
    return {
        adopt: !latestIsOlderThanLocal,
        applyContent: !dirtyContent && !latestIsOlderThanLocal,
        applyTitle: input.draftTitle === input.current.title,
        applyRemoteBase: !latestIsOlderThanLocal && (latestIsDraft || (!latestIsLastSave && !latestLooksLikeRewind)),
    }
}

export function subscribeToWorkspaceNotebooks(onChange: () => void): () => void {
    if (typeof window === 'undefined' || !isSupabaseConfigured) {
        return () => {}
    }

    try {
        const userId = getAuthUserId()
        const ownerKey = getOrCreateOwnerKey()
        if (!userId && !ownerKey) return () => {}

        const topic = `wim-notebooks-live-${userId || ownerKey}`
        const realtimeTopic = `realtime:${topic}`

        try {
            const getChannels = (supabase as unknown as { getChannels?: () => Array<{ topic?: string }> }).getChannels
            const existingList = typeof getChannels === 'function' ? getChannels.call(supabase) : []
            const existing = existingList?.find?.((c) => c?.topic === realtimeTopic || c?.topic === topic)
            if (existing) {
                void supabase.removeChannel(existing as any)
                const rt = (supabase as unknown as { realtime?: { _remove?: (ch: unknown) => void } }).realtime
                if (typeof rt?._remove === 'function') {
                    rt._remove(existing)
                }
            }
        } catch {
            /* best-effort */
        }

        let channel: ReturnType<typeof supabase.channel> | null = null
        try {
            channel = supabase.channel(topic)
            const adapter = (channel as unknown as { channelAdapter?: { isJoined?: () => boolean; isJoining?: () => boolean } }).channelAdapter
            const isSubscribedOrJoining = Boolean(adapter?.isJoined?.() || adapter?.isJoining?.())

            if (!isSubscribedOrJoining) {
                if (userId) {
                    try {
                        channel = channel.on(
                            'postgres_changes',
                            { event: '*', schema: 'public', table: 'wim_notebooks', filter: `auth_user_id=eq.${userId}` },
                            () => onChange()
                        )
                    } catch {
                        /* ignore */
                    }
                }
                if (ownerKey) {
                    try {
                        channel = channel.on(
                            'postgres_changes',
                            { event: '*', schema: 'public', table: 'wim_notebooks', filter: `owner_key=eq.${ownerKey}` },
                            () => onChange()
                        )
                    } catch {
                        /* ignore */
                    }
                }
                try {
                    channel.subscribe()
                } catch {
                    /* ignore */
                }
            }
        } catch (err) {
            console.warn('[notebookRemote] channel setup failed:', err)
            channel = null
        }

        return () => {
            if (channel) {
                try {
                    void supabase.removeChannel(channel)
                    const rt = (supabase as unknown as { realtime?: { _remove?: (ch: unknown) => void } }).realtime
                    if (typeof rt?._remove === 'function') {
                        rt._remove(channel)
                    }
                } catch {
                    /* best-effort */
                }
            }
        }
    } catch (err) {
        console.warn('[notebookRemote] failed to subscribe to workspace notebooks:', err)
        return () => {}
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
    const remoteSlim = remote.contentOmitted === true
    if (remoteVersion < localVersion) return local
    if (remoteVersion === localVersion) {
        const localTs = Date.parse(local.updatedAt || '') || 0
        const remoteTs = Date.parse(remote.updatedAt || '') || 0
        if (remoteTs <= localTs) return local
    }
    if (remoteSlim) {
        const keep = local.content || ''
        return {
            ...local,
            ...remote,
            content: keep,
            contentOmitted: !keep,
            preview: remote.preview || local.preview,
        }
    }
    return { ...local, ...remote }
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
