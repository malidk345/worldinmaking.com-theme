/**
 * Browser helper for workspace chat ↔ Supabase sync.
 * Failures are silent: localStorage remains the offline cache.
 */
import type { Chat } from '../components/ClaudeWorkspaceChat/types'
import { supabase, isSupabaseConfigured } from './supabase'
import {
    DEVICE_CHAT_OWNER_KEY,
    DEVICE_NOTEBOOK_OWNER_KEY,
    AUTH_USER_ID_KEY,
    getActiveOwnerKey,
    getAuthUserId,
    getDeviceOwnerKey,
    namespacedStorageKey,
} from './wim-identity'

export { mergeChats, mergeMessages } from './chat-merge'

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

import { getActiveByokHeaders } from './byok-vault'

export function getStoredJwt(): string | null {
    if (typeof window === 'undefined') return null
    try {
        let jwt = localStorage.getItem('jwt')
        if (jwt && jwt.length >= 20) return jwt

        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i)
            if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) {
                const raw = localStorage.getItem(k)
                if (raw) {
                    try {
                        const parsed = JSON.parse(raw)
                        jwt = parsed?.access_token || parsed?.currentSession?.access_token || null
                        const uid = parsed?.user?.id || parsed?.currentSession?.user?.id
                        if (jwt) {
                            localStorage.setItem('jwt', jwt)
                            if (uid) localStorage.setItem(AUTH_USER_ID_KEY, uid)
                            return jwt
                        }
                    } catch {
                        /* ignore */
                    }
                }
            }
        }
        return null
    } catch {
        return null
    }
}

export function chatAuthHeaders(jsonBody = false, ownerKey = getChatOwnerKey()): HeadersInit {
    const byokHeaders = getActiveByokHeaders()
    const headers: Record<string, string> = {
        Accept: 'application/json',
        'X-WIM-Owner-Key': ownerKey,
        ...byokHeaders,
    }
    if (jsonBody) headers['Content-Type'] = 'application/json'
    const jwt = getStoredJwt()
    if (jwt) headers.Authorization = `Bearer ${jwt}`
    return headers
}

export async function chatAuthHeadersFresh(jsonBody = false, ownerKey = getChatOwnerKey()): Promise<HeadersInit> {
    const headers: Record<string, string> = {
        Accept: 'application/json',
        'X-WIM-Owner-Key': ownerKey,
        ...getActiveByokHeaders(),
    }
    if (jsonBody) headers['Content-Type'] = 'application/json'

    try {
        let token = getStoredJwt()

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
                    token = session.access_token
                    localStorage.setItem('jwt', token)
                    if (session.user?.id) {
                        localStorage.setItem(AUTH_USER_ID_KEY, session.user.id)
                    }
                }
            } catch {
                /* fallback to cached token */
            }
        }

        if (token && token.length >= 20) {
            headers.Authorization = `Bearer ${token}`
        }
    } catch {
        const fallbackJwt = getStoredJwt()
        if (fallbackJwt && fallbackJwt.length >= 20) {
            headers.Authorization = `Bearer ${fallbackJwt}`
        }
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
                    headers: await chatAuthHeadersFresh(true, deviceKey),
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
            headers: await chatAuthHeadersFresh(),
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
    if (readLocalDeletedChatIds().includes(chat.id)) return null
    try {
        const res = await fetch('/api/chats', {
            method: 'POST',
            headers: await chatAuthHeadersFresh(true),
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
            headers: await chatAuthHeadersFresh(),
        })
        return res.ok || res.status === 404
    } catch {
        return false
    }
}

export async function setRemoteChatShare(chatId: string, enabled: boolean): Promise<Chat | null> {
    if (typeof window === 'undefined') return null
    try {
        const res = await fetch(`/api/chats/${encodeURIComponent(chatId)}`, {
            method: 'PATCH',
            headers: await chatAuthHeadersFresh(true),
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
            headers: await chatAuthHeadersFresh(true),
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

export function subscribeToWorkspaceChats(onChange: () => void): () => void {
    if (typeof window === 'undefined' || !isSupabaseConfigured) {
        return () => {}
    }
    const userId = getAuthUserId()
    if (!userId) return () => {}

    try {
        const channel = supabase
            .channel(`wim-chats-live-${userId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'wim_chats', filter: `owner_id=eq.${userId}` }, () => onChange())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'wim_chat_messages' }, () => onChange())
            .subscribe((status) => {
                if (status === 'CHANNEL_ERROR') {
                    console.warn('[chat-remote] realtime channel error, falling back to polling')
                }
            })
        return () => {
            void supabase.removeChannel(channel)
        }
    } catch (err) {
        console.warn('[chat-remote] realtime subscription failed:', err)
        return () => {}
    }
}

export function startWorkspaceChatPolling(onTick: () => void, intervalMs = 12000): () => void {
    if (typeof window === 'undefined') return () => {}
    let timer = window.setInterval(() => {
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
