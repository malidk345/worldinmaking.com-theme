import { describe, expect, it } from 'vitest'
import type { HostSnapshot } from './host'
import {
    executeAddNotebookFootnote,
    executeAnnotateNotebook,
    executeInsertNotebookBlock,
    executeReplaceNotebookSelection,
    executeRewriteNotebookDocument,
    executeUpdateNotebookTitle,
} from './host'

const host: HostSnapshot = {
    notebookId: 'nb-real',
    notebookTitle: 'Real Notes',
    selection: 'highlighted Kant passage',
    notebooks: [{ id: 'nb-real', title: 'Real Notes', content: '# Real\n\nBody[^1]\n\n[^1]: prior' }],
}

describe('host write tools unknown notebookId fail-closed', () => {
    it('insert_notebook_block fails closed on missing id', () => {
        const res = executeInsertNotebookBlock(host, 'New block', 'nb-missing')
        expect(res.ok).toBe(false)
        expect(res.result).toContain('not found')
        expect(res.action).toBeUndefined()
    })

    it('rewrite_notebook_document fails closed on missing id', () => {
        const res = executeRewriteNotebookDocument(host, '# Rewrite', 'nb-missing')
        expect(res.ok).toBe(false)
        expect(res.result).toContain('not found')
        expect(res.action).toBeUndefined()
    })

    it('replace_notebook_selection fails closed on missing id', () => {
        const res = executeReplaceNotebookSelection(host, 'replacement', 'nb-missing')
        expect(res.ok).toBe(false)
        expect(res.result).toContain('not found')
        expect(res.action).toBeUndefined()
    })

    it('update_notebook_title fails closed on missing id', () => {
        const res = executeUpdateNotebookTitle(host, 'Renamed', 'nb-missing')
        expect(res.ok).toBe(false)
        expect(res.result).toContain('not found')
        expect(res.action).toBeUndefined()
    })

    it('annotate_notebook fails closed on missing id', () => {
        const res = executeAnnotateNotebook(host, 'span', 'note', 'nb-missing')
        expect(res.ok).toBe(false)
        expect(res.result).toContain('not found')
        expect(res.action).toBeUndefined()
    })

    it('add_notebook_footnote fails closed on missing id', () => {
        const res = executeAddNotebookFootnote(host, 'cite', 'span', undefined, 'nb-missing')
        expect(res.ok).toBe(false)
        expect(res.result).toContain('not found')
        expect(res.action).toBeUndefined()
    })

    it('resolves explicit title to id (not title-as-id body)', () => {
        const res = executeInsertNotebookBlock(host, 'Appended via title', 'Real Notes')
        expect(res.ok).toBe(true)
        expect(res.action?.payload.notebookId).toBe('nb-real')
        const parsed = JSON.parse(res.result)
        expect(parsed.notebookId).toBe('nb-real')
    })

    it('still inserts into bound notebook when id omitted', () => {
        const res = executeInsertNotebookBlock(host, 'Bound write')
        expect(res.ok).toBe(true)
        expect(res.action?.payload.notebookId).toBe('nb-real')
    })
})
