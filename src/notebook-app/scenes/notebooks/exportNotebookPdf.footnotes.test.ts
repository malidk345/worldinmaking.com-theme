import { beforeEach, describe, expect, it, vi } from 'vitest'

const texts: { text: string; size: number; weight?: string }[] = []
let saved = ''

vi.mock('jspdf', () => {
    class FakePdf {
        private size = 11
        private weight = 'normal'
        addPage() {}
        addFileToVFS() {}
        addFont() {}
        setFont(_family?: string, style?: string) {
            if (style) this.weight = style
        }
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
            texts.push({ text, size: this.size, weight: this.weight })
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

import { notebookCallout, notebookFootnoteEntries, writeNotebookPdf } from './exportNotebookPdf'

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

describe('PDF export renders callouts', () => {
    beforeEach(() => {
        texts.length = 0
        vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    })

    it('prints a bold label instead of the literal [!TIP] marker', async () => {
        const markdown = ['# Notes', '', '> [!TIP]', '> Keep going.', '', '> [!WARNING]', '> Check the DOI.', '', '> Plain quote.'].join('\n')
        await writeNotebookPdf('Notes', markdown, 'notes.pdf')
        const lines = texts.map((t) => t.text)
        expect(lines.some((l) => l.includes('[!'))).toBe(false)
        const tip = lines.indexOf('Tip')
        expect(tip).toBeGreaterThan(-1)
        expect(texts[tip].weight).toBe('bold')
        expect(lines[tip + 1]).toBe('Keep going.')
        expect(lines[lines.indexOf('Warning') + 1]).toBe('Check the DOI.')
        expect(lines).toContain('Plain quote.')
    })

    it('recognizes the GitHub callout types (also legacy escaped markers) and nothing else', () => {
        expect(notebookCallout('[!NOTE]\nBody')).toEqual({ label: 'Note', body: 'Body' })
        expect(notebookCallout('[!important] Body')).toEqual({ label: 'Important', body: 'Body' })
        expect(notebookCallout('\\[!CAUTION\\]\nBody')).toEqual({ label: 'Caution', body: 'Body' })
        expect(notebookCallout('[!TIP]')).toEqual({ label: 'Tip', body: '' })
        expect(notebookCallout('[!FOO]\nBody')).toBeNull()
        expect(notebookCallout('A quote with [!TIP] inside')).toBeNull()
        expect(notebookCallout('[P1] claim')).toBeNull()
    })
})
