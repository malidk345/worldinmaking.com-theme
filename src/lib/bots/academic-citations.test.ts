import { describe, expect, it, vi } from 'vitest'
import type { AiCitation } from '../ai/contracts'
import { academicResultsToCitations, extractDois, renumberToolCitations, verifyAnswerCitations } from './academic-citations'
import type { DoiLookup } from './academic-search'

const cite = (over: Partial<AiCitation>): AiCitation => ({ id: 1, title: 't', url: 'https://x.example', snippet: '', ...over })

describe('academic citations', () => {
    it('maps papers + encyclopedia entries to UI citations with metadata (ids match [P#])', () => {
        const citations = academicResultsToCitations(
            [
                {
                    id: 'W1',
                    title: 'The Question Concerning Technology',
                    authors: ['Martin Heidegger'],
                    year: 1977,
                    venue: 'Harper & Row',
                    citationCount: 900,
                    doi: 'https://doi.org/10.1234/QCT',
                    pdfUrl: 'https://oa.example/qct.pdf',
                    source: 'OpenAlex',
                },
                { id: 'W2', title: 'Landing only', authors: [], citationCount: 0, url: 'https://land.example', isOpenAccess: true, source: 'DOAJ' },
            ],
            [{ id: 'sep-heidegger', source: 'SEP', title: 'Martin Heidegger', url: 'https://plato.stanford.edu/entries/heidegger/', excerpt: 'x'.repeat(400) }]
        )
        expect(citations[0]).toMatchObject({
            id: 1,
            kind: 'paper',
            title: 'The Question Concerning Technology',
            authors: ['Martin Heidegger'],
            year: 1977,
            venue: 'Harper & Row',
            citationCount: 900,
            doi: '10.1234/qct',
            pdfUrl: 'https://oa.example/qct.pdf',
            url: 'https://doi.org/10.1234/qct',
        })
        expect(citations[1]).toMatchObject({ id: 2, kind: 'paper', oaUrl: 'https://land.example', url: 'https://land.example' })
        expect(citations[1].pdfUrl).toBeUndefined()
        expect(citations[2]).toMatchObject({ id: 3, kind: 'encyclopedia', source: 'SEP', venue: 'Stanford Encyclopedia of Philosophy' })
        expect(citations[2].snippet.length).toBeLessThanOrEqual(300)
    })

    it('renumbers [P#] labels and ids by the turn offset so they match chat.ts ids', () => {
        const out = renumberToolCitations(
            'search_academic_corpus',
            'ACADEMIC SEARCH\n[P1] A.\n[P2] B. Cite only these papers, by their [P#] id',
            [cite({ id: 1 }), cite({ id: 2 })],
            6
        )
        expect(out.result).toContain('[P7] A.')
        expect(out.result).toContain('[P8] B.')
        expect(out.result).toContain('[P#]')
        expect(out.citations?.map((c) => c.id)).toEqual([7, 8])
        const web = renumberToolCitations('web_search', '[Source 1 - Brave]\nTitle: x\n\n[Source 2 - Brave]', [cite({ id: 1 }), cite({ id: 2 })], 3)
        expect(web.result).toContain('[Source 4 - Brave]')
        expect(web.result).toContain('[Source 5 - Brave]')
        const same = renumberToolCitations('search_academic_corpus', '[P1]', [cite({ id: 1 })], 0)
        expect(same.result).toBe('[P1]')
    })

    it('extracts DOIs from prose but not from code', () => {
        expect(extractDois('See https://doi.org/10.1234/ABC.1. And `10.9999/code`.')).toEqual(['10.1234/abc.1'])
    })

    it('verifies cited markers, titles and DOIs; flags unknown markers and fake DOIs; never touches the answer', async () => {
        const citations: AiCitation[] = [
            cite({ id: 1, kind: 'web', title: 'Some site' }),
            cite({ id: 2, kind: 'paper', title: 'Being and Time Revisited Today', doi: '10.1234/bt' }),
            cite({ id: 3, kind: 'paper', title: 'Enframing and the Essence of Technology', doi: '10.1234/enf' }),
            cite({ id: 4, kind: 'paper', title: 'Uncited paper' }),
            cite({ id: 5, kind: 'encyclopedia', title: 'Martin Heidegger' }),
        ]
        const reply =
            'Heidegger argues [P2] and SEP [5]. As shown in "Enframing and the Essence of Technology", Gestell is key. ' +
            'Also see [P9] and doi 10.5555/real.1 plus https://doi.org/10.5555/fake.2 and 10.1234/BT.'
        const lookupDoi = vi.fn(async (doi: string): Promise<DoiLookup> =>
            doi === '10.5555/real.1' ? { doi, found: true, title: 'A real paper', year: 2001 } : { doi, found: false }
        )
        const checked = await verifyAnswerCitations(reply, citations, { lookupDoi })
        expect(lookupDoi).toHaveBeenCalledTimes(2)
        const byId = new Map(checked.citations.map((c) => [c.id, c]))
        expect(byId.get(2)?.verified).toBe(true)
        expect(byId.get(3)?.verified).toBe(true) // title quoted verbatim
        expect(byId.get(4)?.verified).toBeUndefined()
        expect(byId.get(5)?.verified).toBe(true)
        expect(byId.get(6)).toMatchObject({ title: 'A real paper', doi: '10.5555/real.1', verified: true, source: 'Crossref' })
        expect(byId.get(7)).toMatchObject({ doi: '10.5555/fake.2', verified: false })
        expect(checked.verification).toMatchObject({ unverified: 2, unknownMarkers: ['[9]'] })
        expect(checked.changed).toBe(true)
        // input untouched
        expect(citations[1].verified).toBeUndefined()
    })

    it('does nothing for turns without academic sources and skips transient DOI failures', async () => {
        const lookupDoi = vi.fn(async (doi: string): Promise<DoiLookup> => ({ doi, found: false, transient: true }))
        const web = await verifyAnswerCitations('see [1] and 10.1234/x', [cite({ id: 1, kind: 'web' })], { lookupDoi })
        expect(web.changed).toBe(false)
        expect(web.verification).toBeUndefined()
        expect(lookupDoi).not.toHaveBeenCalled()
        const legacy = await verifyAnswerCitations('see [1]', [cite({ id: 1 })], { lookupDoi })
        expect(legacy.changed).toBe(false)
        const transient = await verifyAnswerCitations('10.1234/zz', [cite({ id: 1, kind: 'paper' })], { lookupDoi })
        expect(transient.citations).toHaveLength(1)
        expect(transient.verification?.unverified).toBe(0)
    })
})
