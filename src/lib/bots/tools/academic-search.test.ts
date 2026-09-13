import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { executeToolCall } from './execute'
import { reconstructAbstract, searchAcademicCorpus } from '../academic-search'

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
            expect(result.citations).toBeDefined()
            expect(result.citations?.[0].title).toContain('Gilbert Ryle')
        })
    })

    describe('live academic API integration', () => {
        it('queries real peer-reviewed literature from OpenAlex', async () => {
            const result = await searchAcademicCorpus('Spinoza substance monism attribute', { limit: 3 })
            expect(result.ok).toBe(true)
            expect(result.papers.length).toBeGreaterThan(0)

            const first = result.papers[0]
            expect(first.title).toBeDefined()
            expect(first.authors.length).toBeGreaterThan(0)
            expect(first.citationCount).toBeGreaterThan(0)
            expect(result.formatted).toContain(first.title)
        }, 15000)
    })
})
