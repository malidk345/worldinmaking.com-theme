import type { NotebookPropValue } from './types'

export type DiscussionReply = {
    id: string
    text: string
    author: string
    createdAt: string
}

export function parseDiscussionReplies(value: unknown): DiscussionReply[] {
    if (!Array.isArray(value)) return []
    const replies: DiscussionReply[] = []
    for (const entry of value) {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue
        const record = entry as Record<string, unknown>
        const id = typeof record.id === 'string' ? record.id.trim() : ''
        const text = typeof record.text === 'string' ? record.text : ''
        if (!id) continue
        replies.push({
            id,
            text,
            author: typeof record.author === 'string' && record.author.trim() ? record.author : 'Someone',
            createdAt: typeof record.createdAt === 'string' ? record.createdAt : '',
        })
    }
    return replies
}

export function repliesToPropValue(replies: DiscussionReply[]): NotebookPropValue {
    return replies.map((reply) => ({
        id: reply.id,
        text: reply.text,
        author: reply.author,
        createdAt: reply.createdAt,
    }))
}

export function appendDiscussionReply(replies: DiscussionReply[], reply: DiscussionReply): DiscussionReply[] {
    if (replies.some((entry) => entry.id === reply.id)) return replies
    return [...replies, reply]
}

export function removeDiscussionReply(replies: DiscussionReply[], replyId: string): DiscussionReply[] {
    return replies.filter((reply) => reply.id !== replyId)
}
