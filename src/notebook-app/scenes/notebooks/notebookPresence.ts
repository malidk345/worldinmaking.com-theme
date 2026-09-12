import { useCallback, useEffect, useRef, useState } from 'react'

import { getAuthUserId } from '../../../lib/wim-identity'
import { supabase, isSupabaseConfigured } from '../../../lib/supabase'
import type { NotebookPerson } from '../../../lib/notebook-actor'
import type { MarkdownNotebookCaretPosition, RemoteNotebookCaret } from '../../lib/components/MarkdownNotebook'

const PRESENCE_ID_KEY = 'wim_notebook_presence_id'
const PRESENCE_COLORS = ['#1d4d4f', '#38817a', '#c17f3a', '#8b3a3a', '#3d5a80', '#5c4d7a']

export type NotebookPresencePerson = {
    clientId: string
    userId?: string
    name: string
    color: string
    avatarUrl?: string
}

type PresencePayload = {
    clientId: string
    userId?: string
    userName: string
    color: string
    avatarUrl?: string
    version?: number
    position?: MarkdownNotebookCaretPosition | null
}

export function caretColorForClient(clientId: string): string {
    let hash = 0
    for (let i = 0; i < clientId.length; i++) {
        hash = (hash * 31 + clientId.charCodeAt(i)) >>> 0
    }
    return PRESENCE_COLORS[hash % PRESENCE_COLORS.length]
}

export function getNotebookPresenceClientId(): string {
    if (typeof window === 'undefined') return 'server'
    try {
        let id = window.sessionStorage.getItem(PRESENCE_ID_KEY)
        if (!id) {
            id =
                typeof crypto !== 'undefined' && crypto.randomUUID
                    ? crypto.randomUUID()
                    : `presence_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
            window.sessionStorage.setItem(PRESENCE_ID_KEY, id)
        }
        return id
    } catch {
        return `presence_${Date.now()}`
    }
}

export function displayNameForActor(actor: NotebookPerson | null | undefined): string {
    if (!actor) return 'Someone'
    return [actor.first_name, actor.last_name].filter(Boolean).join(' ') || actor.username || actor.email || 'Someone'
}

export function presenceStateToCarets(
    state: Record<string, PresencePayload[] | undefined>,
    selfId: string
): { carets: RemoteNotebookCaret[]; people: NotebookPresencePerson[] } {
    const carets: RemoteNotebookCaret[] = []
    const people: NotebookPresencePerson[] = []
    for (const [key, metas] of Object.entries(state)) {
        const payload = metas?.[0]
        if (!payload || payload.clientId === selfId || key === selfId) continue
        const clientId = payload.clientId || key
        const color = payload.color || caretColorForClient(clientId)
        const name = payload.userName || 'Someone'
        people.push({ clientId, userId: payload.userId, name, color, avatarUrl: payload.avatarUrl })
        if (payload.position && typeof payload.position.nodeIndex === 'number') {
            carets.push({
                clientId,
                userName: name,
                color,
                position: payload.position,
                version: payload.version,
            })
        }
    }
    return { carets, people }
}

export function useNotebookPresence({
    notebookId,
    version,
    actor,
}: {
    notebookId?: string
    version?: number
    actor: NotebookPerson | null
}): {
    carets: RemoteNotebookCaret[]
    people: NotebookPresencePerson[]
    publishCaret: (position: MarkdownNotebookCaretPosition | null) => void
    clientId: string
} {
    const clientId = getNotebookPresenceClientId()
    const [carets, setCarets] = useState<RemoteNotebookCaret[]>([])
    const [people, setPeople] = useState<NotebookPresencePerson[]>([])
    const positionRef = useRef<MarkdownNotebookCaretPosition | null>(null)
    const caretTimerRef = useRef<number>(0)
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
    const versionRef = useRef(version)
    versionRef.current = version
    const actorRef = useRef(actor)
    actorRef.current = actor

    const publishNow = useCallback(async () => {
        const channel = channelRef.current
        if (!channel || typeof (channel as { track?: unknown }).track !== 'function') return
        const payload: PresencePayload = {
            clientId,
            userId: getAuthUserId() || undefined,
            userName: displayNameForActor(actorRef.current),
            color: caretColorForClient(clientId),
            avatarUrl: actorRef.current?.avatar_url,
            version: versionRef.current,
            position: positionRef.current,
        }
        try {
            await (channel as { track: (next: PresencePayload) => Promise<unknown> }).track(payload)
        } catch {
            /* presence is best-effort */
        }
    }, [clientId])

    const publishNowRef = useRef(publishNow)
    publishNowRef.current = publishNow

    useEffect(() => {
        if (!notebookId || !isSupabaseConfigured || !getAuthUserId()) {
            setCarets((prev) => (prev.length === 0 ? prev : []))
            setPeople((prev) => (prev.length === 0 ? prev : []))
            return
        }

        let isCancelled = false
        const topic = `wim-notebook-presence-${notebookId}`
        const realtimeTopic = `realtime:${topic}`

        // Clean up any stale existing channel for this topic before recreating
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
            /* best-effort cleanup */
        }

        let channel: ReturnType<typeof supabase.channel> | null = null
        try {
            channel = supabase.channel(topic, {
                config: { presence: { key: clientId } },
            })
            channelRef.current = channel

            const syncFromChannel = () => {
                if (isCancelled || !channel) return
                const raw =
                    typeof (channel as { presenceState?: () => Record<string, PresencePayload[]> }).presenceState ===
                    'function'
                        ? (channel as { presenceState: () => Record<string, PresencePayload[]> }).presenceState()
                        : {}
                const next = presenceStateToCarets(raw, clientId)
                setCarets(next.carets)
                setPeople(next.people)
            }

            const adapter = (channel as unknown as { channelAdapter?: { isJoined?: () => boolean; isJoining?: () => boolean } }).channelAdapter
            const isSubscribedOrJoining = Boolean(adapter?.isJoined?.() || adapter?.isJoining?.())

            if (!isSubscribedOrJoining) {
                channel
                    .on('presence', { event: 'sync' }, syncFromChannel)
                    .on('presence', { event: 'join' }, syncFromChannel)
                    .on('presence', { event: 'leave' }, syncFromChannel)
                    .subscribe((status) => {
                        if (isCancelled) return
                        if (status === 'SUBSCRIBED') void publishNowRef.current()
                    })
            } else {
                syncFromChannel()
                void publishNowRef.current()
            }
        } catch (err) {
            console.warn('[notebookPresence] Channel initialization failed, running offline:', err)
            channel = null
            channelRef.current = null
        }

        return () => {
            isCancelled = true
            if (caretTimerRef.current) window.clearTimeout(caretTimerRef.current)
            caretTimerRef.current = 0
            channelRef.current = null
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
            setCarets([])
            setPeople([])
        }
    }, [notebookId, clientId])

    useEffect(() => {
        if (!notebookId) return
        void publishNow()
    }, [actor?.first_name, actor?.avatar_url, notebookId, publishNow, version])

    const publishCaret = useCallback(
        (position: MarkdownNotebookCaretPosition | null) => {
            positionRef.current = position
            if (caretTimerRef.current) return
            caretTimerRef.current = window.setTimeout(() => {
                caretTimerRef.current = 0
                void publishNow()
            }, 120)
        },
        [publishNow]
    )

    return { carets, people, publishCaret, clientId }
}
