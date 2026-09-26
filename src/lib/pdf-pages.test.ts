import { describe, expect, it } from 'vitest'
import { PDF_NO_TEXT, pdfPageCount, pdfPromptExcerpt, slicePdfByPage } from './pdf-pages'

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
    })
})
