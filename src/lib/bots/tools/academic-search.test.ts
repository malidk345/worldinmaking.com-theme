import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { executeToolCall } from './execute'
import {
    formatApaBibliography,
    rankAcademicPapers,
    reconstructAbstract,
    scoreAcademicPaper,
    searchAcademicCorpus,
    __resetAcademicSearchStateForTests,
    type AcademicPaper,
} from '../academic-search'

describe('search_academic_corpus tool & academic-search', () => {
    const originalFetch = globalThis.fetch

    beforeEach(() => {
        vi.restoreAllMocks()
        vi.spyOn(console, 'info').mockImplementation(() => undefined)
        __resetAcademicSearchStateForTests(0)
    })

    afterEach(() => {
        globalThis.fetch = originalFetch
    })

    describe('reconstructAbstract', () => {
        it('correctly reconstructs inverted word index into readable text', () => {
            const inverted = {
                Knowledge: [0],
                is: [1],
                justified: [2],
                true: [3],
                'belief.': [4],
            }
            const text = reconstructAbstract(inverted)
            expect(text).toBe('Knowledge is justified true belief.')
        })

        it('handles null and empty indexes gracefully', () => {
            expect(reconstructAbstract(null)).toBe('')
            expect(reconstructAbstract(undefined)).toBe('')
            expect(reconstructAbstract({})).toBe('')
        })
    })

    describe('formatApaBibliography', () => {
        it('formats papers into proper APA style references', () => {
            const papers = [
                {
                    id: 'w1',
                    title: 'The Concept of Mind',
                    authors: ['Gilbert Ryle'],
                    year: 1949,
                    venue: 'Hutchinson',
                    citationCount: 14500,
                    doi: 'https://doi.org/10.4324/9780203875858',
                    source: 'OpenAlex' as const,
                },
                {
                    id: 'w2',
                    title: 'Word and Object',
                    authors: ['Willard Van Orman Quine'],
                    year: 1960,
                    venue: 'MIT Press',
                    citationCount: 12000,
                    source: 'OpenAlex' as const,
                },
            ]
            const bib = formatApaBibliography(papers)
            expect(bib).toContain('### References')
            // APA 7 author inversion ("Van" here is a middle name, not a particle).
            expect(bib).toContain('Ryle, G. (1949). The Concept of Mind. *Hutchinson*. https://doi.org/10.4324/9780203875858')
            expect(bib).toContain('Quine, W. V. O. (1960). Word and Object. *MIT Press*.')
        })
    })

    describe('executeToolCall dispatch and validation', () => {
        it('rejects empty query', async () => {
            const result = await executeToolCall({
                id: 'call-1',
                name: 'search_academic_corpus',
                argumentsJson: JSON.stringify({}),
            })

            expect(result.ok).toBe(false)
            const parsed = JSON.parse(result.result)
            expect(parsed.ok).toBe(false)
            expect(parsed.error).toContain('query is required')
        })

        it('resolves tool name alias academic_search and returns a compact [P#] payload', async () => {
            const openAlexBody = {
                results: [
                    {
                        id: 'https://openalex.org/W123',
                        title: 'The Concept of Mind',
                        publication_year: 1949,
                        doi: 'https://doi.org/10.4324/9780203875858',
                        cited_by_count: 14500,
                        primary_location: { source: { display_name: 'Hutchinson' } },
                        authorships: [{ author: { display_name: 'Gilbert Ryle' } }],
                        abstract_inverted_index: { Category: [0], mistake: [1] },
                    },
                ],
            }
            globalThis.fetch = vi.fn(async (url: string) => {
                if (String(url).includes('api.openalex.org')) return new Response(JSON.stringify(openAlexBody), { status: 200 })
                if (String(url).includes('api.crossref.org')) return new Response(JSON.stringify({ message: { items: [] } }), { status: 200 })
                if (String(url).includes('semanticscholar')) return new Response(JSON.stringify({ total: 0, data: [] }), { status: 200 })
                if (String(url).includes('openaire')) return new Response(JSON.stringify({ results: [] }), { status: 200 })
                if (String(url).includes('zenodo')) return new Response(JSON.stringify({ hits: { hits: [] } }), { status: 200 })
                return new Response('{}', { status: 404 })
            }) as unknown as typeof fetch

            const result = await executeToolCall({
                id: 'call-2',
                name: 'academic_search',
                argumentsJson: JSON.stringify({ q: 'category mistake Ryle' }),
            })

            expect(result.name).toBe('search_academic_corpus')
            expect(result.ok).toBe(true)
            expect(result.result).toContain('[P1] Gilbert Ryle (1949). The Concept of Mind. Hutchinson.')
            expect(result.result).toContain('https://doi.org/10.4324/9780203875858')
            expect(result.result).toContain('cites:14500')
            expect(result.result).toContain('Sources: openalex ok(1)')
            expect(result.result).toContain('[P#]')
            // No duplicate JSON / bibliography copies for the model.
            expect(result.result).not.toContain('"papers"')
            expect(result.result).not.toContain('### References')
            expect(result.citations).toBeDefined()
            expect(result.citations?.[0].id).toBe(1)
            expect(result.citations?.[0].title).toBe('The Concept of Mind')
            expect(result.citations?.[0]).toMatchObject({ kind: 'paper', authors: ['Gilbert Ryle'], year: 1949, doi: '10.4324/9780203875858' })
            expect(result.citations?.[0].url).toBe('https://doi.org/10.4324/9780203875858')
        })

        it('forwards year_from, year_to, sort_by, open_access_only, language, type and field filters to OpenAlex', async () => {
            const mockFetch = vi.fn(async () => new Response(JSON.stringify({ results: [] }), { status: 200 }))
            globalThis.fetch = mockFetch as unknown as typeof fetch

            await executeToolCall({
                id: 'call-filters',
                name: 'search_academic_corpus',
                argumentsJson: JSON.stringify({
                    query: 'Heidegger technology',
                    field: 'philosophy',
                    year_from: 2020,
                    year_to: 2024,
                    sort_by: 'citations',
                    open_access_only: true,
                    language: 'tr',
                    type: 'article',
                }),
            })

            const calls = mockFetch.mock.calls as unknown as Array<[string]>
            const requestedUrl = calls.map((c) => String(c[0])).find((u) => u.includes('api.openalex.org')) as string
            expect(requestedUrl).toBeDefined()
            const parsed = new URL(requestedUrl)
            const filter = parsed.searchParams.get('filter') || ''
            expect(filter).toContain('publication_year:>2019')
            expect(filter).toContain('publication_year:<2025')
            expect(filter).toContain('is_oa:true')
            expect(filter).toContain('language:tr')
            expect(filter).toContain('type:article')
            expect(filter).toContain('topics.subfield.id:1211')
            expect(parsed.searchParams.get('sort')).toBe('cited_by_count:desc')
            // field is a real filter, not appended search text
            expect(parsed.searchParams.get('search')).toBe('Heidegger technology')
            expect(requestedUrl).not.toContain('concepts')
        })
    })

    describe('relevance ranking', () => {
        const ryle: AcademicPaper = {
            id: '1',
            title: 'The Concept of Mind',
            authors: ['Gilbert Ryle'],
            year: 1949,
            venue: 'Hutchinson',
            citationCount: 100,
            source: 'OpenAlex',
        }
        const unrelated: AcademicPaper = {
            id: '2',
            title: 'Soil moisture in the Andes',
            authors: ['Jane Soil'],
            year: 2024,
            citationCount: 9000,
            source: 'Crossref',
        }

        it('scores a title/author hit above a high-cite mismatch', () => {
            expect(scoreAcademicPaper('Ryle category mistake mind', ryle)).toBeGreaterThan(
                scoreAcademicPaper('Ryle category mistake mind', unrelated)
            )
        })

        it('ranks the matching paper first under relevance', () => {
            const ranked = rankAcademicPapers('Ryle Concept of Mind', [unrelated, ryle], 'relevance')
            expect(ranked[0].id).toBe('1')
        })
    })

    describe('live academic API integration', () => {
        it('queries real peer-reviewed literature (network; tolerant of provider outages)', async () => {
            const result = await searchAcademicCorpus('Spinoza substance monism attribute', { limit: 3 })
            if (!result.ok || result.papers.length === 0) return
            const first = result.papers[0]
            expect(first.title).toBeDefined()
            expect(result.formatted).toContain(first.title)
            expect(result.bibliography).toContain('References')
            // 9 paper sources + SEP / IEP (a Turkish pass would add openalex[tr] / crossref[tr]).
            expect(result.sources?.length).toBeGreaterThanOrEqual(11)
        }, 20000)

        it('queries recent literature with publication date filter and sorting', async () => {
            const result = await searchAcademicCorpus('Large language model reasoning', {
                limit: 3,
                yearFrom: 2023,
                sortBy: 'citations',
            })
            // If external public rate limits occur in CI/dev, do not fail the build
            if (!result.ok || result.papers.length === 0) return
            for (const paper of result.papers) {
                if (paper.year) {
                    expect(paper.year).toBeGreaterThanOrEqual(2023)
                }
            }
        }, 20000)
    })
})
