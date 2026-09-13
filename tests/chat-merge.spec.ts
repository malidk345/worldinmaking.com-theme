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
