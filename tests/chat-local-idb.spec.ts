import { test, expect } from '@playwright/test'
import {
    pickChatsForLocalHydrate,
    shouldMigrateLsToIdb,
    shouldSuppressSelfEchoHydrate,
    noteSelfChatPush,
    _resetSelfEchoForTests,
} from '../src/lib/chat-local'
import { guardOpenThreadRemote, mergeChats } from '../src/lib/chat-merge'

test('shouldMigrateLsToIdb migrates once when IDB empty and LS has chats', () => {
    expect(
        shouldMigrateLsToIdb({ migratedFlag: false, idbCount: 0, lsCount: 3 })
    ).toBe(true)
    expect(
        shouldMigrateLsToIdb({ migratedFlag: true, idbCount: 0, lsCount: 3 })
    ).toBe(false)
    expect(
        shouldMigrateLsToIdb({ migratedFlag: false, idbCount: 2, lsCount: 3 })
    ).toBe(false)
    expect(
        shouldMigrateLsToIdb({ migratedFlag: false, idbCount: 0, lsCount: 0 })
    ).toBe(false)
})

test('pickChatsForLocalHydrate prefers IndexedDB when populated', () => {
    const idb = [{ id: 'a' }]
    const ls = [{ id: 'b' }, { id: 'c' }]
    expect(pickChatsForLocalHydrate(idb, ls)).toEqual(idb)
    expect(pickChatsForLocalHydrate([], ls)).toEqual(ls)
    expect(pickChatsForLocalHydrate(null, ls)).toEqual(ls)
})

test('self-echo hydrate suppress window covers recent push', () => {
    _resetSelfEchoForTests()
    noteSelfChatPush('chat-1')
    expect(shouldSuppressSelfEchoHydrate('chat-1')).toBe(true)
    expect(shouldSuppressSelfEchoHydrate('chat-other')).toBe(false)
    expect(shouldSuppressSelfEchoHydrate('chat-1', Date.now() + 10_000)).toBe(false)
    _resetSelfEchoForTests()
})

test('guardOpenThreadRemote blocks mid-stream and stub wipe', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const local: any = {
        id: 'c1',
        title: 'Local',
        updatedAt: '2026-01-01T00:00:00.000Z',
        messages: [
            { id: 'u1', role: 'user', content: 'hi', isTypingDone: true, timestamp: '' },
            { id: 'a1', role: 'assistant', content: 'partial', isStreaming: true, isTypingDone: false, timestamp: '' },
        ],
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const remoteNewerStub: any = {
        id: 'c1',
        title: 'Remote',
        updatedAt: '2026-01-02T00:00:00.000Z',
        messages: [],
    }
    expect(guardOpenThreadRemote(local, remoteNewerStub, { midStream: true })).toBe('merge-prefer-local')
    expect(guardOpenThreadRemote(local, remoteNewerStub)).toBe('merge-prefer-local')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const remoteNewerFull: any = {
        id: 'c1',
        title: 'Remote',
        updatedAt: '2026-01-02T00:00:00.000Z',
        messages: [
            { id: 'u1', role: 'user', content: 'hi', isTypingDone: true, timestamp: '' },
            { id: 'a1', role: 'assistant', content: 'done', isTypingDone: true, timestamp: '' },
        ],
    }
    expect(guardOpenThreadRemote(local, remoteNewerFull, { midStream: false })).toBe('merge-prefer-remote')
    expect(guardOpenThreadRemote(local, remoteNewerFull, { midStream: true })).toBe('merge-prefer-local')
})

test('mergeChats preferLocalIds keeps open-thread messages over newer remote', () => {
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
            { id: 'a1', role: 'assistant', content: 'local-partial', isTypingDone: false, isStreaming: true, timestamp: '' },
        ],
    }]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const remote: any[] = [{
        id: 'c1',
        title: 'Remote',
        updatedAt: '2026-01-03T00:00:00.000Z',
        modelId: 'nietzsche',
        starred: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        thinkingBudget: 'balanced',
        webSearchEnabled: false,
        messages: [
            { id: 'u1', role: 'user', content: 'hi', isTypingDone: true, timestamp: '' },
            { id: 'a1', role: 'assistant', content: 'remote-done', isTypingDone: true, isStreaming: false, timestamp: '' },
        ],
    }]
    const merged = mergeChats(local, remote, [], { preferLocalIds: ['c1'] })
    expect(merged[0].messages[1].content).toBe('local-partial')
    expect(merged[0].messages[1].isStreaming).toBe(true)
})
