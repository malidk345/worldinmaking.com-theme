/**
 * Owner-namespaced OS archive list (`wim_os_archived_items_v2`).
 * Freeform `note` fields are user content — must not leak across accounts.
 */
import {
    DEVICE_CHAT_OWNER_KEY,
    getActiveOwnerKey,
    getAuthUserId,
    namespacedStorageKey,
} from './wim-identity'

export type ArchivedItemMeta = {
    url: string
    label: string
    archivedAt: string
    note?: string
    category?: string
}

/** Base key — always read/write via `getArchiveStorageKey()` (owner-namespaced). */
export const ARCHIVE_STORAGE_BASE = 'wim_os_archived_items_v2'

export function getArchiveStorageKey(): string {
    return namespacedStorageKey(ARCHIVE_STORAGE_BASE, getActiveOwnerKey(DEVICE_CHAT_OWNER_KEY))
}

function parseArchivedItems(raw: string | null): ArchivedItemMeta[] {
    if (!raw) return []
    try {
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? (parsed as ArchivedItemMeta[]) : []
    } catch {
        return []
    }
}

/** Owner-namespaced archive list. Guest-only legacy migrate from the global base key. */
export function loadArchivedItemsFromStorage(): ArchivedItemMeta[] {
    if (typeof window === 'undefined') return []
    try {
        const fromNs = parseArchivedItems(window.localStorage.getItem(getArchiveStorageKey()))
        if (fromNs.length > 0) return fromNs
        // Never copy a previous guest/account archive into a signed-in user.
        if (getAuthUserId()) return []
        const legacy = parseArchivedItems(window.localStorage.getItem(ARCHIVE_STORAGE_BASE))
        if (legacy.length > 0) {
            try {
                window.localStorage.setItem(getArchiveStorageKey(), JSON.stringify(legacy))
            } catch {
                /* quota */
            }
            return legacy
        }
    } catch {
        /* ignore */
    }
    return []
}

export function saveArchivedItemsToStorage(items: ArchivedItemMeta[]): void {
    if (typeof window === 'undefined') return
    try {
        window.localStorage.setItem(getArchiveStorageKey(), JSON.stringify(items))
    } catch (e) {
        console.error('[archive-storage] Failed to save archived items', e)
    }
}
