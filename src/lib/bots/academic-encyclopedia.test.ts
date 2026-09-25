import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { filterRelevantEntries, searchIep, type EncyclopediaEntry } from './academic-encyclopedia'
import { __resetCooldownsForTests } from './academic-common'

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })

describe('IEP lookup', () => {
    const originalFetch = globalThis.fetch
    let calls: string[] = []
    beforeEach(() => {
        calls = []
        __resetCooldownsForTests()
    })
    afterEach(() => {
        globalThis.fetch = originalFetch
    })

    it('retries a no-hit multi-word query with the leading term and ranks titles locally', async () => {
        globalThis.fetch = vi.fn(async (input: string) => {
            const url = new URL(String(input))
            calls.push(url.pathname + url.search)
            if (url.pathname.endsWith('/search')) {
                const q = url.searchParams.get('search')
                if (q === 'Heidegger Gestell technology') return json([])
                return json([
                    { id: 1, title: 'Hermeneutics', url: 'https://iep.utm.edu/hermeneu/' },
                    { id: 2, title: 'Martin Heidegger', url: 'https://iep.utm.edu/heidegge/' },
                ])
            }
            return json([{ id: 2, excerpt: { rendered: '<p>Martin Heidegger Martin Heidegger was a German philosopher &hellip;</p>' } }])
        }) as unknown as typeof fetch
        const entries = await searchIep('Heidegger Gestell technology', 1, 'test@example.org')
        expect(calls[0]).toContain('search=Heidegger+Gestell+technology')
        expect(calls[0]).toContain('per_page=10')
        expect(calls[1]).toContain('search=heidegger')
        expect(entries.map((e) => e.title)).toEqual(['Martin Heidegger'])
        expect(entries[0].excerpt).toBe('Martin Heidegger was a German philosopher …')
        expect(filterRelevantEntries('Heidegger Gestell technology', entries)).toHaveLength(1)
    })

    it("keeps a thinker's own short-title entry but drops sub-topic titles that only share the name", () => {
        const entries: EncyclopediaEntry[] = [
            { id: 'a', source: 'IEP', title: 'Aristotle', url: 'https://iep.utm.edu/aristotl/' },
            { id: 'b', source: 'IEP', title: 'Aristotle: Epistemology', url: 'https://iep.utm.edu/aristotle-epistemology/' },
            { id: 'c', source: 'IEP', title: 'Health Care Ethics', url: 'https://iep.utm.edu/h-c-ethi/' },
        ]
        expect(filterRelevantEntries('virtue ethics Aristotle', entries).map((e) => e.id)).toEqual(['a'])
    })
})
