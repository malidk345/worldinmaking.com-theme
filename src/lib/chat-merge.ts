import type { Chat, Message } from '../components/ClaudeWorkspaceChat/types'
import { resolveHumanTurn } from './human-turn-ux'

export function mergeMessages(left: Message[] = [], right: Message[] = [], preferRight: boolean = false): Message[] {
    const byId = new Map<string, Message>()
    for (const message of left) {
        if (message?.id) byId.set(message.id, message)
    }
    for (const message of right) {
        if (!message?.id) continue
        const existing = byId.get(message.id)
        if (!existing) {
            byId.set(message.id, message)
            continue
        }
        let merged: Message
        if (!existing.isTypingDone) {
            merged = { ...message, ...existing }
        } else if (!message.isTypingDone) {
            merged = { ...existing, ...message }
        } else {
            merged = preferRight ? { ...existing, ...message } : { ...message, ...existing }
        }
        // Dual-device: never let a stale remote pending interrupt revive after local answer/run
        merged = {
            ...merged,
            humanTurn: resolveHumanTurn(existing.humanTurn, message.humanTurn, preferRight),
        }
        byId.set(message.id, merged)
    }

    const seen = new Set<string>()
    const ordered: Message[] = []
    for (const message of [...left, ...right]) {
        if (!message?.id || seen.has(message.id)) continue
        const next = byId.get(message.id)
        if (!next) continue
        seen.add(message.id)
        ordered.push(next)
    }
    return ordered
}

function hasPersistableMessages(chat: Chat | undefined): boolean {
    return Boolean(
        chat?.messages?.some(
            (message) => !message.isStreaming && String(message.content || '').trim().length > 0
        )
    )
}

function hasLocalThreadContent(chat: Chat | undefined): boolean {
    if (!chat?.messages?.length) return false
    return (
        hasPersistableMessages(chat) ||
        chat.messages.some((message) => Boolean(message.isStreaming) || String(message.content || '').trim().length > 0)
    )
}

export type OpenThreadGuard = 'merge-prefer-local' | 'merge-prefer-remote'

/**
 * Open-thread remote hydrate guard.
 * Never replace an open/local thread from remote unless remote updatedAt is newer,
 * not mid-stream, and remote is not a metadata stub fighting local messages.
 * Callers should still merge-by-id (never wipe); this only chooses prefer side.
 */
export function guardOpenThreadRemote(
    local: Chat | undefined,
    remote: Chat,
    opts: { midStream?: boolean } = {}
): OpenThreadGuard {
    if (!local) return 'merge-prefer-remote'
    if (opts.midStream) return 'merge-prefer-local'

    const remoteIsStub = !hasPersistableMessages(remote)
    const localHasContent = hasLocalThreadContent(local)
    if (remoteIsStub && localHasContent) return 'merge-prefer-local'

    const remoteTime = Date.parse(remote.updatedAt) || 0
    const localTime = Date.parse(local.updatedAt) || 0
    if (remoteTime > localTime) return 'merge-prefer-remote'
    return 'merge-prefer-local'
}

export type MergeChatsOptions = {
    /** Force prefer-local merge for these chat ids (open thread mid-stream / self-echo soft path). */
    preferLocalIds?: Iterable<string>
}

/**
 * Dual-device chat merge.
 * - Tombstones always win.
 * - Metadata-only remote stubs (empty messages) must not clobber a local copy that
 *   already has messages / notebook bind / agent plan — common after list GET.
 * - Message bodies merge by id; streaming local rows keep priority until typed done.
 * - Optional preferLocalIds hardens open-thread / mid-stream against remote replace.
 */
export function mergeChats(
    local: Chat[],
    remote: Chat[],
    deletedIds: string[] = [],
    opts: MergeChatsOptions = {}
): Chat[] {
    const dead = new Set(deletedIds)
    const preferLocal = new Set(opts.preferLocalIds || [])
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
        const remoteIsStub = !hasPersistableMessages(chat)
        const localHasMessages = hasLocalThreadContent(existing)
        // A newer metadata-only list row must not beat a message-bearing local draft.
        // Open-thread mid-stream / explicit prefer-local also blocks remote wholesale win.
        const preferRemote =
            preferLocal.has(chat.id) || (remoteIsStub && localHasMessages)
                ? false
                : remoteTime >= localTime
        const newer = preferRemote ? chat : existing
        const older = newer === chat ? existing : chat
        byId.set(chat.id, {
            ...older,
            ...newer,
            messages: mergeMessages(existing.messages, chat.messages, preferRemote && !remoteIsStub),
            title: (newer.title && newer.title.trim()) || older.title,
            notebookId: newer.notebookId || older.notebookId,
            agentMode: newer.agentMode || older.agentMode,
            activePlan: newer.activePlan?.length ? newer.activePlan : older.activePlan,
            systemPrompt: newer.systemPrompt || older.systemPrompt,
            shareToken: existing.shareToken || chat.shareToken,
            isShared: existing.isShared || chat.isShared,
            updatedAt: preferRemote ? newer.updatedAt : existing.updatedAt || newer.updatedAt,
        })
    }
    return Array.from(byId.values()).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
}
