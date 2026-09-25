import { describe, expect, it } from 'vitest'
import { composeNotebookInsert, maxNumericFootnoteId, renumberInsertedFootnotes } from './notebook-insert-compose'
import { parseMarkdownNotebook } from '../notebook-app/lib/components/MarkdownNotebook/markdown'

describe('notebook insert composition', () => {
    const current = '# Notes\n\n> [!TIP]\n> Keep going\n\nOld claim[^1] and[^2].\n\n[^1]: Old one\n[^2]: Old two'

    it('renumbers inserted footnotes after the notebook’s own', () => {
        expect(maxNumericFootnoteId(current)).toBe(2)
        const inserted = 'New claim[^1] and[^2].\n\n[^1]: New A\n[^2]: New B'
        expect(renumberInsertedFootnotes(current, inserted)).toBe('New claim[^3] and[^4].\n\n[^3]: New A\n[^4]: New B')
        const next = composeNotebookInsert(current, inserted, 'append')
        const doc = parseMarkdownNotebook(next)
        expect(doc.footnotes).toEqual({ '1': 'Old one', '2': 'Old two', '3': 'New A', '4': 'New B' })
    })

    it('keeps the rest of the notebook byte-for-byte (callouts survive)', () => {
        const next = composeNotebookInsert(current, 'Plain [P1] text', 'append')
        expect(next.startsWith(current)).toBe(true)
        expect(next).toContain('> [!TIP]')
        expect(next.endsWith('Plain [P1] text\n')).toBe(true)
    })

    it('does not touch footnote-looking text inside code', () => {
        expect(renumberInsertedFootnotes(current, 'See `[^1]` here[^1].\n\n[^1]: x')).toBe('See `[^1]` here[^3].\n\n[^3]: x')
    })

    it('reuses an existing footnote instead of duplicating the same reference', () => {
        const inserted = 'Again[^1] and new[^2].\n\n[^1]: Old  one\n[^2]: New B'
        expect(renumberInsertedFootnotes(current, inserted)).toBe('Again[^1] and new[^3].\n\n[^3]: New B')
        const doc = parseMarkdownNotebook(composeNotebookInsert(current, inserted, 'append'))
        expect(doc.footnotes).toEqual({ '1': 'Old one', '2': 'Old two', '3': 'New B' })
    })

    it('replace mode is untouched', () => {
        expect(composeNotebookInsert(current, 'X[^1]\n\n[^1]: y', 'replace')).toBe('X[^1]\n\n[^1]: y\n')
    })
})
