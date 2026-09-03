import { test, expect } from '@playwright/test'
import {
    canDeleteNotebookRecord,
    canManageNotebookPeople,
    canWriteNotebook,
    isNotebookInviteToken,
    notebookInvitePath,
    normalizeShareRole,
    parseInviteHandle,
} from '../src/lib/notebook-sharing'
import { parseNotebookRoute, notebookPathForRoute } from '../src/lib/notebook-route'
import { extractNotebookId } from '../src/lib/window-path'

test.describe('notebook sharing helpers', () => {
    test('roles: owner and editor can write, viewer cannot', () => {
        expect(canWriteNotebook('owner')).toBe(true)
        expect(canWriteNotebook('editor')).toBe(true)
        expect(canWriteNotebook(undefined)).toBe(true)
        expect(canWriteNotebook('viewer')).toBe(false)
        expect(canManageNotebookPeople('editor')).toBe(true)
        expect(canManageNotebookPeople('viewer')).toBe(false)
        expect(canDeleteNotebookRecord('owner')).toBe(true)
        expect(canDeleteNotebookRecord('editor')).toBe(false)
        expect(normalizeShareRole('viewer')).toBe('viewer')
        expect(normalizeShareRole('nope')).toBe('editor')
    })

    test('parses username and email handles, rejects junk', () => {
        expect(parseInviteHandle('@ali')).toEqual({ kind: 'username', value: 'ali' })
        expect(parseInviteHandle('  mustafa@worldinmaking.com ')).toEqual({
            kind: 'email',
            value: 'mustafa@worldinmaking.com',
        })
        expect(parseInviteHandle('not an email@')).toBeNull()
        expect(parseInviteHandle('ab')).toEqual({ kind: 'username', value: 'ab' })
        expect(parseInviteHandle('x')).toBeNull()
        expect(parseInviteHandle('')).toBeNull()
    })

    test('invite tokens and paths', () => {
        expect(isNotebookInviteToken('abcdefghijklmnop')).toBe(true)
        expect(isNotebookInviteToken('short')).toBe(false)
        expect(isNotebookInviteToken('has spaces in token!!')).toBe(false)
        expect(notebookInvitePath('abc123def456ghi789')).toBe('/notebooks/invite/abc123def456ghi789')
    })
})

test.describe('notebook invite route', () => {
    test('invite links are not treated as notebook ids', () => {
        expect(extractNotebookId('/notebooks/invite/tokentokentoken12')).toBeNull()
        expect(parseNotebookRoute('/notebooks/invite/tokentokentoken12')).toEqual({
            page: 'invite',
            token: 'tokentokentoken12',
        })
        expect(notebookPathForRoute({ page: 'invite', token: 'tokentokentoken12' })).toBe(
            '/notebooks/invite/tokentokentoken12'
        )
    })
})
