import { beforeEach, describe, expect, it, vi } from 'vitest'

const texts: { text: string; size: number }[] = []
let saved = ''

vi.mock('jspdf', () => {
    class FakePdf {
        private size = 11
        addPage() {}
        addFileToVFS() {}
        addFont() {}
        setFont() {}
        setFontSize(size: number) {
            this.size = size
        }
        setTextColor() {}
        setDrawColor() {}
        setFillColor() {}
        setLineWidth() {}
        splitTextToSize(text: string) {
            return text.split('\n')
        }
        text(text: string) {
            texts.push({ text, size: this.size })
        }
        line() {}
        rect() {}
        addImage() {}
        setProperties() {}
        save(name: string) {
            saved = name
        }
    }
    return { default: FakePdf }
})

import { notebookFootnoteEntries, writeNotebookPdf } from './exportNotebookPdf'

describe('PDF export keeps footnotes', () => {
    beforeEach(() => {
        texts.length = 0
        saved = ''
        // No network in tests: the Unicode font fetch fails and the writer falls back to Helvetica.
        vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    })

    it('writes a Footnotes section with APA references after the body', async () => {
        const markdown = [
            '# Paper',
            '',
            'Technology frames the world[^1] and shapes attention[^2].',
            '',
            '[^1]: Heidegger, M. (1977). The question concerning technology. Harper & Row.',
            '[^2]: Doe, J. (2020). Attention. Journal of Tests, 1(2), 3–4. https://doi.org/10.1/abc',
        ].join('\n')
        await writeNotebookPdf('Paper', markdown, 'paper.pdf')
        expect(saved).toBe('paper.pdf')
        const lines = texts.map((t) => t.text)
        const body = lines.findIndex((l) => l.includes('Technology frames the world[1]'))
        const header = lines.indexOf('Footnotes')
        expect(body).toBeGreaterThan(-1)
        expect(header).toBeGreaterThan(body)
        expect(lines[header + 1]).toBe('1. Heidegger, M. (1977). The question concerning technology. Harper & Row.')
        expect(lines[header + 2]).toMatch(/^2\. Doe, J\. \(2020\)\. Attention\..*https:\/\/doi\.org\/10\.1\/abc$/)
        // Smaller than body text, like the print export
        expect(texts[header + 1].size).toBeLessThan(11)
    })

    it('writes no Footnotes heading when there are none', async () => {
        await writeNotebookPdf('Plain', '# Plain\n\nJust text.', 'plain.pdf')
        expect(texts.map((t) => t.text)).not.toContain('Footnotes')
    })

    it('labels entries with their ids', () => {
        expect(notebookFootnoteEntries({ '1': 'A', '2': ' ', '3': 'C' })).toEqual([
            { label: '1', text: 'A' },
            { label: '3', text: 'C' },
        ])
    })
})
