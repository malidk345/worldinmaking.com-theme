import { test, expect } from '@playwright/test'
import { mergeChats } from '../src/lib/chat-remote'
import { mergeNotebookLists } from '../src/notebook-app/scenes/notebooks/notebookRemote'
import { isSafeOwnerKey } from '../src/lib/account-claim'

const chat = (id: string, updatedAt: string, title = id) =>
    ({
        id,
        title,
        modelId: 'nietzsche',
        messages: [],
        starred: false,
        createdAt: updatedAt,
        updatedAt,
        thinkingBudget: 'balanced' as const,
        webSearchEnabled: false,
    })

test.describe('account sync merge', () => {
    test('deleted ids are not resurrected from the other side', () => {
        const local = [chat('a', '2026-08-17T12:00:00.000Z'), chat('gone', '2026-08-17T13:00:00.000Z')]
        const remote = [chat('gone', '2026-08-17T14:00:00.000Z'), chat('b', '2026-08-17T11:00:00.000Z')]
        const merged = mergeChats(local, remote, ['gone'])
        expect(merged.map((item) => item.id).sort()).toEqual(['a', 'b'])
    })

    test('notebook merge drops tombstoned rows', () => {
        const local = [
            { id: 'n1', short_id: 'n1', title: 'Keep', content: '', createdAt: '', updatedAt: '2026-08-01', version: 1 },
            { id: 'n2', short_id: 'n2', title: 'Dead', content: '', createdAt: '', updatedAt: '2026-08-02', version: 1 },
        ]
        const remote = [
            { id: 'n2', short_id: 'n2', title: 'Dead remote', content: '', createdAt: '', updatedAt: '2026-08-03', version: 2 },
        ]
        const merged = mergeNotebookLists(local as any, remote as any, ['n2'])
        expect(merged).toHaveLength(1)
        expect(merged[0].id).toBe('n1')
    })

    test('claim keys reject junk', () => {
        expect(isSafeOwnerKey('15e06f59-7d51-46c7-bd10-287f91a8e4ee')).toBe(true)
        expect(isSafeOwnerKey('owner_1786815367503_mhsfyb35')).toBe(true)
        expect(isSafeOwnerKey('bad key')).toBe(false)
        expect(isSafeOwnerKey('x')).toBe(false)
    })
})
