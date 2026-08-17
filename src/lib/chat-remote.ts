/**
 * Browser helper for workspace chat ↔ Supabase sync.
 * Failures are silent: localStorage remains the offline cache.
 */
import type { Chat } from '../components/ClaudeWorkspaceChat/types'
import {
    DEVICE_CHAT_OWNER_KEY,
    DEVICE_NOTEBOOK_OWNER_KEY,
    getActiveOwnerKey,
    getAuthUserId,
    getDeviceOwnerKey,
    namespacedStorageKey,
} from './wim-identity'

const CHAT_CACHE_BASE = 'claude_workspace_chats_v7'
const CHAT_DELETED_BASE = 'wim_chat_deleted_ids'

export function getChatOwnerKey(): string {
    return getActiveOwnerKey(DEVICE_CHAT_OWNER_KEY)
}

export function getChatStorageKey(): string {
    return namespacedStorageKey(CHAT_CACHE_BASE, getChatOwnerKey())
}

export function getChatDeletedStorageKey(): string {
    return namespacedStorageKey(CHAT_DELETED_BASE, getChatOwnerKey())
}

export function readLocalDeletedChatIds(): string[] {
    if (typeof window === 'undefined') return []
    try {
        const raw = window.localStorage.getItem(getChatDeletedStorageKey())
        const parsed = raw ? JSON.parse(raw) : []
        return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []
    } catch {
        return []
    }
}

export function readLocalChats<T>(fallback: T): T {
    if (typeof window === 'undefined') return fallback
    try {
        const namespaced = window.localStorage.getItem(getChatStorageKey())
        if (namespaced) return JSON.parse(namespaced) as T
    } catch {
        /* ignore */
    }
    // Never copy a previous guest/account cache into a signed-in user.
    if (getAuthUserId()) return fallback
    const keys = [CHAT_CACHE_BASE, 'claude_workspace_chats_v6', 'claude_workspace_chats_v4']
    for (const key of keys) {
        try {
            const saved = window.localStorage.getItem(key)
            if (!saved) continue
            const parsed = JSON.parse(saved) as T
            if (Array.isArray(parsed)) {
                window.localStorage.setItem(getChatStorageKey(), saved)
            }
            return parsed
        } catch {
            /* keep looking */
        }
    }
    return fallback
}

export function writeLocalChats(chats: Chat[]): void {
    if (typeof window === 'undefined') return
    try {
        window.localStorage.setItem(getChatStorageKey(), JSON.stringify(chats))
    } catch {
        /* quota */
    }
}

export function rememberDeletedChatId(chatId: string): void {
    if (typeof window === 'undefined' || !chatId) return
    const next = Array.from(new Set([...readLocalDeletedChatIds(), chatId]))
    try {
        window.localStorage.setItem(getChatDeletedStorageKey(), JSON.stringify(next.slice(-400)))
    } catch {
        /* ignore quota */
    }
}

export function chatAuthHeaders(jsonBody = false, ownerKey = getChatOwnerKey()): HeadersInit {
    const headers: Record<string, string> = {
        Accept: 'application/json',
        'X-WIM-Owner-Key': ownerKey,
    }
    if (jsonBody) headers['Content-Type'] = 'application/json'
    try {
        const jwt = localStorage.getItem('jwt')
        if (jwt && jwt.length > 20) headers.Authorization = `Bearer ${jwt}`
    } catch {
        /* ignore */
    }
    return headers
}

async function parseJson<T>(res: Response): Promise<T | null> {
    try {
        return (await res.json()) as T
    } catch {
        return null
    }
}

export async function claimDeviceAccountOnLogin(): Promise<boolean> {
    if (typeof window === 'undefined' || !getAuthUserId()) return false
    const keys = Array.from(
        new Set([getDeviceOwnerKey(DEVICE_CHAT_OWNER_KEY), getDeviceOwnerKey(DEVICE_NOTEBOOK_OWNER_KEY)])
    ).filter((key) => key && key !== getAuthUserId())
    if (!keys.length) return false
    try {
        const results = await Promise.all(
            keys.map(async (deviceKey) => {
                const res = await fetch('/api/account/claim', {
                    method: 'POST',
                    headers: chatAuthHeaders(true, deviceKey),
                    body: JSON.stringify({ previous_owner_key: deviceKey }),
                })
                return res.ok
            })
        )
        return results.some(Boolean)
    } catch {
        return false
    }
}

export async function pullChatsFromRemote(): Promise<{ chats: Chat[]; deletedIds: string[] } | null> {
    if (typeof window === 'undefined') return null
    const ownerKey = getChatOwnerKey()
    try {
        const res = await fetch(`/api/chats?owner_key=${encodeURIComponent(ownerKey)}`, {
            method: 'GET',
            headers: chatAuthHeaders(),
        })
        if (res.status === 503) return null
        if (!res.ok) return null
        const body = await parseJson<{ chats?: Chat[]; deleted_ids?: string[] }>(res)
        return {
            chats: Array.isArray(body?.chats) ? body.chats : [],
            deletedIds: Array.isArray(body?.deleted_ids) ? body.deleted_ids : [],
        }
    } catch {
        return null
    }
}

export async function pushChatToRemote(chat: Chat): Promise<Chat | null> {
    if (typeof window === 'undefined') return null
    try {
        const res = await fetch('/api/chats', {
            method: 'POST',
            headers: chatAuthHeaders(true),
            body: JSON.stringify({ owner_key: getChatOwnerKey(), chat }),
        })
        if (res.status === 410) {
            rememberDeletedChatId(chat.id)
            return null
        }
        if (!res.ok) return null
        const body = await parseJson<{ chat?: Chat }>(res)
        return body?.chat || null
    } catch {
        return null
    }
}

export async function deleteChatOnRemote(chatId: string): Promise<boolean> {
    if (typeof window === 'undefined') return false
    try {
        const res = await fetch(`/api/chats/${encodeURIComponent(chatId)}?owner_key=${encodeURIComponent(getChatOwnerKey())}`, {
            method: 'DELETE',
            headers: chatAuthHeaders(),
        })
        return res.ok
    } catch {
        return false
    }
}

export async function setRemoteChatShare(chatId: string, enabled: boolean): Promise<Chat | null> {
    if (typeof window === 'undefined') return null
    try {
        const res = await fetch(`/api/chats/${encodeURIComponent(chatId)}`, {
            method: 'PATCH',
            headers: chatAuthHeaders(true),
            body: JSON.stringify({ owner_key: getChatOwnerKey(), share: enabled }),
        })
        if (!res.ok) return null
        const body = await parseJson<{ chat?: Chat }>(res)
        return body?.chat || null
    } catch {
        return null
    }
}

export async function setRemoteMessageLiked(chatId: string, messageId: string, liked: boolean | null): Promise<boolean> {
    if (typeof window === 'undefined') return false
    try {
        const res = await fetch(`/api/chats/${encodeURIComponent(chatId)}`, {
            method: 'PATCH',
            headers: chatAuthHeaders(true),
            body: JSON.stringify({
                owner_key: getChatOwnerKey(),
                messageFeedback: { messageId, liked },
            }),
        })
        return res.ok
    } catch {
        return false
    }
}

export function mergeChats(local: Chat[], remote: Chat[], deletedIds: string[] = []): Chat[] {
    const dead = new Set(deletedIds)
    const byId = new Map<string, Chat>()
    for (const chat of local) {
        if (!dead.has(chat.id)) byId.set(chat.id, chat)
    }
    for (const chat of remote) {
        if (dead.has(chat.id)) continue
        const existing = byId.get(chat.id)
        if (!existing) {
            byId.set(chat.id, chat)
            continue
        }
        const remoteTime = Date.parse(chat.updatedAt) || 0
        const localTime = Date.parse(existing.updatedAt) || 0
        const remoteCount = chat.messages?.length || 0
        const localCount = existing.messages?.length || 0
        if (remoteTime > localTime || (remoteTime === localTime && remoteCount >= localCount)) {
            byId.set(chat.id, {
                ...chat,
                messages: remoteCount > 0 ? chat.messages : existing.messages,
            })
        } else {
            byId.set(chat.id, {
                ...existing,
                shareToken: existing.shareToken || chat.shareToken,
                isShared: existing.isShared || chat.isShared,
            })
        }
    }
    return Array.from(byId.values()).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
}
