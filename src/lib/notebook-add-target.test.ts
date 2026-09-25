import { describe, expect, it, vi } from 'vitest'
import { NEW_NOTEBOOK_TITLE, pickRecentNotebook, resolveNotebookAddTarget } from './notebook-add-target'

const nbs = [
    { id: 'introducing-wim-notebook', title: 'Introducing', updatedAt: '2026-09-25T10:00:00Z' },
    { id: 'template-rca', title: 'RCA', isTemplate: true, updatedAt: '2026-09-25T11:00:00Z' },
    { id: 'a', title: 'Older', updatedAt: '2026-09-20T10:00:00Z' },
    { id: 'b', title: 'Newest', updatedAt: '2026-09-24T10:00:00Z' },
]

describe('Add to notebook target', () => {
    it('picks the most recently updated notebook of the user (not templates / seeded intro)', () => {
        expect(pickRecentNotebook(nbs)?.id).toBe('b')
        expect(pickRecentNotebook(nbs.slice(0, 2))).toBeNull()
    })

    it('prefers the bound/open notebook, then recent, then creates one', () => {
        const create = vi.fn((title: string) => ({ id: 'new-1', title }))
        expect(resolveNotebookAddTarget({ preferredId: 'x', preferredTitle: 'Bound', notebooks: nbs, create })).toEqual({ id: 'x', title: 'Bound', created: false })
        expect(resolveNotebookAddTarget({ notebooks: nbs, create })).toEqual({ id: 'b', title: 'Newest', created: false })
        expect(create).not.toHaveBeenCalled()
        expect(resolveNotebookAddTarget({ notebooks: nbs.slice(0, 2), create })).toEqual({ id: 'new-1', title: NEW_NOTEBOOK_TITLE, created: true })
        expect(create).toHaveBeenCalledTimes(1)
    })
})
