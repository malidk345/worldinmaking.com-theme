import { describe, expect, it } from 'vitest'
import { prefixUploadSource, seedUploadCitations } from './upload-citations'

const pdf = ['[Page 1]', 'Preface of the book.', '', '[Page 2]', `The will to power ${'Z'.repeat(120)}`].join('\n')

describe('uploaded PDF citations', () => {
    it('registers one card per file and an index, not the whole page', () => {
        const seeded = seedUploadCitations([
            { name: 'nietzsche.pdf', content: pdf },
            { name: 'notes.txt', content: 'plain note' },
        ])
        expect(seeded.citations).toHaveLength(1)
        expect(seeded.citations[0]).toMatchObject({ id: 1, kind: 'upload', title: 'nietzsche.pdf', source: 'Upload' })
        expect(seeded.note).toContain('[P1]')
        expect(seeded.note).toContain('1. Preface of the book.')
        expect(seeded.note).toContain('2. The will to power')
        expect(seeded.note).not.toContain('Z'.repeat(80))
        expect(prefixUploadSource('Attached Document: nietzsche.pdf\npage', seeded.citations)).toContain('[P1]')
    })

    it('does not invent text for a scan', () => {
        const seeded = seedUploadCitations([{ name: 'scan.pdf', content: '[PDF has no extractable text — scanned or image-only. OCR is not available.]' }])
        expect(seeded.citations[0].snippet).toMatch(/do not invent/i)
        expect(seeded.note).toContain('OCR')
    })
})
