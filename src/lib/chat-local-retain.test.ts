import { describe, expect, it } from 'vitest'
import type { Chat } from '../components/ClaudeWorkspaceChat/types'
import { chatsForStorage, retainOpenChats } from './chat-local'

function chat(partial: Pick<Chat, 'id' | 'updatedAt'> & Partial<Chat>): Chat {
    return {
        title: partial.id,
        modelId: 'nietzsche',
        messages: [],
        starred: false,
        createdAt: partial.updatedAt,
        thinkingBudget: 'extended',
        webSearchEnabled: false,
        ...partial,
    }
}

const withText = (id: string, updatedAt: string, extra: Partial<Chat> = {}): Chat =>
    chat({
        id,
        updatedAt,
        messages: [{ id: `${id}-m`, role: 'user', content: 'hi', timestamp: updatedAt }],
        ...extra,
    })

describe('retainOpenChats', () => {
    it('keeps the three newest threads and the open empty draft', () => {
        const draft = chat({ id: 'draft', updatedAt: '2026-09-24T00:00:00.000Z' })
        const kept = retainOpenChats(
            [
                draft,
                withText('a', '2026-09-03T00:00:00.000Z'),
                withText('b', '2026-09-02T00:00:00.000Z'),
                withText('c', '2026-09-01T00:00:00.000Z'),
                withText('old', '2026-08-01T00:00:00.000Z'),
            ],
            'draft'
        )
        expect(kept.map((item) => item.id)).toEqual(['draft', 'a', 'b', 'c'])
    })

    it('does not drop the open, shared, or notebook-bound thread when they are older', () => {
        const kept = retainOpenChats(
            [
                withText('new-1', '2026-09-03T00:00:00.000Z'),
                withText('new-2', '2026-09-02T00:00:00.000Z'),
                withText('new-3', '2026-09-01T00:00:00.000Z'),
                withText('open', '2026-01-01T00:00:00.000Z'),
                withText('shared', '2026-01-02T00:00:00.000Z', { isShared: true }),
                withText('notebook', '2026-01-03T00:00:00.000Z', { notebookId: 'nb-1' }),
                withText('old', '2025-01-01T00:00:00.000Z'),
            ],
            'open',
            3,
            { notebookId: 'nb-1' }
        )
        expect(kept.map((item) => item.id).sort()).toEqual(
            ['new-1', 'new-2', 'new-3', 'notebook', 'open', 'shared'].sort()
        )
    })
})

describe('chatsForStorage', () => {
    it('stores the open thread even when it is outside the newest three', () => {
        const stored = chatsForStorage(
            [
                withText('a', '2026-09-03T00:00:00.000Z'),
                withText('b', '2026-09-02T00:00:00.000Z'),
                withText('c', '2026-09-01T00:00:00.000Z'),
                withText('open', '2026-01-01T00:00:00.000Z'),
                chat({ id: 'draft', updatedAt: '2026-09-24T00:00:00.000Z' }),
            ],
            3,
            ['open']
        )
        expect(stored.map((item) => item.id)).toEqual(['a', 'b', 'c', 'open'])
    })
})
