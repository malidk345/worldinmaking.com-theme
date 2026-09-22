import { expect, test } from '@playwright/test'
import fs from 'fs'
import path from 'path'

/**
 * Guests must not hit remote notebook sync (push/pull/realtime).
 * Local IndexedDB + localStorage stay; claim/adopt runs after sign-in.
 */
test.describe('notebook guest remote sync gate', () => {
    test('notebookRemote exports canSyncNotebooksToRemote and gates network paths', () => {
        const src = fs.readFileSync(
            path.join(process.cwd(), 'src/notebook-app/scenes/notebooks/notebookRemote.ts'),
            'utf-8'
        )
        expect(src).toContain('export function canSyncNotebooksToRemote')
        expect(src).toContain('return Boolean(getAuthUserId())')
        for (const fn of [
            'pullNotebooksFromRemote',
            'pullNotebookById',
            'pullNotebookHistory',
            'pushNotebookToRemote',
            'pushAllNotebooksToRemote',
            'deleteNotebookRemote',
            'subscribeToWorkspaceNotebooks',
        ]) {
            const idx = src.indexOf(fn === 'subscribeToWorkspaceNotebooks' ? `export function ${fn}` : `export async function ${fn}`)
            expect(idx, fn).toBeGreaterThan(-1)
            const window = src.slice(idx, idx + 500)
            expect(window, fn).toContain('canSyncNotebooksToRemote()')
        }
        // Public published pull must remain ungated for anonymous readers.
        const pub = src.indexOf('export async function pullPublishedNotebook')
        expect(pub).toBeGreaterThan(-1)
        expect(src.slice(pub, pub + 350)).not.toContain('canSyncNotebooksToRemote()')
    })

    test('notebookStorage skips schedule/hydrate/live remote work without a session', () => {
        const src = fs.readFileSync(
            path.join(process.cwd(), 'src/notebook-app/scenes/notebooks/notebookStorage.ts'),
            'utf-8'
        )
        expect(src).toContain('canSyncNotebooksToRemote')
        expect(src).toContain('Guests stay local-only')
        expect(src).toContain('Guests: local IndexedDB/localStorage only')
        // Guest→account path must remain.
        expect(src).toContain('adoptGuestNotebooksIntoAccount')
        expect(src).toContain('claimDeviceAccountOnLogin')
    })
})
