import { describe, expect, it } from 'vitest'
import { mergeNotebookLists, pickNewerNotebook } from './notebookRemote'
import type { StoredNotebook } from './notebookStorage'

function nb(partial: Partial<StoredNotebook> & { id: string }): StoredNotebook {
    return {
        id: partial.id,
        short_id: partial.short_id || partial.id.slice(0, 8),
        title: partial.title || 'Note',
        content: partial.content || '',
        createdAt: partial.createdAt || '2026-01-01T00:00:00.000Z',
        updatedAt: partial.updatedAt || '2026-01-02T00:00:00.000Z',
        version: partial.version ?? 1,
        contentOmitted: partial.contentOmitted,
        ...partial,
    }
}

describe('mergeNotebookLists tombstones', () => {
    it('drops remote rows that are in deletedIds before they can paint', () => {
        const local = [nb({ id: 'keep-local', title: 'Keep' })]
        const remote = [
            nb({ id: 'keep-local', title: 'Keep remote', version: 2 }),
            nb({ id: 'deleted-remote', title: 'Ghost', short_id: 'ghost' }),
        ]
        const merged = mergeNotebookLists(local, remote, ['deleted-remote', 'ghost'])
        expect(merged.map((row) => row.id)).toEqual(['keep-local'])
        expect(merged[0].title).toBe('Keep remote')
    })

    it('drops local rows that were tombstoned even if remote still returns them', () => {
        const local = [nb({ id: 'a' }), nb({ id: 'b', short_id: 'b-short' })]
        const remote = [nb({ id: 'b', short_id: 'b-short', version: 9, title: 'Resurrect?' })]
        const merged = mergeNotebookLists(local, remote, ['b-short'])
        expect(merged.map((row) => row.id)).toEqual(['a'])
    })
})

describe('pickNewerNotebook contentOmitted', () => {
    it('does not wipe local body when remote list row omits content', () => {
        const local = nb({ id: 'x', content: 'full body', version: 2 })
        const remote = nb({ id: 'x', content: '', contentOmitted: true, version: 3, title: 'Newer title' })
        const picked = pickNewerNotebook(local, remote)
        expect(picked.content).toBe('full body')
        expect(picked.title).toBe('Newer title')
        expect(picked.contentOmitted).toBe(false)
    })
})
