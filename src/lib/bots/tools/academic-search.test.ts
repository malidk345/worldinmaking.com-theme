import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { executeToolCall } from './execute'
import {
    formatApaBibliography,
    rankAcademicPapers,
    reconstructAbstract,
    scoreAcademicPaper,
    searchAcademicCorpus,
    type AcademicPaper,
} from '../academic-search'

describe('search_academic_corpus tool & academic-search', () => {
    const originalFetch = globalThis.fetch

    beforeEach(() => {
        vi.restoreAllMocks()
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
            expect(bib).toContain('Gilbert Ryle (1949). The Concept of Mind. *Hutchinson*. https://doi.org/10.4324/9780203875858')
            expect(bib).toContain('Willard Van Orman Quine (1960). Word and Object. *MIT Press*.')
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

        it('resolves tool name alias academic_search and normalizes arguments', async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
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
                }),
            })
            globalThis.fetch = mockFetch

            const result = await executeToolCall({
                id: 'call-2',
                name: 'academic_search',
                argumentsJson: JSON.stringify({ q: 'category mistake Ryle' }),
            })

            expect(result.name).toBe('search_academic_corpus')
            expect(result.ok).toBe(true)
            const parsed = JSON.parse(result.result)
            expect(parsed.ok).toBe(true)
            expect(parsed.papers[0].title).toBe('The Concept of Mind')
            expect(parsed.papers[0].authors[0]).toBe('Gilbert Ryle')
            expect(parsed.papers[0].citationCount).toBe(14500)
            expect(parsed.bibliography).toContain('References')
            expect(result.citations).toBeDefined()
            expect(result.citations?.[0].title).toContain('Gilbert Ryle')
        })

        it('forwards year_from, sort_by, and open_access_only filters to OpenAlex query', async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    results: [],
                }),
            })
            globalThis.fetch = mockFetch

            await executeToolCall({
                id: 'call-filters',
                name: 'search_academic_corpus',
                argumentsJson: JSON.stringify({
                    query: 'quantum entanglement',
                    year_from: 2020,
                    year_to: 2024,
                    sort_by: 'citations',
                    open_access_only: true,
                }),
            })

            expect(mockFetch).toHaveBeenCalled()
            const requestedUrl = mockFetch.mock.calls[0][0] as string
            expect(requestedUrl).toContain('filter=')
            expect(requestedUrl).toContain('publication_year%3A%3E2019')
            expect(requestedUrl).toContain('publication_year%3A%3C2025')
            expect(requestedUrl).toContain('is_oa%3Atrue')
            expect(requestedUrl).toContain('sort=cited_by_count:desc')
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
        it('queries real peer-reviewed literature from OpenAlex', async () => {
            const result = await searchAcademicCorpus('Spinoza substance monism attribute', { limit: 3 })
            if (!result.ok && result.papers.length === 0) return
            expect(result.ok).toBe(true)
            expect(result.papers.length).toBeGreaterThan(0)

            const first = result.papers[0]
            expect(first.title).toBeDefined()
            expect(first.authors.length).toBeGreaterThan(0)
            expect(first.citationCount).toBeGreaterThan(0)
            expect(result.formatted).toContain(first.title)
            expect(result.bibliography).toContain('References')
        }, 15000)

        it('queries recent literature with publication date filter and sorting', async () => {
            const result = await searchAcademicCorpus('Large language model reasoning', {
                limit: 3,
                yearFrom: 2023,
                sortBy: 'citations',
            })
            // If external public rate limits occur on OpenAlex/ArXiv in CI/dev, do not fail the build
            if (!result.ok && result.papers.length === 0) return
            expect(result.ok).toBe(true)
            expect(result.papers.length).toBeGreaterThan(0)
            for (const paper of result.papers) {
                if (paper.year) {
                    expect(paper.year).toBeGreaterThanOrEqual(2023)
                }
            }
        }, 15000)
    })
})
