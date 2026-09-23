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
