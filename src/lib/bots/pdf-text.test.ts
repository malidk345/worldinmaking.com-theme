import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { detectPrintedPageOffset, extractPdfPages, looksLikePdf, pdfItemsToText, pdfPageLabel } from './pdf-text'

// 3-page PDF with FlateDecode content streams + an object stream and an embedded
// (subset) Unicode font — the structure DergiPark PDFs use. Printed pages 131–133.
const FIXTURE = new Uint8Array(readFileSync(path.join(__dirname, 'tools/__fixtures__/compressed-tr.pdf')))

describe('extractPdfPages (unpdf / pdf.js)', () => {
    it('reads compressed / object-stream PDFs with Turkish text and real page numbers', async () => {
        const raw = new TextDecoder('latin1').decode(FIXTURE)
        expect(raw).toContain('/ObjStm')
        expect(raw).not.toMatch(/\bBT\b[\s\S]*\bET\b/) // nothing for the legacy byte scan
        const res = await extractPdfPages(FIXTURE)
        expect(res.totalPages).toBe(3)
        expect(res.truncated).toBe(false)
        expect(res.pages.map((p) => p.page)).toEqual([1, 2, 3])
        expect(res.pages[0].text).toContain('Heidegger, tekniğin özünün teknik bir şey olmadığını')
        expect(res.pages[1].text).toContain('Ekolojik kriz bu unutkanlığın bir sonucudur.') // "unut-\nkanlığın" joined
        expect(res.pages.map((p) => p.printed)).toEqual([131, 132, 133])
        expect(pdfPageLabel(res.pages[1])).toBe('p. 132 (PDF page 2)')
        expect(pdfPageLabel({ page: 15, printed: 15, text: '' })).toBe('p. 15')
        expect(pdfPageLabel({ page: 3, text: '' })).toBe('PDF page 3')
    })

    it('honors page, character and time caps', async () => {
        const byPages = await extractPdfPages(FIXTURE, { maxPages: 2 })
        expect(byPages.pages).toHaveLength(2)
        expect(byPages).toMatchObject({ truncated: true, note: 'first 2 of 3 pages read' })
        const byChars = await extractPdfPages(FIXTURE, { maxChars: 50 })
        expect(byChars.pages).toHaveLength(1)
        expect(byChars.note).toMatch(/text limit/)
        let t = 0
        const byTime = await extractPdfPages(FIXTURE, { timeBudgetMs: 5, now: () => (t += 10) })
        expect(byTime.pages).toHaveLength(1)
        expect(byTime.note).toMatch(/time limit/)
    })

    it('refuses oversized and non-PDF input (callers fall back to the legacy reader)', async () => {
        await expect(extractPdfPages(FIXTURE, { maxBytes: 1000 })).rejects.toThrow(/larger than/)
        await expect(extractPdfPages(new TextEncoder().encode('<html>landing page</html>'))).rejects.toThrow('not a PDF')
        expect(looksLikePdf(new TextEncoder().encode('\ufeff%PDF-1.7'))).toBe(true)
    })
})

describe('text helpers', () => {
    it('joins items into lines and de-hyphenates only lowercase word breaks', () => {
        expect(
            pdfItemsToText([
                { str: 'bırakma-', hasEOL: true },
                { str: 'sının nedeni', hasEOL: true },
                { str: 'Ge-', hasEOL: true },
                { str: 'Stell', hasEOL: false },
            ])
        ).toBe('bırakmasının nedeni\nGe-\nStell')
    })

    it('detects journal pagination only when most pages agree', () => {
        const pages = [131, 132, 133, 134].map((n, i) => ({ page: i + 1, text: `Dergi ${i === 0 ? '' : n}\nbody text 2020\n${i === 0 ? n : ''}` }))
        expect(detectPrintedPageOffset(pages)).toBe(130)
        expect(detectPrintedPageOffset([{ page: 1, text: '5' }, { page: 2, text: '9' }, { page: 3, text: '40' }])).toBeNull()
        expect(detectPrintedPageOffset(pages.slice(0, 2))).toBeNull()
    })
})
