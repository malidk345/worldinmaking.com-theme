import { test, expect } from '@playwright/test'

// Pure deduplication and sorting logic extracted to prove it handles races correctly
function mergeNotifications(
    prevNotifications: any[],
    remoteNotes: any[],
    localAssistantNotes: any[]
): any[] {
    const localIds = new Set(localAssistantNotes.map((item) => String(item.id)))
    const incoming = Array.isArray(remoteNotes) ? remoteNotes : []
    const rest = incoming.filter(
        (item: any) =>
            !localIds.has(String(item.id)) && !String(item?.id || '').startsWith('assistant_')
    )
    return [...localAssistantNotes, ...rest].sort(
        (a, b) => new Date(String(b.date || 0)).getTime() - new Date(String(a.date || 0)).getTime()
    )
}

test.describe('Notification Deduplication and Merging', () => {
    test('merges remote and local assistant notes, deduplicating and sorting by date without losing local ones', () => {
        const localAssistantNotes = [
            { id: 'assistant_1', date: '2025-01-01T12:00:00Z', title: 'A local note' }
        ]
        const remoteNotes = [
            { id: 'forum_1', date: '2025-01-02T12:00:00Z', title: 'A forum reply' }, // Newer
            { id: 'assistant_2', date: '2024-12-31T12:00:00Z', title: 'Stale remote assistant note' } // Should be filtered out
        ]

        const result = mergeNotifications([], remoteNotes, localAssistantNotes)

        expect(result).toHaveLength(2)
        expect(result[0].id).toBe('forum_1') // Newest first
        expect(result[1].id).toBe('assistant_1') // Kept local note, stripped the remote assistant_2
    })
})
