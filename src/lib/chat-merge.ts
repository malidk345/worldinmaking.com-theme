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

/**
 * Dual-device chat merge.
 * - Tombstones always win.
 * - Metadata-only remote stubs (empty messages) must not clobber a local copy that
 *   already has messages / notebook bind / agent plan — common after list GET.
 * - Message bodies merge by id; streaming local rows keep priority until typed done.
 */
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
        const remoteIsStub = !hasPersistableMessages(chat)
        const localHasMessages = hasPersistableMessages(existing)
        // A newer metadata-only list row must not beat a message-bearing local draft.
        const preferRemote = remoteIsStub && localHasMessages ? false : remoteTime >= localTime
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
