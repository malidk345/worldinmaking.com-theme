import { describe, expect, it } from 'vitest'
import type { Chat } from '../components/ClaudeWorkspaceChat/types'
import { reinsertOpenThread, shouldBlankQuotaOnIdentity, threadHasContent } from './chat-session'

function chat(id: string, content = ''): Chat {
    return {
        id,
        title: id,
        modelId: 'nietzsche',
        starred: false,
        createdAt: '2026-09-26T00:00:00.000Z',
        updatedAt: '2026-09-26T00:00:00.000Z',
        thinkingBudget: 'extended',
        webSearchEnabled: false,
        messages: content
            ? [{ id: `${id}-m`, role: 'user', content, timestamp: '2026-09-26T00:00:00.000Z' }]
            : [],
    }
}

describe('reinsertOpenThread', () => {
    it('puts the live blank draft back when history omitted it', () => {
        const draft = chat('draft')
        const old = chat('old', 'hello')
        const kept = reinsertOpenThread([old], [draft, old], 'draft')
        expect(kept.map((item) => item.id)).toEqual(['draft', 'old'])
    })

    it('does not duplicate a thread history already has', () => {
        const draft = chat('draft', 'sent')
        const kept = reinsertOpenThread([draft], [draft], 'draft')
        expect(kept).toHaveLength(1)
    })

    it('does not revive a deleted open thread', () => {
        const draft = chat('draft')
        const old = chat('old', 'hello')
        const kept = reinsertOpenThread([old], [draft, old], 'draft', ['draft'])
        expect(kept.map((item) => item.id)).toEqual(['old'])
    })
})

describe('threadHasContent', () => {
    it('treats an unsent opener as empty and a user turn as content', () => {
        expect(threadHasContent(chat('draft'))).toBe(false)
        expect(threadHasContent(chat('old', 'hello'))).toBe(true)
    })
})

describe('shouldBlankQuotaOnIdentity', () => {
    it('keeps the snapshot across a token refresh and blanks on account switch', () => {
        expect(shouldBlankQuotaOnIdentity('user-a', 'user-a')).toBe(false)
        expect(shouldBlankQuotaOnIdentity('guest', 'user-a')).toBe(true)
    })
})
