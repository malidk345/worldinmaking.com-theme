import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runAgentNodePipeline, type AgentPipelineParams, type ChatMessage, type CompletionRound } from './pipeline'
import { __resetAcademicSearchStateForTests } from '../academic-search'
import { __setAcademicCacheForTests } from '../academic-cache'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

function crossrefItems(prefix: string) {
    return {
        message: {
            items: [1, 2].map((n) => ({
                DOI: `10.1234/${prefix}.${n}`,
                title: [`${prefix} study of Spinoza substance ${n}`],
                author: [{ given: 'A', family: `Author${n}` }],
                issued: { 'date-parts': [[2000 + n]] },
            })),
        },
    }
}

describe('pipeline citation numbering', () => {
    const originalFetch = globalThis.fetch
    beforeEach(() => {
        vi.spyOn(console, 'info').mockImplementation(() => undefined)
        vi.spyOn(console, 'warn').mockImplementation(() => undefined)
        __resetAcademicSearchStateForTests(0, 0)
        __setAcademicCacheForTests(null)
        globalThis.fetch = vi.fn(async (input: string) => {
            const url = String(input)
            if (url.includes('api.crossref.org')) {
                const q = new URL(url).searchParams.get('query') || ''
                return json(crossrefItems(q.includes('attribute') ? 'Beta' : 'Alpha'))
            }
            if (url.includes('api.openalex.org')) return json({ results: [] })
            if (url.includes('semanticscholar')) return json({ data: [] })
            if (url.includes('unpaywall')) return json({ is_oa: false })
            if (url.includes('doaj.org')) return json({ results: [] })
            if (url.includes('core.ac.uk')) return json({ results: [] })
            if (url.includes('plato.stanford.edu')) return new Response('<div class="search_results"></div>')
            if (url.includes('iep.utm.edu')) return json([])
            if (url.includes('api.openaire.eu')) return json({ results: [] })
            if (url.includes('zenodo.org')) return json({ hits: { hits: [] } })
            return new Response('nf', { status: 404 })
        }) as unknown as typeof fetch
    })
    afterEach(() => {
        globalThis.fetch = originalFetch
        __setAcademicCacheForTests(undefined)
        vi.restoreAllMocks()
    })

    it('shifts [P#] labels of later academic calls so they match the turn-global citation ids', async () => {
        const seenToolMessages: string[] = []
        const complete: AgentPipelineParams['complete'] = async ({ messages, omitTools }): Promise<CompletionRound> => {
            const tools = messages.filter((m: ChatMessage) => m.role === 'tool')
            if (omitTools && tools.length === 0) return { ok: true, content: 'plan: search', toolCalls: [] }
            if (tools.length === 0) {
                return {
                    ok: true,
                    content: '',
                    toolCalls: [
                        { id: 't1', name: 'search_academic_corpus', argumentsJson: JSON.stringify({ query: 'Spinoza substance monism' }) },
                        { id: 't2', name: 'search_academic_corpus', argumentsJson: JSON.stringify({ query: 'Spinoza substance attribute' }) },
                    ],
                }
            }
            for (const t of tools) seenToolMessages.push(String(t.content))
            return { ok: true, content: 'Spinoza [P1] and [P3].', toolCalls: [] }
        }
        const result = await runAgentNodePipeline({
            complete,
            baseMessages: [{ role: 'user', content: 'Spinoza substance' }],
            provider: 'test',
        })
        expect(result.ok).toBe(true)
        const citations = result.ok ? result.citations : []
        expect(citations.map((c) => c.id)).toEqual([1, 2, 3, 4])
        const first = seenToolMessages.find((c) => c.includes('Alpha study')) || ''
        const second = seenToolMessages.find((c) => c.includes('Beta study')) || ''
        expect(first).toMatch(/\[P1\] .*Alpha study of Spinoza substance/)
        expect(second).toMatch(/\[P3\] .*Beta study of Spinoza substance/)
        expect(second).not.toMatch(/\[P1\]/)
        // chat.ts renumbers as index + 1 — identical to these ids.
        expect(citations[2].title).toContain('Beta study')
    })
})
