import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../web-search', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../web-search')>()
    return {
        ...actual,
        searchWebSources: vi.fn(async () => [
            {
                title: 'Martin Heidegger (Stanford Encyclopedia of Philosophy)',
                url: 'https://plato.stanford.edu/entries/heidegger/',
                snippet: 'Heidegger on technology and Gestell.',
                source: 'Tavily',
            },
            {
                title: 'Enframing paper',
                url: 'https://doi.org/10.1234/ENFRAME.1',
                snippet: 'A DOI landing page.',
                source: 'Brave',
            },
        ]),
    }
})

import { executeToolCall } from './execute'
import { __resetAcademicSearchStateForTests } from '../academic-search'

describe('academic search web fallback hygiene', () => {
    const originalFetch = globalThis.fetch
    beforeEach(() => {
        vi.spyOn(console, 'info').mockImplementation(() => undefined)
        __resetAcademicSearchStateForTests(0)
        globalThis.fetch = vi.fn(async (url: string) => {
            const u = String(url)
            if (u.includes('openalex')) return new Response(JSON.stringify({ results: [] }), { status: 200 })
            if (u.includes('crossref')) return new Response(JSON.stringify({ message: { items: [] } }), { status: 200 })
            if (u.includes('semanticscholar')) return new Response(JSON.stringify({ total: 0, data: [] }), { status: 200 })
            return new Response('{}', { status: 404 })
        }) as unknown as typeof fetch
    })
    afterEach(() => {
        globalThis.fetch = originalFetch
        vi.restoreAllMocks()
    })

    it('never puts page URLs in doi or domains in authors; citations keep the page URL', async () => {
        const executed = await executeToolCall(
            {
                id: 'web-1',
                name: 'search_academic_corpus',
                argumentsJson: JSON.stringify({ query: 'zzqx Heidegger obscure enframing' }),
            },
            {}
        )
        expect(executed.ok).toBe(true)
        expect(executed.result).toContain('general web results')
        const lines = executed.result.split('\n').filter((l) => l.startsWith('[P'))
        const sep = lines.find((l) => l.includes('Stanford Encyclopedia')) || ''
        expect(sep).toContain('Unknown author')
        expect(sep).toContain('plato.stanford.edu.')
        expect(sep).toContain('link:https://plato.stanford.edu/entries/heidegger/')
        expect(sep).not.toContain('https://doi.org/https')
        const doiLine = lines.find((l) => l.includes('Enframing paper')) || ''
        expect(doiLine).toContain('https://doi.org/10.1234/enframe.1.')
        const cites = executed.citations || []
        expect(cites.find((c) => c.title.includes('Stanford'))?.url).toBe('https://plato.stanford.edu/entries/heidegger/')
        const webCite = cites.find((c) => c.title.includes('Stanford'))
        // Web fallback hits are web sources (no fake authors / year / DOI).
        expect(webCite?.kind).toBe('web')
        expect(webCite?.authors).toBeUndefined()
        expect(webCite?.year).toBeUndefined()
        expect(webCite?.doi).toBeUndefined()
    })
})
