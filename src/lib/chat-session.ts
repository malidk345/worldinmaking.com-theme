import type { Chat, Message } from '../components/ClaudeWorkspaceChat/types'

/** A thread the user has not sent into yet. Storage and remote lists omit these. */
export function threadHasContent(chat: Chat | undefined): boolean {
    if (!chat?.messages?.length) return false
    return chat.messages.some(
        (message: Message) => Boolean(message.isStreaming) || String(message.content || '').trim().length > 0
    )
}

/**
 * History hydration (IndexedDB, identity reload, remote list) may refresh the
 * sidebar, but it must not drop the open composer. Blank drafts are not stored,
 * so a replace-with-history used to make the next sync jump to the newest old chat.
 * Reinsert the live open thread when history does not contain it.
 * A tombstoned id stays gone — the caller opens a new blank draft, never history[0].
 */
export function reinsertOpenThread<T extends { id: string }>(
    merged: T[],
    live: T[],
    activeId: string,
    deletedIds: readonly string[] = []
): T[] {
    if (!activeId || deletedIds.includes(activeId)) return merged
    if (merged.some((chat) => chat.id === activeId)) return merged
    const open = live.find((chat) => chat.id === activeId)
    if (!open) return merged
    return [open, ...merged]
}

/**
 * Token refresh emits the same identity event as login. Blanking a known quota
 * on refresh is what flashed "checking weekly budget" under the composer.
 * Only an owner change (guest ↔ account, or account switch) invalidates it.
 */
export function shouldBlankQuotaOnIdentity(previousOwner: string, nextOwner: string): boolean {
    return previousOwner !== nextOwner
}
