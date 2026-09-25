import { describe, expect, it } from 'vitest'
import { buildPriorCitations, formatPriorCitationsContext, parsePriorCitations, PRIOR_CITATIONS_CONTEXT_MAX, PRIOR_CITATIONS_MAX } from './prior-citations'
import { parsePaperRef } from '../bots/academic-graph'

const older = { role: 'assistant', citations: [
    { id: 1, title: 'Old paper', url: 'https://doi.org/10.1000/old', doi: '10.1000/old', kind: 'paper' as const, authors: ['Ann Old'], year: 1999 },
    { id: 3, title: 'Being and Time', url: 'https://doi.org/10.1000/bt', doi: '10.1000/bt', kind: 'paper' as const, authors: ['Martin Heidegger'], year: 1927 },
] }
const latest = { role: 'assistant', citations: [
    { id: 1, title: 'New paper', url: 'https://doi.org/10.1000/new', doi: '10.1000/new', kind: 'paper' as const, authors: ['Nia New', 'B'], year: 2021 },
    { id: 2, title: 'A web page', url: 'https://example.org/page', kind: 'web' as const },
] }

describe('prior-turn citations', () => {
    it('keeps the latest reply’s [P#] ids, compact fields, no snippets', () => {
        const list = buildPriorCitations([{ role: 'user' }, older, { role: 'user' }, latest, { role: 'user' }])
        expect(list).toEqual([
            { id: 1, title: 'New paper', author: 'Nia New', year: 2021, doi: '10.1000/new', kind: 'paper', turnsAgo: 1 },
            { id: 2, title: 'A web page', url: 'https://example.org/page', kind: 'web', turnsAgo: 1 },
            { id: 3, title: 'Being and Time', author: 'Martin Heidegger', year: 1927, doi: '10.1000/bt', kind: 'paper', turnsAgo: 2 },
        ])
    })

    it('is capped in count and context length', () => {
        const many = { role: 'assistant', citations: Array.from({ length: 60 }, (_, i) => ({ id: i + 1, title: `Paper ${i + 1} ${'x'.repeat(300)}`, url: `https://doi.org/10.1000/${i}`, doi: `10.1000/${i}` })) }
        const list = buildPriorCitations([many])
        expect(list).toHaveLength(PRIOR_CITATIONS_MAX)
        expect(list[0].title.length).toBeLessThanOrEqual(160)
        const parsed = parsePriorCitations(list)
        const text = formatPriorCitationsContext(parsed)
        expect(text.length).toBeLessThan(PRIOR_CITATIONS_CONTEXT_MAX + 700)
    })

    it('the server sanitizes the untrusted list', () => {
        const parsed = parsePriorCitations([{ id: 3, title: 'Being and Time', doi: 'https://doi.org/10.1000/bt', year: 1927, author: 'Martin Heidegger', kind: 'paper' }, { id: 'x' }, { id: 4, title: '' }, { id: 5, title: 'Bad url', url: 'javascript:alert(1)' }])
        expect(parsed).toEqual([
            { id: 3, title: 'Being and Time', url: 'https://doi.org/10.1000/bt', snippet: '', authors: ['Martin Heidegger'], year: 1927, doi: '10.1000/bt', kind: 'paper' },
            { id: 5, title: 'Bad url', url: '', snippet: '' },
        ])
        expect(formatPriorCitationsContext(parsed)).toContain('- [P3] Being and Time — Martin Heidegger (1927) doi:10.1000/bt')
    })

    it('related_papers / find_quotes can resolve an earlier [P#] by its DOI (this turn wins on a clash)', () => {
        const prior = parsePriorCitations(buildPriorCitations([older, latest]))
        const res = parsePaperRef('P3', [], prior)
        expect(res.ok && res.ref.doi).toBe('10.1000/bt')
        expect(res.ok && res.ref.existingId).toBeUndefined()
        const web = parsePaperRef('[P2]', [], prior)
        expect(web.ok).toBe(false)
        const thisTurn = [{ id: 3, title: 'Current', url: 'https://doi.org/10.9999/cur', snippet: '', doi: '10.9999/cur', kind: 'paper' as const }]
        const clash = parsePaperRef('P3', thisTurn, prior)
        expect(clash.ok && clash.ref.doi).toBe('10.9999/cur')
        expect(parsePaperRef('P7', [], prior).ok).toBe(false)
    })
})
