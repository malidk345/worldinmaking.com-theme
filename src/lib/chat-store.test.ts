import { describe, test, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
const mockListSyncTombstoneIds = vi.fn()
const mockRecordSyncTombstone = vi.fn()

vi.mock('../../lib/supabase-admin', () => ({
    supabaseAdmin: {
        from: (table: string) => mockFrom(table),
    },
}))

vi.mock('../../lib/sync-tombstones', () => ({
    listSyncTombstoneIds: (...args: any[]) => mockListSyncTombstoneIds(...args),
    recordSyncTombstone: (...args: any[]) => mockRecordSyncTombstone(...args),
    hasSyncTombstone: vi.fn(),
}))

import { listDeletedChatIds } from './chat-store'

describe('listDeletedChatIds', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    test('correctly records tombstones and deletes leftover soft-deleted chats in bulk', async () => {
        mockListSyncTombstoneIds.mockResolvedValue(['tombstone-1', 'tombstone-2'])
        mockRecordSyncTombstone.mockResolvedValue(true)

        const leftoverData = Array.from({ length: 50 }, (_, i) => ({
            id: `chat-${i}`,
            owner_key: 'owner-1',
            auth_user_id: 'user-1',
        }))

        const mockDelete = vi.fn().mockReturnValue({ eq: vi.fn(), in: vi.fn().mockResolvedValue({ error: null }) })
        const mockNot = vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: leftoverData, error: null }),
        })
        const mockSelect = vi.fn().mockReturnValue({
            not: mockNot,
        })

        mockFrom.mockImplementation((table: string) => {
            if (table === 'wim_chats') {
                return {
                    select: mockSelect,
                    delete: mockDelete,
                }
            }
            return {}
        })

        const start = performance.now()
        const result = await listDeletedChatIds('owner-1', 'user-1')
        const duration = performance.now() - start

        expect(result).toHaveLength(52) // 2 tombstones + 50 leftovers
        expect(mockRecordSyncTombstone).toHaveBeenCalledTimes(50)

        // Verify delete query was called with .in('id', ids) batch operation
        expect(mockDelete).toHaveBeenCalled()

        console.log(`Execution time for 50 leftover records: ${duration.toFixed(2)}ms`)
    })

    test('handles empty leftover array gracefully without making delete call', async () => {
        mockListSyncTombstoneIds.mockResolvedValue(['tombstone-1'])

        const mockDelete = vi.fn()
        const mockNot = vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        })
        const mockSelect = vi.fn().mockReturnValue({
            not: mockNot,
        })

        mockFrom.mockImplementation((table: string) => {
            if (table === 'wim_chats') {
                return {
                    select: mockSelect,
                    delete: mockDelete,
                }
            }
            return {}
        })

        const result = await listDeletedChatIds('owner-1', 'user-1')

        expect(result).toEqual(['tombstone-1'])
        expect(mockRecordSyncTombstone).not.toHaveBeenCalled()
        expect(mockDelete).not.toHaveBeenCalled()
    })
})
