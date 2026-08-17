import { useCallback, useEffect, useRef, useState } from 'react'

import { getAuthUserId } from '../../../lib/wim-identity'
import { supabase, isSupabaseConfigured } from '../../../lib/supabase'
import type { NotebookPerson } from '../../../lib/notebook-actor'
import type { MarkdownNotebookCaretPosition, RemoteNotebookCaret } from '../../lib/components/MarkdownNotebook'

const PRESENCE_ID_KEY = 'wim_notebook_presence_id'
const PRESENCE_COLORS = ['#1d4d4f', '#38817a', '#c17f3a', '#8b3a3a', '#3d5a80', '#5c4d7a']

export type NotebookPresencePerson = {
    clientId: string
    name: string
    color: string
    avatarUrl?: string
}

type PresencePayload = {
    clientId: string
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
        people.push({ clientId, name, color, avatarUrl: payload.avatarUrl })
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
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
    const versionRef = useRef(version)
    versionRef.current = version

    const publishNow = useCallback(async () => {
        const channel = channelRef.current
        if (!channel || typeof (channel as { track?: unknown }).track !== 'function') return
        const payload: PresencePayload = {
            clientId,
            userName: displayNameForActor(actor),
            color: caretColorForClient(clientId),
            avatarUrl: actor?.avatar_url,
            version: versionRef.current,
            position: positionRef.current,
        }
        try {
            await (channel as { track: (next: PresencePayload) => Promise<unknown> }).track(payload)
        } catch {
            /* presence is best-effort */
        }
    }, [actor, clientId])

    useEffect(() => {
        if (!notebookId || !isSupabaseConfigured || !getAuthUserId()) {
            setCarets([])
            setPeople([])
            return
        }

        const channel = supabase.channel(`wim-notebook-presence-${notebookId}`, {
            config: { presence: { key: clientId } },
        })
        channelRef.current = channel

        const syncFromChannel = () => {
            const raw =
                typeof (channel as { presenceState?: () => Record<string, PresencePayload[]> }).presenceState ===
                'function'
                    ? (channel as { presenceState: () => Record<string, PresencePayload[]> }).presenceState()
                    : {}
            const next = presenceStateToCarets(raw, clientId)
            setCarets(next.carets)
            setPeople(next.people)
        }

        channel
            .on('presence', { event: 'sync' }, syncFromChannel)
            .on('presence', { event: 'join' }, syncFromChannel)
            .on('presence', { event: 'leave' }, syncFromChannel)
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') void publishNow()
            })

        return () => {
            channelRef.current = null
            void supabase.removeChannel(channel)
            setCarets([])
            setPeople([])
        }
    }, [notebookId, clientId, publishNow])

    useEffect(() => {
        if (!notebookId) return
        void publishNow()
    }, [actor?.first_name, actor?.avatar_url, notebookId, publishNow, version])

    const publishCaret = useCallback(
        (position: MarkdownNotebookCaretPosition | null) => {
            positionRef.current = position
            void publishNow()
        },
        [publishNow]
    )

    return { carets, people, publishCaret, clientId }
}
