import { describe, it, expect } from 'vitest'
import { buildStorageKey, getFileUrl, isStorageWorkerConfigured } from './storage-worker'

describe('storage-worker', () => {
    describe('buildStorageKey', () => {
        it('builds correct key for avatars', () => {
            const key = buildStorageKey({
                userId: 'user-123',
                category: 'avatar',
                identifier: 'a1b2c3d4',
                ext: 'webp',
            })
            expect(key).toBe('users/user-123/avatars/a1b2c3d4.webp')
        })

        it('builds correct key for notebook images', () => {
            const key = buildStorageKey({
                userId: 'user-123',
                category: 'notebook',
                identifier: 'img-hash',
                ext: 'webp',
                notebookId: 'note-456',
                isImage: true,
            })
            expect(key).toBe('users/user-123/notebooks/note-456/images/img-hash.webp')
        })

        it('builds correct key for notebook files / attachments', () => {
            const key = buildStorageKey({
                userId: 'user-123',
                category: 'notebook',
                identifier: 'file-doc',
                ext: 'pdf',
                notebookId: 'note-456',
                isImage: false,
            })
            expect(key).toBe('users/user-123/notebooks/note-456/files/file-doc.pdf')
        })

        it('builds correct key for chat attachments', () => {
            const key = buildStorageKey({
                userId: 'user-123',
                category: 'chat',
                identifier: 'chat-att',
                ext: 'png',
                chatId: 'thread-789',
            })
            expect(key).toBe('users/user-123/chat/thread-789/attachments/chat-att.png')
        })

        it('builds correct key for generated AI artifacts', () => {
            const key = buildStorageKey({
                userId: 'user-123',
                category: 'generated',
                identifier: 'gen-report',
                ext: 'csv',
            })
            expect(key).toBe('users/user-123/generated/gen-report.csv')
        })

        it('builds correct key for general uploads', () => {
            const key = buildStorageKey({
                userId: 'user-123',
                category: 'upload',
                identifier: 'data-backup',
                ext: 'zip',
            })
            expect(key).toBe('users/user-123/uploads/data-backup.zip')
        })
    })

    describe('getFileUrl', () => {
        it('prefixes with storage worker URL or leading slash', () => {
            const url = getFileUrl('users/user-123/avatars/hash.webp')
            expect(url).toContain('users/user-123/avatars/hash.webp')
        })
    })

    describe('isStorageWorkerConfigured', () => {
        it('returns a boolean value without error', () => {
            expect(typeof isStorageWorkerConfigured()).toBe('boolean')
        })
    })
})
