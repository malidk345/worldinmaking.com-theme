import { test, expect } from '@playwright/test'
import { mergeChats, mergeMessages } from '../src/lib/chat-merge'

test('mergeMessages correctly prefers streaming local messages', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const left = [{ id: '1', role: 'user', content: 'local', isTypingDone: false, timestamp: '' }] as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const right = [{ id: '1', role: 'user', content: 'remote', isTypingDone: true, timestamp: '' }] as any
    const merged = mergeMessages(left, right, true)
    expect(merged[0].content).toBe('local')
    expect(merged[0].isTypingDone).toBe(false)
})

test('mergeMessages correctly prefers remote edits regardless of length when preferRight is true', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const left = [{ id: '1', role: 'user', content: 'longer local message', isTypingDone: true, timestamp: '' }] as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const right = [{ id: '1', role: 'user', content: 'short', isTypingDone: true, timestamp: '' }] as any
    const merged = mergeMessages(left, right, true)
    expect(merged[0].content).toBe('short')
})

test('mergeMessages preserves soft qualityGate', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const left = [{ id: '1', role: 'assistant', content: 'local', qualityGate: 'failed', isTypingDone: true, timestamp: '' }] as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const right = [{ id: '1', role: 'assistant', content: 'remote', isTypingDone: true, timestamp: '' }] as any
    const mergedLocalWin = mergeMessages(left, right, false)
    expect(mergedLocalWin[0].qualityGate).toBe('failed')
})


test('mergeChats keeps local streaming messages ahead of remote stubs', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const local: any[] = [{
        id: 'c1',
        title: 'Local',
        updatedAt: '2026-01-01T00:00:00.000Z',
        modelId: 'nietzsche',
        starred: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        thinkingBudget: 'balanced',
        webSearchEnabled: false,
        messages: [
            { id: 'u1', role: 'user', content: 'hi', isTypingDone: true, timestamp: '' },
            { id: 'a1', role: 'assistant', content: 'partial', isTypingDone: false, isStreaming: true, timestamp: '' },
        ],
    }]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const remote: any[] = [{
        id: 'c1',
        title: 'Remote',
        updatedAt: '2026-01-02T00:00:00.000Z',
        modelId: 'nietzsche',
        starred: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        thinkingBudget: 'balanced',
        webSearchEnabled: false,
        messages: [],
    }]
    const merged = mergeChats(local, remote, [])
    expect(merged[0].messages).toHaveLength(2)
    expect(merged[0].messages[1].content).toBe('partial')
    expect(merged[0].messages[1].isStreaming).toBe(true)
})


test('mergeChats metadata stub must not wipe local streaming-only thread', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const local: any[] = [{
        id: 'c1',
        title: 'Local',
        updatedAt: '2026-01-01T00:00:00.000Z',
        modelId: 'nietzsche',
        starred: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        thinkingBudget: 'balanced',
        webSearchEnabled: false,
        messages: [
            { id: 'a1', role: 'assistant', content: 'partial', isTypingDone: false, isStreaming: true, timestamp: '' },
        ],
    }]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const remote: any[] = [{
        id: 'c1',
        title: 'Remote stub',
        updatedAt: '2026-01-09T00:00:00.000Z',
        modelId: 'nietzsche',
        starred: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        thinkingBudget: 'balanced',
        webSearchEnabled: false,
        messages: [],
    }]
    const merged = mergeChats(local, remote, [])
    expect(merged[0].messages).toHaveLength(1)
    expect(merged[0].messages[0].content).toBe('partial')
    expect(merged[0].title).toBe('Local')
})
