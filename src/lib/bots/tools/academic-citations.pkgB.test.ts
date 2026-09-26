import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runAgentNodePipeline, type AgentPipelineParams, type ChatMessage, type CompletionRound } from './pipeline'
import {
    __resetAcademicSearchStateForTests,
    applyRetractionPolicy,
    crossrefItemToPaper,
    extractQueryDoi,
    formatApaBibliography,
    openAlexWorkToPaper,
    queryWantsRetracted,
    retractionFromTitle,
    searchAcademicCorpus,
    stripQueryDoi,
    type AcademicPaper,
} from '../academic-search'
import { __setAcademicCacheForTests } from '../academic-cache'
import {
    academicResultsToCitations,
    mergeToolCitations,
    runWithAbortBudget,
    verifyAnswerCitations,
} from '../academic-citations'
import { extractCitationIds, linkifyCitationMarkers } from '../../ai/citation-markers'
import type { AiCitation } from '../../ai/contracts'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
const DOI = '10.3389/fspor.2025.1688670'
const JATS = `<?xml version="1.0"?><article><front><article-meta><title-group><article-title>Sport</article-title></title-group></article-meta></front>
<body><sec><title>Discussion</title><p>The subject that tames is not sport but technology. This reversal matters for the ethics of training.</p></sec></body></article>`

type Handler = (url: string) => Response | Promise<Response> | undefined

/** Scholarly APIs: Crossref returns two sport papers; everything else empty. `extra` handlers win. */
function installFetch(extra?: Handler) {
    const calls: string[] = []
    globalThis.fetch = vi.fn(async (input: string) => {
        const url = String(input)
        calls.push(url)
        const custom = extra?.(url)
        if (custom) return custom
        if (url.includes('europepmc/webservices/rest/search'))
            return json({ resultList: { result: [{ pmcid: 'PMC1234567', isOpenAccess: 'Y', title: 'Rediscovery of animality in the concept of sport.', authorString: 'Sakamoto K.', pubYear: '2025' }] } })
        if (url.includes('/fullTextXML')) return new Response(JATS, { status: 200, headers: { 'content-type': 'application/xml' } })
        if (/api\.crossref\.org\/works\/10\./.test(url))
            return json({ message: { DOI, title: ['Rediscovery of animality in the concept of sport'], author: [{ given: 'Kenji', family: 'Sakamoto' }], issued: { 'date-parts': [[2025]] } } })
        if (url.includes('api.crossref.org'))
            return json({
                message: {
                    items: [
                        { DOI, title: ['Rediscovery of animality in the concept of sport'], author: [{ given: 'Kenji', family: 'Sakamoto' }], issued: { 'date-parts': [[2025]] } },
                        { DOI: '10.1234/x.2', title: ['Technology, sport and animality revisited'], author: [{ given: 'B', family: 'Other' }], issued: { 'date-parts': [[2020]] } },
                    ],
                },
            })
        if (url.includes('api.openalex.org')) return json({ results: [] })
        if (url.includes('semanticscholar')) return json({ total: 0, data: [] })
        if (url.includes('unpaywall')) return json({ is_oa: false })
        if (url.includes('doaj.org')) return json({ results: [] })
        if (url.includes('core.ac.uk')) return json({ totalHits: 0, results: [] })
        if (url.includes('esearch.fcgi')) return json({ esearchresult: { idlist: [] } })
        if (url.includes('export.arxiv.org')) return new Response('<feed></feed>', { status: 200 })
        if (url.includes('trdizin')) return json({ hits: { hits: [] } })
        if (url.includes('api.openaire.eu')) return json({ results: [] })
        if (url.includes('zenodo.org')) return json({ hits: { hits: [] } })
        if (url.includes('plato.stanford.edu')) return new Response('<div class="search_results"></div>')
        if (url.includes('iep.utm.edu')) return json([])
        return new Response('nf', { status: 404 })
    }) as unknown as typeof fetch
    return calls
}

const SEARCH = (id: string, query = 'sport animality technology') => ({
    id,
    name: 'search_academic_corpus',
    argumentsJson: JSON.stringify({ query }),
})

const isSubagent = (messages: ChatMessage[]) => String(messages[0]?.content || '').startsWith('You are a focused subagent')

describe('package B — academic citations', () => {
    const originalFetch = globalThis.fetch
    beforeEach(() => {
        vi.spyOn(console, 'info').mockImplementation(() => undefined)
        vi.spyOn(console, 'warn').mockImplementation(() => undefined)
        __resetAcademicSearchStateForTests(0, 0)
        __setAcademicCacheForTests(null)
    })
    afterEach(() => {
        globalThis.fetch = originalFetch
        __setAcademicCacheForTests(undefined)
        vi.restoreAllMocks()
    })

    // ---------------------------------------------------------------- 1. [P@n]
    describe('1. [P@n] never reaches the model', () => {
        it('find_quotes on an already-cited paper (no new citations) is finalized to [P1]', async () => {
            installFetch()
            const toolMsgs: string[] = []
            const complete: AgentPipelineParams['complete'] = async ({ messages, omitTools }): Promise<CompletionRound> => {
                const tools = messages.filter((m: ChatMessage) => m.role === 'tool')
                if (omitTools && tools.length === 0) return { ok: true, content: 'plan', toolCalls: [] }
                if (tools.length === 0) return { ok: true, content: '', toolCalls: [SEARCH('t1')] }
                if (tools.length === 1)
                    return { ok: true, content: '', toolCalls: [{ id: 't2', name: 'find_quotes', argumentsJson: JSON.stringify({ paper: 'P1', claim: 'technology tames the athlete' }) }] }
                for (const t of tools) toolMsgs.push(String(t.content))
                return { ok: true, content: 'Final [P1].', toolCalls: [] }
            }
            const result = await runAgentNodePipeline({ complete, baseMessages: [{ role: 'user', content: 'quote please' }], provider: 'test' })
            const quoteMsg = toolMsgs.find((m) => m.startsWith('GROUNDED QUOTES')) || ''
            expect(quoteMsg).toContain('[P1]')
            expect(toolMsgs.join('\n')).not.toMatch(/\[P@\d+\]/)
            expect(result.ok && result.citations.map((c) => c.id)).toEqual([1, 2])
        })

        it('mergeToolCitations finalizes [P@n] even with no citations and for non-matching tools leaves text alone', () => {
            const out = mergeToolCitations('related_papers', 'RELATED PAPERS for [P@3] …', undefined, [])
            expect(out.result).toBe('RELATED PAPERS for [P3] …')
            expect(out.citations).toEqual([])
            expect(mergeToolCitations('fetch_url', 'arr [P@3]', undefined, []).result).toBe('arr [P@3]')
        })

        it('the UI tolerates an echoed [P@n] as a normal clickable marker', () => {
            expect(extractCitationIds('As quoted [P@1].')).toEqual([1])
            expect(linkifyCitationMarkers('As quoted [P@1].', [1])).toBe('As quoted [1](#cite-1).')
            expect(linkifyCitationMarkers('See [P@1, P@2]', [1])).toBe('See [1](#cite-1)[2](#cite-unknown-2)')
        })
    })

    // ---------------------------------------------------------------- 3. duplicates
    describe('3. no duplicate cards for repeated sources', () => {
        it('identical search repeated later in the turn (cache hit) reuses the ids', async () => {
            installFetch()
            const toolMsgs: string[] = []
            const complete: AgentPipelineParams['complete'] = async ({ messages, omitTools }): Promise<CompletionRound> => {
                const tools = messages.filter((m: ChatMessage) => m.role === 'tool')
                if (omitTools && tools.length === 0) return { ok: true, content: 'plan', toolCalls: [] }
                if (tools.length < 2) return { ok: true, content: '', toolCalls: [SEARCH(`t${tools.length + 1}`)] }
                toolMsgs.splice(0, toolMsgs.length, ...tools.map((t) => String(t.content)))
                return { ok: true, content: 'Final [P1] [P2].', toolCalls: [] }
            }
            const result = await runAgentNodePipeline({ complete, baseMessages: [{ role: 'user', content: 'x' }], provider: 'test' })
            const cits = result.ok ? result.citations : []
            expect(cits.map((c) => c.id)).toEqual([1, 2])
            expect(new Set(cits.map((c) => c.title)).size).toBe(cits.length)
            // Both payloads label the same works with the same ids.
            expect(toolMsgs).toHaveLength(2)
            const labelOf = (msg: string, title: string) => msg.split('\n').find((line) => line.includes(title))?.match(/^\[P(\d+)\]/)?.[1]
            for (const msg of toolMsgs) {
                expect(msg).not.toContain('[P3]')
                expect([labelOf(msg, 'Rediscovery'), labelOf(msg, 'Technology, sport')].sort()).toEqual(['1', '2'])
            }
            expect(labelOf(toolMsgs[1], 'Rediscovery')).toBe(labelOf(toolMsgs[0], 'Rediscovery'))
        })

        it('parallel identical searches in one batch (shared in-flight promise) emit one set of cards', async () => {
            installFetch()
            const complete: AgentPipelineParams['complete'] = async ({ messages, omitTools }): Promise<CompletionRound> => {
                const tools = messages.filter((m: ChatMessage) => m.role === 'tool')
                if (omitTools && tools.length === 0) return { ok: true, content: 'plan', toolCalls: [] }
                if (tools.length === 0) return { ok: true, content: '', toolCalls: [SEARCH('a'), SEARCH('b')] }
                return { ok: true, content: 'Final [P1].', toolCalls: [] }
            }
            const result = await runAgentNodePipeline({ complete, baseMessages: [{ role: 'user', content: 'x' }], provider: 'test' })
            expect(result.ok && result.citations.map((c) => c.id)).toEqual([1, 2])
        })

        it('a SEP entry returned by two different searches keeps its first id (URL match, short title)', () => {
            const sep = (id: number): AiCitation => ({ id, kind: 'encyclopedia', title: 'Moral Luck', url: 'https://plato.stanford.edu/entries/moral-luck/', snippet: '', source: 'SEP' })
            const turn: AiCitation[] = [
                { id: 1, kind: 'paper', title: 'Paper one about luck', url: 'https://doi.org/10.1/a', snippet: '', doi: '10.1/a' },
                sep(2),
            ]
            const incoming: AiCitation[] = [
                { id: 1, kind: 'paper', title: 'A different paper on agency', url: 'https://doi.org/10.1/b', snippet: '', doi: '10.1/b' },
                { ...sep(2), url: 'https://plato.stanford.edu/entries/moral-luck' },
            ]
            const out = mergeToolCitations('search_academic_corpus', '[P1] A different paper\n[P2] Moral Luck (SEP)', incoming, turn)
            expect(out.citations.map((c) => [c.id, c.title])).toEqual([[3, 'A different paper on agency']])
            expect(out.result).toBe('[P3] A different paper\n[P2] Moral Luck (SEP)')
        })

        it('web_search repeats reuse ids and relabel [Source N - ]', () => {
            const turn: AiCitation[] = [{ id: 1, kind: 'web', title: 'A', url: 'https://www.a.example/x/', snippet: '' }]
            const incoming: AiCitation[] = [
                { id: 1, kind: 'web', title: 'B', url: 'https://b.example/', snippet: '' },
                { id: 2, kind: 'web', title: 'A', url: 'https://a.example/x', snippet: '' },
            ]
            const out = mergeToolCitations('web_search', '[Source 1 - B]\n[Source 2 - A]', incoming, turn)
            expect(out.citations.map((c) => c.id)).toEqual([2])
            expect(out.result).toBe('[Source 2 - B]\n[Source 1 - A]')
        })
    })

    // ---------------------------------------------------------------- 4. sub-agents
    describe('4. sub-agent citations use the turn-global ids', () => {
        it('nested search + find_quotes: renumbered, deduped, [P@n]-free; related_papers / find_quotes allowed', async () => {
            installFetch()
            const nestedMsgs: string[] = []
            let topSearch = ''
            let report = ''
            const complete: AgentPipelineParams['complete'] = async ({ messages, omitTools }): Promise<CompletionRound> => {
                if (isSubagent(messages)) {
                    const tools = messages.filter((m: ChatMessage) => m.role === 'tool')
                    if (tools.length === 0)
                        return {
                            ok: true,
                            content: '',
                            toolCalls: [
                                { id: 'n1', name: 'find_quotes', argumentsJson: JSON.stringify({ paper: 'P1', claim: 'technology tames the athlete' }) },
                                SEARCH('n2'),
                            ],
                        }
                    for (const t of tools) nestedMsgs.push(String(t.content))
                    report = 'Quote from [P1]; related [P2].'
                    return { ok: true, content: report, toolCalls: [] }
                }
                const tools = messages.filter((m: ChatMessage) => m.role === 'tool')
                if (omitTools && tools.length === 0) return { ok: true, content: 'plan', toolCalls: [] }
                if (tools.length === 0) return { ok: true, content: '', toolCalls: [SEARCH('t1')] }
                if (tools.length === 1) {
                    topSearch = String(tools[0].content)
                    return { ok: true, content: '', toolCalls: [{ id: 't2', name: 'task', argumentsJson: JSON.stringify({ goal: 'find a quote in P1' }) }] }
                }
                return { ok: true, content: 'Final [P1].', toolCalls: [] }
            }
            const result = await runAgentNodePipeline({ complete, baseMessages: [{ role: 'user', content: 'x' }], provider: 'test' })
            expect(nestedMsgs).toHaveLength(2)
            expect(nestedMsgs.join('\n')).not.toMatch(/\[P@\d+\]/)
            expect(nestedMsgs[0]).toContain('GROUNDED QUOTES')
            expect(nestedMsgs[0]).toContain('[P1]')
            expect(nestedMsgs[0]).not.toContain('subagent may only use read tools')
            // Nested search re-found the same works → same labels as the top-level payload, no new ids.
            const labelOf = (msg: string, title: string) => msg.split('\n').find((line) => line.includes(title))?.match(/^\[P(\d+)\]/)?.[1]
            expect(labelOf(nestedMsgs[1], 'Rediscovery')).toBe(labelOf(topSearch, 'Rediscovery'))
            expect(labelOf(nestedMsgs[1], 'Technology, sport')).toBe(labelOf(topSearch, 'Technology, sport'))
            expect(nestedMsgs[1]).not.toContain('[P3]')
            const cits = result.ok ? result.citations : []
            expect(cits.map((c) => c.id)).toEqual([1, 2])
            expect(new Set(cits.map((c) => c.title)).size).toBe(2)
        })
    })

    // ---------------------------------------------------------------- 5. plain [n]
    describe('5. code-like [n] is not a citation', () => {
        it('skips code spans / blocks, identifiers, links and footnotes', () => {
            const md = [
                'Result [1] and [P2].',
                'Index `arr[3]` and ``x[4]`` inline.',
                '```js\nconst y = list[5]\n```',
                'Plain arr[6], matrix[7][8], f(x)[9] prose.',
                'Link [[10]](https://x.example) and [11](https://y.example) and note[^12].',
                '[13]: https://ref.example',
                'Glued word[P14] still counts, as does [Source 15].',
            ].join('\n')
            expect(extractCitationIds(md)).toEqual([1, 2, 14, 15])
            const linked = linkifyCitationMarkers(md, [1, 2])
            expect(linked).toContain('arr[6]')
            expect(linked).toContain('matrix[7][8]')
            expect(linked).toContain('`arr[3]`')
            expect(linked).toContain('``x[4]``')
            expect(linked).toContain('[[10]](https://x.example)')
        })

        it('verification does not count arr[2] as citing source 2', async () => {
            const cits: AiCitation[] = [
                { id: 1, kind: 'paper', title: 'A long enough paper title here', url: 'https://doi.org/10.1/a', snippet: '', doi: '10.1/a' },
                { id: 2, kind: 'web', title: 'web', url: 'https://ex.org', snippet: '' },
            ]
            const r = await verifyAnswerCitations('See [P1] and arr[2] and `[2]`.', cits, { lookupDoi: async (doi) => ({ doi, found: false }) })
            expect(r.citations.find((c) => c.id === 1)?.verified).toBe(true)
            expect(r.citations.find((c) => c.id === 2)?.verified).toBeUndefined()
            expect(r.verification).toEqual({ checked: 1, verified: 1, unverified: 0 })
        })
    })

    // ---------------------------------------------------------------- 6. abortable budget
    describe('6. verification budget aborts in-flight lookups', () => {
        it('aborts the task signal when the budget expires and resolves undefined', async () => {
            vi.useFakeTimers()
            let seen: AbortSignal | undefined
            const pending = runWithAbortBudget((signal) => {
                seen = signal
                return new Promise<string>(() => undefined)
            }, 4_500)
            await vi.advanceTimersByTimeAsync(4_500)
            await expect(pending).resolves.toBeUndefined()
            expect(seen?.aborted).toBe(true)
            vi.useRealTimers()
        })

        it('passes the value through, follows the parent signal and does not abort after success', async () => {
            let seen: AbortSignal | undefined
            await expect(runWithAbortBudget(async (signal) => ((seen = signal), 'ok'), 1_000)).resolves.toBe('ok')
            expect(seen?.aborted).toBe(false)
            const parent = new AbortController()
            let child: AbortSignal | undefined
            const p = runWithAbortBudget((signal) => {
                child = signal
                return new Promise<string>((_, reject) => signal.addEventListener('abort', () => reject(new Error('aborted'))))
            }, 10_000, parent.signal)
            parent.abort()
            await expect(p).rejects.toThrow('aborted')
            expect(child?.aborted).toBe(true)
        })

        it('Crossref lookups through verifyAnswerCitations receive the aborting signal', async () => {
            vi.useFakeTimers()
            const signals: AbortSignal[] = []
            const pending = runWithAbortBudget(
                (signal) =>
                    verifyAnswerCitations('See 10.5555/slow.1', [{ id: 1, kind: 'paper', title: 'Some paper title here', url: 'https://doi.org/10.1/a', snippet: '' }], {
                        lookupDoi: (doi) => {
                            signals.push(signal)
                            return new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error(`aborted ${doi}`))))
                        },
                    }),
                4_500
            )
            await vi.advanceTimersByTimeAsync(4_600)
            await expect(pending).resolves.toBeUndefined()
            expect(signals).toHaveLength(1)
            expect(signals[0].aborted).toBe(true)
            vi.useRealTimers()
        })
    })

    // ---------------------------------------------------------------- 7. DOI queries
    describe('7. DOI-shaped queries resolve the exact work first', () => {
        const EXACT_DOI = '10.1038/s41586-020-2649-2'
        const exactRecord = {
            DOI: EXACT_DOI,
            title: ['Array programming with NumPy'],
            author: [
                { given: 'Charles R.', family: 'Harris' },
                { given: 'K. Jarrod', family: 'Millman' },
            ],
            issued: { 'date-parts': [[2020]] },
            'container-title': ['Nature'],
            'is-referenced-by-count': 9000,
        }

        it('extracts DOIs from free text / doi.org URLs and strips them', () => {
            expect(extractQueryDoi('see https://doi.org/10.1038/S41586-020-2649-2.')).toBe(EXACT_DOI)
            expect(extractQueryDoi('doi:10.1016/S0140-6736(97)11096-0)')).toBe('10.1016/s0140-6736(97)11096-0')
            expect(extractQueryDoi('no doi here 10.12')).toBe('')
            expect(stripQueryDoi('numpy paper https://doi.org/10.1038/s41586-020-2649-2')).toBe('numpy paper')
        })

        it('a DOI-only query returns just that work (Crossref + Unpaywall), not unrelated keyword hits', async () => {
            const calls = installFetch((url) => {
                if (url.includes(`api.crossref.org/works/${encodeURIComponent(EXACT_DOI)}`)) return json({ message: exactRecord })
                if (url.includes('api.unpaywall.org')) return json({ is_oa: true, best_oa_location: { url_for_pdf: 'https://oa.example/numpy.pdf' } })
                return undefined
            })
            const res = await searchAcademicCorpus(`https://doi.org/${EXACT_DOI}`, { noCache: true })
            expect(res.ok).toBe(true)
            expect(res.papers).toHaveLength(1)
            expect(res.papers[0].title).toBe('Array programming with NumPy')
            expect(res.papers[0].doi).toBe(`https://doi.org/${EXACT_DOI}`)
            expect(res.papers[0].pdfUrl).toBe('https://oa.example/numpy.pdf')
            expect(res.notice).toContain('resolved directly via Crossref')
            // No keyword fan-out for a bare DOI.
            expect(calls.some((u) => u.includes('api.openalex.org/works?'))).toBe(false)
            expect(calls.some((u) => /api\.crossref\.org\/works\?/.test(u))).toBe(false)
        })

        it('DOI + topic: exact work first, keyword results after it (deduped)', async () => {
            installFetch((url) => {
                if (url.includes(`api.crossref.org/works/${encodeURIComponent(EXACT_DOI)}`)) return json({ message: exactRecord })
                if (/api\.crossref\.org\/works\?/.test(url))
                    return json({
                        message: {
                            items: [
                                { DOI: '10.5555/numpy-other', title: ['Scientific computing array programming in python'], author: [{ given: 'A', family: 'B' }], issued: { 'date-parts': [[2019]] } },
                                exactRecord,
                            ],
                        },
                    })
                return undefined
            })
            const res = await searchAcademicCorpus(`${EXACT_DOI} array programming python`, { noCache: true })
            expect(res.papers[0].doi).toBe(`https://doi.org/${EXACT_DOI}`)
            expect(res.papers.filter((p) => p.doi === `https://doi.org/${EXACT_DOI}`)).toHaveLength(1)
            expect(res.papers.length).toBeGreaterThan(1)
        })

        it('a DOI in the user phrasing (query_original) is honoured too; unknown DOIs fall back with a note', async () => {
            installFetch((url) => {
                if (url.includes(`api.crossref.org/works/${encodeURIComponent(EXACT_DOI)}`)) return json({ message: exactRecord })
                if (url.includes('api.crossref.org/works/10.9999')) return json({ status: 'not found' }, 404)
                return undefined
            })
            const viaOriginal = await searchAcademicCorpus('numpy array programming', { noCache: true, queryOriginal: `şu makale: ${EXACT_DOI}` })
            expect(viaOriginal.papers[0].title).toBe('Array programming with NumPy')
            const missing = await searchAcademicCorpus('10.9999/does-not-exist sport animality technology', { noCache: true })
            expect(missing.notice).toContain('not found in Crossref')
            expect(missing.papers.every((p) => !p.doi?.includes('10.9999'))).toBe(true)
        })
    })

    // ---------------------------------------------------------------- 8. retractions
    describe('8. retracted papers', () => {
        const retractedItem = {
            DOI: '10.1016/s0140-6736(97)11096-0',
            title: ['RETRACTED: Sport, animality and technology in pervasive developmental disorder'],
            author: [{ given: 'A. J.', family: 'Wakefield' }],
            issued: { 'date-parts': [[1998]] },
            'updated-by': [{ DOI: '10.1016/s0140-6736(10)60175-4', type: 'retraction', source: 'retraction-watch' }],
        }
        const retractedNoPrefix = {
            DOI: '10.5555/retracted-quietly',
            title: ['Sport animality technology and the quiet retraction'],
            author: [{ given: 'Q', family: 'Uiet' }],
            issued: { 'date-parts': [[2015]] },
            'updated-by': [{ DOI: '10.5555/notice', type: 'retraction' }],
            license: [{ URL: 'https://creativecommons.org/licenses/by/4.0/' }],
            link: [{ URL: 'https://oa.example/q.pdf', 'content-type': 'application/pdf' }],
        }
        const notice = {
            DOI: '10.5555/notice',
            title: ['Retraction notice to "Sport animality technology and the quiet retraction"'],
            issued: { 'date-parts': [[2016]] },
            'update-to': [{ DOI: '10.5555/retracted-quietly', type: 'retraction' }],
        }
        const good = { DOI: '10.5555/good', title: ['Sport animality technology in modern training'], author: [{ given: 'G', family: 'Ood' }], issued: { 'date-parts': [[2021]] } }

        it('detects Crossref updated-by / update-to, OpenAlex is_retracted and title prefixes', () => {
            expect(crossrefItemToPaper(retractedNoPrefix).retracted).toBe(true)
            expect(crossrefItemToPaper(notice).retractionNotice).toBe(true)
            expect(crossrefItemToPaper(notice).retracted).toBeUndefined()
            expect(crossrefItemToPaper(good).retracted).toBeUndefined()
            expect(openAlexWorkToPaper({ id: 'W1', title: 'Plain title', is_retracted: true }).retracted).toBe(true)
            expect(retractionFromTitle('RETRACTED ARTICLE: Foo')).toEqual({ retracted: true })
            expect(retractionFromTitle('Notice of Retraction: Bar')).toEqual({ retracted: true })
            expect(retractionFromTitle('Retraction: Baz')).toEqual({ retractionNotice: true })
            expect(retractionFromTitle('Retraction Watch and research integrity')).toEqual({})
            expect(queryWantsRetracted('retracted vaccine papers')).toBe(true)
            expect(queryWantsRetracted('geri çekilen makaleler')).toBe(true)
            expect(queryWantsRetracted('vaccine safety')).toBe(false)
        })

        const withItems = () =>
            installFetch((url) => (/api\.crossref\.org\/works\?/.test(url) ? json({ message: { items: [retractedItem, retractedNoPrefix, notice, good] } }) : undefined))

        it('excludes retracted works and notices by default', async () => {
            withItems()
            const res = await searchAcademicCorpus('sport animality technology', { noCache: true })
            expect(res.papers.map((p) => p.doi)).toEqual(['https://doi.org/10.5555/good'])
            expect(res.notice).toMatch(/3 retracted works/)
        })

        it('open_access_only never returns retracted items (even when OA)', async () => {
            installFetch((url) =>
                /api\.crossref\.org\/works\?/.test(url)
                    ? json({ message: { items: [retractedNoPrefix, { ...good, license: [{ URL: 'https://creativecommons.org/licenses/by/4.0/' }], link: [{ URL: 'https://oa.example/g.pdf', 'content-type': 'application/pdf' }] }] } })
                    : undefined
            )
            const res = await searchAcademicCorpus('sport animality technology retracted', { noCache: true, openAccessOnly: true })
            expect(res.papers.map((p) => p.doi)).toEqual(['https://doi.org/10.5555/good'])
        })

        it('explicit retraction queries keep them demoted, with a Retracted flag on the card and in the payload', async () => {
            withItems()
            const res = await searchAcademicCorpus('retracted sport animality technology', { noCache: true })
            expect(res.papers[0].doi).toBe('https://doi.org/10.5555/good')
            const flagged = res.papers.slice(1)
            expect(flagged.length).toBeGreaterThanOrEqual(2)
            expect(flagged.every((p) => p.retracted || p.retractionNotice)).toBe(true)
            const cards = academicResultsToCitations(res.papers)
            expect(cards.filter((c) => c.retracted).length).toBeGreaterThanOrEqual(2)
            expect(cards[0].retracted).toBeUndefined()
            expect(res.formatted).toBeTruthy()
            expect(formatApaBibliography(res.papers)).toContain('[Retracted]')
        })

        it('applyRetractionPolicy is stable and title-aware for sources without structured data', () => {
            const p = (title: string, extra: Partial<AcademicPaper> = {}): AcademicPaper => ({ id: title, title, authors: [], citationCount: 0, source: 'CORE', ...extra } as AcademicPaper)
            const list = [p('RETRACTED: A'), p('B'), p('C', { retracted: true }), p('D')]
            expect(applyRetractionPolicy(list, { wantsRetracted: false }).map((x) => x.title)).toEqual(['B', 'D'])
            expect(applyRetractionPolicy(list, { wantsRetracted: true }).map((x) => x.title)).toEqual(['B', 'D', 'RETRACTED: A', 'C'])
        })
    })
})
