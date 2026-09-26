import { readFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PDF_NO_TEXT } from '../../pdf-pages'
import { executeReadDocument, readRemotePdfPages } from './read-document'

const pdf = [
    '[Page 1]',
    'Opening.',
    '',
    '[Page 12]',
    'The category mistake is introduced on this page.',
].join('\n')

describe('executeReadDocument page slices', () => {
    it('reads a real page from an uploaded scratchpad PDF', async () => {
        const result = await executeReadDocument(
            { name: 'ryle.pdf', page: 12 },
            {
                scratchpad: {
                    documents: [{ name: 'ryle.pdf', type: 'pdf', content: pdf, pageCount: 12 }],
                },
            }
        )
        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.text).toContain('category mistake')
            expect(result.text).toContain('page 12')
            expect(result.text).not.toContain('Opening.')
        }
    })

    it('reads a later page from the attachment when the scratchpad row has no text', async () => {
        const pages = ['[Page 1]', 'Opening.', '', '[Page 5]', 'The later chapter.'].join('\n')
        const result = await executeReadDocument(
            { name: 'book.pdf', page: 5 },
            {
                scratchpad: { documents: [{ name: 'book.pdf', type: 'pdf', pageCount: 5 }] },
                attachments: [{ name: 'book.pdf', content: pages }],
            }
        )
        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.text).toContain('later chapter')
            expect(result.text).toContain('page 5')
            expect(result.text).not.toContain('Opening.')
        }
    })

    it('returns a page index, not the book, when no page is asked', async () => {
        const long = ['[Page 1]', 'Opening.', '', '[Page 2]', `Body ${'zeta'.repeat(40)}.`].join('\n')
        const result = await executeReadDocument(
            { name: 'ryle.pdf' },
            { attachments: [{ name: 'ryle.pdf', content: long }] }
        )
        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.text).toContain('Page index only')
            expect(result.text).toContain('2. Body')
            expect(result.text).not.toContain('zeta'.repeat(40))
        }
    })

    it('fails closed on a scanned PDF', async () => {
        const result = await executeReadDocument(
            { name: 'scan.pdf' },
            {
                attachments: [{ name: 'scan.pdf', content: PDF_NO_TEXT }],
            }
        )
        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.error).toContain('OCR')
    })
})

describe('executeReadDocument bound notebook + attachment fail-closed', () => {
    it('returns bound notebook body, never the notebookId string', async () => {
        const result = await executeReadDocument(
            { name: 'Kant' },
            {
                notebookId: 'nb-kant',
                notebookTitle: 'Kant Notes',
                notebooks: [
                    {
                        id: 'nb-kant',
                        title: 'Kant Notes',
                        content: '# Transcendental Aesthetic\n\nSpace and time as forms of intuition.',
                    },
                ],
            }
        )
        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.text).toContain('Space and time as forms of intuition')
            expect(result.text).not.toMatch(/(^|\n)nb-kant(\n|$)/)
            expect(result.text).not.toBe('[Document: Kant Notes]\nnb-kant')
        }
    })

    it('uses selection when bound notebooks[] row has no content yet', async () => {
        const result = await executeReadDocument(
            { name: 'Kant' },
            {
                notebookId: 'nb-kant',
                notebookTitle: 'Kant Notes',
                selection: 'Highlighted critique passage about schemata.',
                notebooks: [{ id: 'nb-kant', title: 'Kant Notes', content: '' }],
            }
        )
        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.text).toContain('schemata')
            expect(result.text).not.toContain('nb-kant')
        }
    })

    it('fails closed when an explicit attachment name does not match', async () => {
        const result = await executeReadDocument(
            { name: 'missing-paper.pdf' },
            {
                attachments: [{ name: 'only-paper.pdf', content: 'Secret sole attachment body.' }],
            }
        )
        expect(result.ok).toBe(false)
        if (!result.ok) {
            expect(result.error).toContain('not found')
            expect(result.error).not.toContain('Secret sole attachment')
        }
    })
})

describe('executeReadDocument remote PDFs (pdf.js first, legacy scan preserved)', () => {
    const fixture = readFileSync(path.join(__dirname, '__fixtures__/compressed-tr.pdf'))
    afterEach(() => vi.unstubAllGlobals())
    const serve = (body: BodyInit, type = 'application/pdf') =>
        vi.stubGlobal('fetch', vi.fn(async () => new Response(body, { status: 200, headers: { 'content-type': type } })))

    it('reads a compressed PDF with real page numbers (was: no text)', async () => {
        serve(new Uint8Array(fixture))
        const res = await executeReadDocument({ url: 'https://1.1.1.1/dergipark/article-file/1' })
        expect(res.ok).toBe(true)
        const text = res.ok ? res.text : ''
        expect(text).toContain('[Page 2]\n132\nBu nedenle hesaplayan düşünce')
        expect(text).toContain('[Page 3]')
        const page = await executeReadDocument({ url: 'https://1.1.1.1/a.pdf', page: 3 })
        expect(page.ok && page.text).toContain('page 3 of 3]\n133\nSonuç')
    })

    it('keeps the legacy BT/ET scan for simple PDFs pdf.js cannot open', async () => {
        serve(`%PDF-1.4\n1 0 obj\n<< >>\nstream\nBT\n/F1 12 Tf\n(Legacy text survives) Tj\nET\nendstream\nendobj\n%%EOF`)
        const res = await executeReadDocument({ url: 'https://1.1.1.1/legacy.pdf' })
        expect(res).toEqual({ ok: true, text: '[Document Content for https://1.1.1.1/legacy.pdf]\n[Page 1]\nLegacy text survives' })
    })

    it('HTML keeps the 500 KB window and tag stripping', async () => {
        serve(`<html><script>x()</script><p>Hello   world</p>${'a'.repeat(600_000)}</html>`, 'text/html')
        const res = await executeReadDocument({ url: 'https://1.1.1.1/page' })
        expect(res.ok && res.text.startsWith('[Document Content for https://1.1.1.1/page]\nHello world a')).toBe(true)
    })

    it('readRemotePdfPages: all pages for find_quotes, HTML flagged as notPdf, fetch errors flagged', async () => {
        serve(new Uint8Array(fixture))
        const ok = await readRemotePdfPages('https://1.1.1.1/x.pdf')
        expect(ok.ok && ok.pdf.pages.map((p) => p.printed)).toEqual([131, 132, 133])
        serve('<html></html>', 'text/html')
        expect(await readRemotePdfPages('https://1.1.1.1/landing')).toMatchObject({ ok: false, notPdf: true })
        vi.stubGlobal('fetch', vi.fn(async () => new Response('gone', { status: 404 })))
        expect(await readRemotePdfPages('https://1.1.1.1/missing.pdf')).toMatchObject({ ok: false, fetchFailed: true, error: 'document fetch failed (404)' })
        expect(await readRemotePdfPages('http://127.0.0.1/secret.pdf')).toMatchObject({ ok: false, fetchFailed: true })
    })

    it('readRemotePdfPages: a PDF pdf.js cannot open is scanned from the same download (no second fetch)', async () => {
        const fetchMock = vi.fn(
            async () =>
                new Response(`%PDF-1.4\n1 0 obj\n<< >>\nstream\nBT\n/F1 12 Tf\n(Legacy text survives) Tj\nET\nendstream\nendobj\n%%EOF`, {
                    status: 200,
                    headers: { 'content-type': 'application/pdf' },
                })
        )
        vi.stubGlobal('fetch', fetchMock)
        const res = await readRemotePdfPages('https://1.1.1.1/legacy.pdf')
        expect(res).toMatchObject({ ok: false, legacyText: '[Page 1]\nLegacy text survives' })
        expect(fetchMock).toHaveBeenCalledTimes(1)
        // Image-only / empty PDF: nothing from either reader, still one download.
        fetchMock.mockClear()
        fetchMock.mockImplementation(async () => new Response('%PDF-1.4\n%%EOF', { status: 200, headers: { 'content-type': 'application/pdf' } }))
        expect(await readRemotePdfPages('https://1.1.1.1/scan.pdf')).toMatchObject({ ok: false, legacyText: '' })
        expect(fetchMock).toHaveBeenCalledTimes(1)
    })
})
