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
import { adoptDeviceCacheToAccount, adoptStringIdLists } from './adopt-device-cache'
import { mergeChats } from './chat-merge'

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

/** Move this device's guest chat cache onto the signed-in account key. */
export function adoptGuestChatsIntoAccount(): void {
    if (typeof window === 'undefined') return
    const authId = getAuthUserId()
    if (!authId) return
    const deviceKey = getDeviceOwnerKey(DEVICE_CHAT_OWNER_KEY)
    const accountKey = namespacedStorageKey(CHAT_CACHE_BASE, authId)
    adoptDeviceCacheToAccount({
        storage: window.localStorage,
        accountKey,
        sourceKeys: [
            namespacedStorageKey(CHAT_CACHE_BASE, deviceKey),
            CHAT_CACHE_BASE,
            'claude_workspace_chats_v6',
            'claude_workspace_chats_v4',
        ],
        merge: (fromSources, existing) => mergeChats(fromSources as Chat[], existing as Chat[]),
    })
    adoptStringIdLists({
        storage: window.localStorage,
        accountKey: namespacedStorageKey(CHAT_DELETED_BASE, authId),
        sourceKeys: [namespacedStorageKey(CHAT_DELETED_BASE, deviceKey), CHAT_DELETED_BASE],
    })
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
    // BYOK keys must not ride on shared auth headers (CDN/access-log leak).
    const headers: Record<string, string> = {
        Accept: 'application/json',
        'X-WIM-Owner-Key': ownerKey,
    }
    if (jsonBody) headers['Content-Type'] = 'application/json'
    const jwt = getStoredJwt()
    if (jwt) headers.Authorization = `Bearer ${jwt}`
    return headers
}

function jwtExpirySec(token: string): number | null {
    try {
        const payload = token.split('.')[1]
        if (!payload) return null
        const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
        return typeof json?.exp === 'number' ? json.exp : null
    } catch {
        return null
    }
}

/** Prefer the cached JWT when it still has >2 minutes left — avoids getSession/refresh on every save. */
export async function chatAuthHeadersFresh(jsonBody = false, ownerKey = getChatOwnerKey()): Promise<HeadersInit> {
    const headers: Record<string, string> = {
        Accept: 'application/json',
        'X-WIM-Owner-Key': ownerKey,
    }
    if (jsonBody) headers['Content-Type'] = 'application/json'

    try {
        let token = getStoredJwt()
        const nowSec = Math.floor(Date.now() / 1000)
        const cachedExp = token ? jwtExpirySec(token) : null
        const cachedStillGood = Boolean(token && token.length >= 20 && cachedExp && cachedExp > nowSec + 120)

        if (!cachedStillGood && isSupabaseConfigured) {
            try {
                const { data } = await supabase.auth.getSession()
                let session = data?.session
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
    adoptGuestChatsIntoAccount()
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
        // List is metadata-only (messages may be empty stubs).
        return {
            chats: Array.isArray(body?.chats) ? body.chats : [],
            deletedIds: Array.isArray(body?.deleted_ids) ? body.deleted_ids : [],
        }
    } catch {
        return null
    }
}

/** Load one chat with full messages (active/open chat path). */
export async function pullChatByIdFromRemote(chatId: string): Promise<Chat | null> {
    if (typeof window === 'undefined' || !chatId) return null
    try {
        const res = await fetch(
            `/api/chats/${encodeURIComponent(chatId)}?owner_key=${encodeURIComponent(getChatOwnerKey())}`,
            {
                method: 'GET',
                headers: await chatAuthHeadersFresh(),
            }
        )
        if (res.status === 503 || res.status === 404) return null
        if (!res.ok) return null
        const body = await parseJson<{ chat?: Chat }>(res)
        return body?.chat || null
    } catch {
        return null
    }
}

type PushOptions = { keepalive?: boolean }

const pushInFlight = new Map<string, Promise<Chat | null>>()
const pushQueued = new Map<string, Chat>()

async function postChatToRemote(chat: Chat, opts?: PushOptions): Promise<Chat | null> {
    if (readLocalDeletedChatIds().includes(chat.id)) return null
    try {
        // pagehide/unmount keepalive cannot await a session refresh — use sync headers there.
        const headers = opts?.keepalive ? chatAuthHeaders(true) : await chatAuthHeadersFresh(true)
        const res = await fetch('/api/chats', {
            method: 'POST',
            headers,
            body: JSON.stringify({ owner_key: getChatOwnerKey(), chat }),
            keepalive: Boolean(opts?.keepalive),
        })
        if (res.status === 410) {
            rememberDeletedChatId(chat.id)
            return null
        }
        if (!res.ok) return null
        if (opts?.keepalive) {
            markChatPushed(chat)
            return chat
        }
        const body = await parseJson<{ chat?: Chat }>(res)
        const saved = body?.chat || null
        if (saved) markChatPushed(saved)
        else markChatPushed(chat)
        return saved
    } catch {
        return null
    }
}

/**
 * Upsert one chat to Supabase. Concurrent pushes for the same id coalesce to the
 * latest snapshot so a close/unmount flush cannot lose the newest messages.
 */
export async function pushChatToRemote(chat: Chat, opts?: PushOptions): Promise<Chat | null> {
    if (typeof window === 'undefined') return null
    if (readLocalDeletedChatIds().includes(chat.id)) return null

    if (opts?.keepalive) {
        return postChatToRemote(chat, opts)
    }

    const existing = pushInFlight.get(chat.id)
    if (existing) {
        pushQueued.set(chat.id, chat)
        return existing
    }

    const run = (async () => {
        let current: Chat | undefined = chat
        let last: Chat | null = null
        while (current) {
            pushQueued.delete(chat.id)
            last = await postChatToRemote(current)
            current = pushQueued.get(chat.id)
        }
        return last
    })()

    pushInFlight.set(chat.id, run)
    try {
        return await run
    } finally {
        pushInFlight.delete(chat.id)
    }
}

const lastPushedUpdatedAt = new Map<string, string>()

export function markChatPushed(chat: Pick<Chat, 'id' | 'updatedAt'>): void {
    if (!chat?.id || !chat.updatedAt) return
    lastPushedUpdatedAt.set(chat.id, chat.updatedAt)
}

function chatLooksDirty(chat: Chat): boolean {
    if (!chat?.id) return false
    if (readLocalDeletedChatIds().includes(chat.id)) return false
    const hasContent = (chat.messages || []).some(
        (message) => !message.isStreaming && String(message.content || '').trim().length > 0
    )
    if (!hasContent) return false
    const last = lastPushedUpdatedAt.get(chat.id)
    return !last || last !== chat.updatedAt
}

/**
 * Push local chats that have content not yet mirrored remotely.
 * Caps work so focus/visibility ticks stay cheap (multi-device catch-up).
 */
export async function pushDirtyLocalChats(chats: Chat[], limit = 6): Promise<number> {
    if (typeof window === 'undefined') return 0
    const dirty = chats
        .filter(chatLooksDirty)
        .sort((a, b) => (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0))
        .slice(0, Math.max(1, limit))
    let pushed = 0
    for (const chat of dirty) {
        const saved = await pushChatToRemote(chat)
        if (saved || chat.updatedAt) {
            markChatPushed(saved || chat)
            pushed += 1
        }
    }
    return pushed
}

/** Best-effort flush for pagehide/unmount — uses fetch keepalive so the browser can finish after teardown. */
export function flushChatToRemoteKeepalive(chat: Chat): void {
    if (typeof window === 'undefined') return
    if (!chat?.id || readLocalDeletedChatIds().includes(chat.id)) return
    void pushChatToRemote(chat, { keepalive: true })
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function subscribeToWorkspaceChats(onChange: (payload?: any) => void, onStatusChange?: (status: string) => void): () => void {
    if (typeof window === 'undefined' || !isSupabaseConfigured) {
        return () => {}
    }
    const userId = getAuthUserId()
    const ownerKey = getChatOwnerKey()
    if (!userId && !ownerKey) return () => {}

    try {
        const topic = `wim-chats-live-${userId || ownerKey}`
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

        let channel = supabase.channel(topic)
        const adapter = (channel as unknown as { channelAdapter?: { isJoined?: () => boolean; isJoining?: () => boolean } }).channelAdapter
        const isSubscribedOrJoining = Boolean(adapter?.isJoined?.() || adapter?.isJoining?.())

        if (!isSubscribedOrJoining) {
            if (userId) {
                channel = channel.on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'wim_chats', filter: `auth_user_id=eq.${userId}` },
                    () => onChange()
                )
            }
            if (ownerKey) {
                channel = channel.on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'wim_chats', filter: `owner_key=eq.${ownerKey}` },
                    () => onChange()
                )
            }
            channel = channel.on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'wim_chat_messages' },
                (payload) => onChange(payload)
            )
            channel.subscribe((status) => {
                if (onStatusChange) onStatusChange(status)
                if (status === 'CHANNEL_ERROR') {
                    console.warn('[chat-remote] realtime channel error, falling back to polling')
                }
            })
        }

        return () => {
            void supabase.removeChannel(channel)
            const rt = (supabase as unknown as { realtime?: { _remove?: (ch: unknown) => void } }).realtime
            if (typeof rt?._remove === 'function') {
                try {
                    rt._remove(channel)
                } catch {
                    /* best-effort */
                }
            }
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
