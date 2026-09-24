/**
 * Local-first workspace chat cache: IndexedDB primary + localStorage migrate / write-through.
 * Cloud sync stays optional via chat-remote — this module never talks to the network.
 */
import type { Chat } from '../components/ClaudeWorkspaceChat/types'
import { loadChatsLocal, persistChatsLocal } from './indexeddb-storage'
import {
    DEVICE_CHAT_OWNER_KEY,
    getActiveOwnerKey,
    getAuthUserId,
    namespacedStorageKey,
} from './wim-identity'

const CHAT_CACHE_BASE = 'claude_workspace_chats_v7'
const LEGACY_CHAT_KEYS = ['claude_workspace_chats_v7', 'claude_workspace_chats_v6', 'claude_workspace_chats_v4'] as const

function ownerKey(): string {
    return getActiveOwnerKey(DEVICE_CHAT_OWNER_KEY)
}

export function getChatLsKey(): string {
    return namespacedStorageKey(CHAT_CACHE_BASE, ownerKey())
}

function migrateFlagKey(): string {
    return `wim_chats_idb_migrated:${ownerKey()}`
}

export function isChatsIdbMigrated(): boolean {
    if (typeof window === 'undefined') return false
    try {
        return window.localStorage.getItem(migrateFlagKey()) === '1'
    } catch {
        return false
    }
}

export function markChatsIdbMigrated(): void {
    if (typeof window === 'undefined') return
    try {
        window.localStorage.setItem(migrateFlagKey(), '1')
    } catch {
        /* ignore */
    }
}

/** Pure helper: migrate LS → IDB once when IDB is empty. */
export function shouldMigrateLsToIdb(opts: {
    migratedFlag: boolean
    idbCount: number
    lsCount: number
}): boolean {
    if (opts.migratedFlag) return false
    if (opts.idbCount > 0) return false
    return opts.lsCount > 0
}

/** Pure helper: after boot, prefer IDB when it has rows; else LS. */
export function pickChatsForLocalHydrate<T>(idbChats: T[] | null | undefined, lsChats: T[]): T[] {
    if (Array.isArray(idbChats) && idbChats.length > 0) return idbChats
    return Array.isArray(lsChats) ? lsChats : []
}

function parseChatArray(raw: string | null): Chat[] | null {
    if (!raw) return null
    try {
        const parsed = JSON.parse(raw) as unknown
        return Array.isArray(parsed) ? (parsed as Chat[]) : null
    } catch {
        return null
    }
}

/** Sync LS read for first paint (and assistant-world / tests that still poke LS). */
export function readChatsFromLocalStorage<T>(fallback: T): T {
    if (typeof window === 'undefined') return fallback
    try {
        const namespaced = window.localStorage.getItem(getChatLsKey())
        const fromNs = parseChatArray(namespaced)
        if (fromNs) return fromNs as unknown as T
    } catch {
        /* ignore */
    }
    // Never copy a previous guest/account cache into a signed-in user.
    if (getAuthUserId()) return fallback
    for (const key of LEGACY_CHAT_KEYS) {
        try {
            const saved = window.localStorage.getItem(key)
            const parsed = parseChatArray(saved)
            if (!parsed) continue
            try {
                window.localStorage.setItem(getChatLsKey(), saved as string)
            } catch {
                /* quota */
            }
            return parsed as unknown as T
        } catch {
            /* keep looking */
        }
    }
    return fallback
}

/** How many message threads this device keeps in IndexedDB and localStorage. */
export const STORED_CHAT_LIMIT = 3

export type ChatRetainContext = {
    activeId?: string
    notebookId?: string
}

function byUpdatedDesc(a: Chat, b: Chat): number {
    return (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0)
}

function hasMessages(chat: Chat): boolean {
    return Array.isArray(chat.messages) && chat.messages.length > 0
}

/** Chats that must survive the three-thread cap: the open one, a live share, the bound notebook. */
export function protectedChatIds(chats: Chat[], ctx: ChatRetainContext = {}): string[] {
    const ids = new Set<string>()
    if (ctx.activeId) ids.add(ctx.activeId)
    for (const chat of chats) {
        if (chat.isShared) ids.add(chat.id)
    }
    if (ctx.notebookId) {
        let newest: Chat | undefined
        for (const chat of chats) {
            if (chat.notebookId !== ctx.notebookId) continue
            if (!newest || byUpdatedDesc(newest, chat) > 0) newest = chat
        }
        if (newest) ids.add(newest.id)
    }
    return [...ids]
}

/** Newest chats that actually have messages, plus protected threads that fell outside that window. */
export function chatsForStorage(
    chats: Chat[],
    limit = STORED_CHAT_LIMIT,
    protectedIds: readonly string[] = []
): Chat[] {
    const pinned = new Set(protectedIds)
    for (const chat of chats) {
        if (chat.isShared) pinned.add(chat.id)
    }
    const ranked = [...chats].filter(hasMessages).sort(byUpdatedDesc)
    const head = ranked.slice(0, limit)
    const headIds = new Set(head.map((chat) => chat.id))
    const extra = ranked.filter((chat) => pinned.has(chat.id) && !headIds.has(chat.id))
    return [...head, ...extra].sort(byUpdatedDesc)
}

/**
 * Sidebar list: the three newest threads, plus the open draft and any protected chat.
 * Remote list rows often arrive without messages; they still count so a
 * metadata stub is not mistaken for a blank draft and deleted.
 */
export function retainOpenChats(
    chats: Chat[],
    activeId: string,
    limit = STORED_CHAT_LIMIT,
    ctx: ChatRetainContext = {}
): Chat[] {
    const pinned = new Set(protectedChatIds(chats, { ...ctx, activeId: ctx.activeId || activeId }))
    const ranked = [...chats].filter((chat) => !pinned.has(chat.id)).sort(byUpdatedDesc).slice(0, limit)
    const ids = new Set(ranked.map((chat) => chat.id))
    for (const id of pinned) ids.add(id)
    return chats.filter((chat) => ids.has(chat.id)).sort(byUpdatedDesc)
}

/** Short-term LS write-through so sync boot + older readers keep working. */
export function writeChatsToLocalStorage(chats: Chat[]): void {
    if (typeof window === 'undefined') return
    try {
        window.localStorage.setItem(getChatLsKey(), JSON.stringify(chats))
    } catch {
        /* quota */
    }
}

/**
 * Persist chats: IndexedDB is primary; LS write-through for sync cold start.
 * Fire-and-forget IDB — callers that need durability on pagehide should await persistChatsToIdb.
 */
export function writeLocalChatsDual(chats: Chat[], protectedIds: readonly string[] = []): void {
    const kept = chatsForStorage(chats, STORED_CHAT_LIMIT, protectedIds)
    writeChatsToLocalStorage(kept)
    void persistChatsToIdb(kept, protectedIds)
}

export async function persistChatsToIdb(chats: Chat[], protectedIds: readonly string[] = []): Promise<void> {
    if (typeof window === 'undefined') return
    try {
        await persistChatsLocal(chatsForStorage(chats, STORED_CHAT_LIMIT, protectedIds))
        markChatsIdbMigrated()
    } catch {
        /* IDB unavailable — LS write-through already attempted by caller */
    }
}

/**
 * Boot path: load IDB, migrate LS → IDB once if needed, return preferred local list.
 */
export async function hydrateChatsFromLocal(lsFallback: Chat[] = []): Promise<Chat[]> {
    if (typeof window === 'undefined') return lsFallback
    const lsChats = lsFallback.length ? lsFallback : readChatsFromLocalStorage<Chat[]>([])
    let idbChats: Chat[] = []
    try {
        idbChats = (await loadChatsLocal<Chat>()) || []
    } catch {
        idbChats = []
    }

    if (
        shouldMigrateLsToIdb({
            migratedFlag: isChatsIdbMigrated(),
            idbCount: idbChats.length,
            lsCount: lsChats.length,
        })
    ) {
        await persistChatsToIdb(lsChats)
        return lsChats
    }

    // Prefer IDB once populated; keep LS write-through in sync when IDB wins.
    const preferred = pickChatsForLocalHydrate(idbChats, lsChats)
    if (idbChats.length > 0) {
        markChatsIdbMigrated()
        // Soft write-through so sync readers see IDB truth without wiping if LS was empty only.
        if (preferred === idbChats) writeChatsToLocalStorage(idbChats)
    }
    return preferred
}

/** Recently pushed chat ids — suppress self-echo realtime hydrate for the active thread. */
const recentSelfPushAt = new Map<string, number>()
const SELF_ECHO_WINDOW_MS = 2800

export function noteSelfChatPush(chatId: string): void {
    if (!chatId) return
    recentSelfPushAt.set(chatId, Date.now())
}

export function shouldSuppressSelfEchoHydrate(chatId: string, now = Date.now(), windowMs = SELF_ECHO_WINDOW_MS): boolean {
    if (!chatId) return false
    const at = recentSelfPushAt.get(chatId)
    if (!at) return false
    if (now - at > windowMs) {
        recentSelfPushAt.delete(chatId)
        return false
    }
    return true
}

/** Test helper */
export function _resetSelfEchoForTests(): void {
    recentSelfPushAt.clear()
}
