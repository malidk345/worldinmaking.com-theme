/**
 * Browser helper for workspace chat ↔ Supabase sync.
 * Failures are silent: localStorage remains the offline cache.
 */
import type { Chat } from '../components/ClaudeWorkspaceChat/types'

const OWNER_KEY_STORAGE = 'wim_chat_owner_key'

export function getChatOwnerKey(): string {
    if (typeof window === 'undefined') return 'server'
    try {
        const authUserId = localStorage.getItem('wim_auth_user_id')
        if (authUserId && authUserId.length >= 8) return authUserId
        let key = localStorage.getItem(OWNER_KEY_STORAGE)
        if (!key || key.length < 8) {
            key =
                typeof crypto !== 'undefined' && crypto.randomUUID
                    ? crypto.randomUUID()
                    : `owner_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
            localStorage.setItem(OWNER_KEY_STORAGE, key)
        }
        return key
    } catch {
        return `owner_fallback_${Date.now()}`
    }
}

export function chatAuthHeaders(jsonBody = false): HeadersInit {
    const ownerKey = getChatOwnerKey()
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

export async function pullChatsFromRemote(): Promise<Chat[] | null> {
    if (typeof window === 'undefined') return null
    const ownerKey = getChatOwnerKey()
    try {
        const res = await fetch(`/api/chats?owner_key=${encodeURIComponent(ownerKey)}`, {
            method: 'GET',
            headers: chatAuthHeaders(),
        })
        if (res.status === 503) return null
        if (!res.ok) return null
        const body = await parseJson<{ chats?: Chat[] }>(res)
        return Array.isArray(body?.chats) ? body.chats : []
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

export function mergeChats(local: Chat[], remote: Chat[]): Chat[] {
    const byId = new Map<string, Chat>()
    for (const chat of local) byId.set(chat.id, chat)
    for (const chat of remote) {
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
