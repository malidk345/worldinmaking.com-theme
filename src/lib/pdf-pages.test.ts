import { describe, expect, it } from 'vitest'
import {
    PDF_NO_TEXT,
    historyAttachmentNote,
    historyToolResult,
    omitPastedPdfBodies,
    pdfPageCount,
    pdfPromptExcerpt,
    slicePdfByPage,
} from './pdf-pages'

const sample = [
    '[Page 1]',
    'Preface of the book.',
    '',
    '[Page 2]',
    'The will to power is discussed here.',
    '',
    '[Page 3]',
    'Closing remarks.',
].join('\n')

describe('pdf page slices', () => {
    it('counts and slices real [Page N] blocks', () => {
        expect(pdfPageCount(sample)).toBe(3)
        const page2 = slicePdfByPage(sample, 2)
        expect(page2.error).toBeUndefined()
        expect(page2.text).toContain('will to power')
        expect(page2.text).not.toContain('Preface')
        expect(page2.pageCount).toBe(3)
    })

    it('fails closed on a missing page', () => {
        const miss = slicePdfByPage(sample, 9)
        expect(miss.error).toMatch(/Page 9/)
        expect(miss.text).toBe('')
    })

    it('does not pretend a scan has text', () => {
        expect(slicePdfByPage(PDF_NO_TEXT, 1).error).toBe(PDF_NO_TEXT)
        expect(pdfPromptExcerpt('scan.pdf', PDF_NO_TEXT)).toContain('OCR is not available')
    })

    it('tells the model to call read_document for more than the excerpt', () => {
        const blurb = pdfPromptExcerpt('nietzsche.pdf', sample)
        expect(blurb).toContain('3 pages')
        expect(blurb).toContain('read_document')
        expect(blurb).toContain('Preface')
        expect(blurb).not.toContain('Closing remarks')
        expect(blurb).toContain('Do not quote a page you have not read')
        expect(blurb).toContain('does not make the file that short')
    })

    it('does not paste a PDF body into follow-up history', () => {
        const note = historyAttachmentNote('nietzsche.pdf', sample, 'pdf')
        expect(note).toContain('3 pages are stored')
        expect(note).toContain('read_document')
        expect(note).toContain('page=N')
        expect(note).not.toContain('Closing remarks')
        expect(note).not.toContain('will to power')
        expect(note).toContain('Pages already read')
    })

    it('replaces a prior page read with a stub and keeps a failed read', () => {
        const stub = historyToolResult(
            'read_document',
            JSON.stringify({ name: 'nietzsche.pdf', page: 2 }),
            '[nietzsche.pdf — page 2 of 40]\n[Page 2]\nThe will to power is discussed here.'
        )
        expect(stub).toContain('page=2')
        expect(stub).toContain('nietzsche.pdf')
        expect(stub).not.toContain('will to power')
        expect(stub).toContain('not the length')
        const error = historyToolResult(
            'read_document',
            '{}',
            '{"ok":false,"error":"Page 9 is not in this extract"}'
        )
        expect(error).toContain('Page 9')
        expect(historyToolResult('web_search', '{}', '[Page 1]\nleave this search hit')).toContain('leave this search hit')
    })

    it('strips a pasted PDF from an older user turn without inventing a page count', () => {
        const cleaned = omitPastedPdfBodies(
            `What does chapter 4 say?\n\n[Document: book.pdf]\n${sample}\n\n[Document: notes.txt]\nkeep this note`
        )
        expect(cleaned).toContain('What does chapter 4 say?')
        expect(cleaned).toContain('keep this note')
        expect(cleaned).toContain('call read_document')
        expect(cleaned).not.toContain('Closing remarks')
        expect(cleaned).not.toContain('3 pages are stored')
    })
})
