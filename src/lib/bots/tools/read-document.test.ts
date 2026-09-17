import { describe, expect, it } from 'vitest'
import { PDF_NO_TEXT } from '../../pdf-pages'
import { executeReadDocument } from './read-document'

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
