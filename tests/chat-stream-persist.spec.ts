import { test, expect } from '@playwright/test'
import { chatSnapshotForRemote } from '../src/lib/chat-remote'
import type { Chat } from '../src/components/ClaudeWorkspaceChat/types'

test('chatSnapshotForRemote drops in-flight streaming messages', () => {
    const chat = {
        id: 'c1',
        title: 't',
        modelId: 'nietzsche',
        starred: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        thinkingBudget: 'balanced',
        webSearchEnabled: false,
        messages: [
            { id: 'u1', role: 'user', content: 'hi', timestamp: '', isTypingDone: true },
            { id: 'a1', role: 'assistant', content: 'partial', timestamp: '', isStreaming: true, isTypingDone: false },
            { id: 'a0', role: 'assistant', content: 'done', timestamp: '', isStreaming: false, isTypingDone: true },
        ],
    } as Chat
    const snap = chatSnapshotForRemote(chat)
    expect(snap.messages.map((m) => m.id)).toEqual(['u1', 'a0'])
})
