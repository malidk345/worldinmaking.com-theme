/**
 * `wim_notebook_history_{id}` is keyed by notebook id only (not owner-namespaced).
 * Bodies can leak across logout/account switch. Prefer clear-on-identity (bind/draft
 * class) over renaming every history key in push/pull/trash paths.
 * Same-owner identity events (token refresh) keep history.
 */
import { DEVICE_NOTEBOOK_OWNER_KEY, getActiveOwnerKey, WIM_IDENTITY_EVENT } from './wim-identity'

export const HISTORY_KEY_PREFIX = 'wim_notebook_history_'

let lastHistoryOwnerKey: string | null = null

function listNotebookHistoryStorageKeys(): string[] {
    if (typeof window === 'undefined') return []
    const keys: string[] = []
    try {
        for (let index = 0; index < window.localStorage.length; index++) {
            const key = window.localStorage.key(index)
            if (key && key.startsWith(HISTORY_KEY_PREFIX)) keys.push(key)
        }
    } catch {
        /* private mode */
    }
    return keys
}

export function clearAllNotebookHistoryLeftovers(): void {
    if (typeof window === 'undefined') return
    for (const key of listNotebookHistoryStorageKeys()) {
        try {
            window.localStorage.removeItem(key)
        } catch {
            /* ignore */
        }
    }
}

/** Clear `wim_notebook_history_*` only when notebook owner identity switches. */
export function syncNotebookHistoryForIdentity(): void {
    if (typeof window === 'undefined') return
    const next = getActiveOwnerKey(DEVICE_NOTEBOOK_OWNER_KEY)
    if (lastHistoryOwnerKey !== null && lastHistoryOwnerKey !== next) {
        clearAllNotebookHistoryLeftovers()
    }
    lastHistoryOwnerKey = next
}

function installNotebookHistoryIdentityGuard(): void {
    if (typeof window === 'undefined') return
    if (typeof window.addEventListener !== 'function') return
    const w = window as Window & { __wimNotebookHistoryIdGuard?: boolean }
    if (w.__wimNotebookHistoryIdGuard) return
    w.__wimNotebookHistoryIdGuard = true
    lastHistoryOwnerKey = getActiveOwnerKey(DEVICE_NOTEBOOK_OWNER_KEY)
    window.addEventListener(WIM_IDENTITY_EVENT, () => {
        syncNotebookHistoryForIdentity()
    })
}

if (typeof window !== 'undefined') {
    installNotebookHistoryIdentityGuard()
}

/** Test helper: force guard install after a late window mock. */
export function ensureNotebookHistoryIdentityGuard(): void {
    installNotebookHistoryIdentityGuard()
}
