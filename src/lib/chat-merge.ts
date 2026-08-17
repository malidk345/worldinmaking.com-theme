import type { Chat, Message } from '../components/ClaudeWorkspaceChat/types'

export function mergeMessages(left: Message[] = [], right: Message[] = []): Message[] {
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
        const nextLonger = (message.content || '').length >= (existing.content || '').length
        const nextDone = message.isTypingDone && !existing.isTypingDone
        byId.set(message.id, nextLonger || nextDone ? { ...existing, ...message } : { ...message, ...existing })
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
        const newer = remoteTime >= localTime ? chat : existing
        const older = newer === chat ? existing : chat
        byId.set(chat.id, {
            ...older,
            ...newer,
            messages: mergeMessages(existing.messages, chat.messages),
            shareToken: existing.shareToken || chat.shareToken,
            isShared: existing.isShared || chat.isShared,
        })
    }
    return Array.from(byId.values()).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
}
