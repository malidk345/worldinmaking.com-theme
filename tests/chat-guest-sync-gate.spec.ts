import { expect, test } from '@playwright/test'
import fs from 'fs'
import path from 'path'

/**
 * Guests must not hit remote chat sync (push/pull/realtime/12s poll).
 * Local IndexedDB + localStorage stay; claim/adopt runs after sign-in.
 */
test.describe('chat guest remote sync gate', () => {
    test('chat-remote exports canSyncChatsToRemote and gates network paths', () => {
        const src = fs.readFileSync(path.join(process.cwd(), 'src/lib/chat-remote.ts'), 'utf-8')
        expect(src).toContain('export function canSyncChatsToRemote')
        expect(src).toContain('return Boolean(getAuthUserId())')
        for (const fn of [
            'pullChatsFromRemote',
            'pullChatByIdFromRemote',
            'pushChatToRemote',
            'pushDirtyLocalChats',
            'deleteChatOnRemote',
            'setRemoteChatShare',
            'setRemoteMessageLiked',
            'subscribeToWorkspaceChats',
            'startWorkspaceChatPolling',
        ]) {
            const asyncFn = !['subscribeToWorkspaceChats', 'startWorkspaceChatPolling'].includes(fn)
            const idx = src.indexOf(asyncFn ? `export async function ${fn}` : `export function ${fn}`)
            expect(idx, fn).toBeGreaterThan(-1)
            const window = src.slice(idx, idx + 500)
            expect(window, fn).toContain('canSyncChatsToRemote()')
        }
        // Guest→account paths must remain ungated.
        for (const fn of ['adoptGuestChatsIntoAccount', 'claimDeviceAccountOnLogin']) {
            const idx = src.indexOf(
                fn === 'claimDeviceAccountOnLogin' ? `export async function ${fn}` : `export function ${fn}`
            )
            expect(idx, fn).toBeGreaterThan(-1)
            expect(src.slice(idx, idx + 350), fn).not.toContain('canSyncChatsToRemote()')
        }
    })

    test('ClaudeWorkspaceChat skips live remote work without a session', () => {
        const src = fs.readFileSync(
            path.join(process.cwd(), 'src/components/ClaudeWorkspaceChat/index.tsx'),
            'utf-8'
        )
        expect(src).toContain('canSyncChatsToRemote')
        expect(src).toContain('Guests: local IndexedDB/localStorage only')
        expect(src).toContain('startLiveRemote')
        // Guest→account path must remain.
        expect(src).toContain('adoptGuestChatsIntoAccount')
        expect(src).toContain('claimDeviceAccountOnLogin')
    })
})
