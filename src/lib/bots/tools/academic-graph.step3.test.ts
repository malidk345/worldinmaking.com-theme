import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { executeToolCall } from './execute'
import { runAgentNodePipeline, type AgentPipelineParams, type ChatMessage, type CompletionRound } from './pipeline'
import { __resetAcademicSearchStateForTests, normalizeTitleKey } from '../academic-search'
import { __setAcademicCacheForTests, ACADEMIC_GRAPH_TTL_S, ACADEMIC_PARTIAL_TTL_S } from '../academic-cache'
import { cleanDoi } from '../academic-common'
import { balanceByRelation, buildRelatedToolOutput, dropUnrelatedSimilar, findRelatedPapers, isNonScholarlyWork, parsePaperRef, rankRelatedPapers, type PaperRef } from '../academic-graph'
import type { AcademicPaper } from '../academic-search'
import { matchTurnCitation, renumberToolCitations } from '../academic-citations'
import type { AiCitation } from '../../ai/contracts'

type Handler = (url: string, init?: RequestInit) => Response | Promise<Response>
const json = (body: unknown, status = 200, headers?: Record<string, string>) => new Response(JSON.stringify(body), { status, headers })
const rateLimited = () => json({ message: 'Too Many Requests' }, 429)

const SEED = '10.1234/seed.1'
const W = (n: string) => `https://openalex.org/${n}`
const oaWork = (id: string, doi: string | undefined, title: string, extra: Record<string, unknown> = {}) => ({
    id: W(id),
    doi: doi ? `https://doi.org/${doi}` : undefined,
    title,
    publication_year: 2010,
    cited_by_count: 10,
    authorships: [{ author: { display_name: 'Ann Author' } }],
    ...extra,
})
const OA: Record<string, ReturnType<typeof oaWork>> = {
    W100: oaWork('W100', SEED, 'Heidegger and the question concerning technology today', {
        referenced_works: [W('W201'), W('W202')],
        related_works: [W('W301'), W('W302'), W('W100')],
        cited_by_count: 50,
    }),
    W201: oaWork('W201', '10.1234/ref.1', 'Being and Time revisited: tools and equipment'),
    W202: oaWork('W202', '10.1234/ref.2', 'Enframing and the standing reserve'),
    W301: oaWork('W301', '10.1234/sim.1', 'Technology and time in postphenomenology'),
    W302: oaWork('W302', '10.1234/sim.2', 'Valeological culture of schoolchildren'),
    W401: oaWork('W401', '10.1234/cit.4', 'Heidegger, AI and the technological condition'),
}
const CR_META: Record<string, { title: string; year: number }> = {
    '10.1234/cit.1': { title: 'Digital technology and dwelling: a Heideggerian reading', year: 2020 },
    '10.1234/cit.2': { title: 'Artificial intelligence and the essence of technology', year: 2022 },
    '10.1234/ref.1': { title: 'Being and Time revisited: tools and equipment', year: 2001 },
    '10.1234/ref.2': { title: 'Enframing and the standing reserve', year: 2003 },
    '10.1234/ref.3': { title: 'The age of the world picture reconsidered', year: 1999 },
}
const crItem = (doi: string) => ({
    DOI: doi,
    title: [CR_META[doi]?.title || `Work ${doi}`],
    author: [{ given: 'Cy', family: 'Ref' }],
    issued: { 'date-parts': [[CR_META[doi]?.year || 2000]] },
    'is-referenced-by-count': 5,
})

function hostKey(url: string): string {
    if (url.includes('api.openalex.org/works/')) return 'oaSingle'
    if (url.includes('api.openalex.org/works?')) return 'oaList'
    if (/api\.crossref\.org\/works\/10\./.test(url)) return 'crWork'
    if (url.includes('api.crossref.org/works?') && url.includes('filter=doi')) return 'crBatch'
    if (url.includes('api.crossref.org')) return 'crSearch'
    if (url.includes('semanticscholar.org') && url.includes('/citations')) return 's2Citations'
    if (url.includes('semanticscholar.org') && url.includes('/references')) return 's2References'
    if (url.includes('semanticscholar.org') && url.includes('recommendations')) return 's2Recs'
    if (url.includes('semanticscholar.org')) return 's2'
    if (url.includes('opencitations.net/index/v2/citations')) return 'ocCitations'
    if (url.includes('opencitations.net/index/v2/references')) return 'ocReferences'
    if (url.includes('api.unpaywall.org')) return 'unpaywall'
    return 'other'
}

const DEFAULTS: Record<string, Handler> = {
    oaSingle: (url) => {
        const path = decodeURIComponent(url.split('/works/')[1].split('?')[0])
        const work = path.startsWith('doi:') ? Object.values(OA).find((w) => cleanDoi(w.doi) === path.slice(4)) : OA[path]
        return work ? json(work) : json({ error: 'not found' }, 404)
    },
    oaList: rateLimited,
    crWork: (url) => {
        const doi = decodeURIComponent(url.split('/works/')[1].split('?')[0])
        if (doi !== SEED) return json({ status: 'error' }, 404)
        return json({
            message: {
                ...crItem(SEED),
                title: ['Heidegger and the question concerning technology today'],
                reference: [
                    { DOI: '10.1234/ref.1' },
                    { DOI: '10.1234/ref.3' },
                    { 'article-title': 'Building dwelling thinking as a lecture', author: 'Heidegger', year: '1951' },
                ],
            },
        })
    },
    crBatch: (url) => {
        const filter = new URL(url).searchParams.get('filter') || ''
        const dois = filter.split(',').map((f) => f.replace(/^doi:/, ''))
        return json({ message: { items: dois.filter((d) => CR_META[d]).map(crItem) } })
    },
    crSearch: () => json({ message: { items: [] } }),
    s2Citations: rateLimited,
    s2References: rateLimited,
    s2Recs: rateLimited,
    s2: rateLimited,
    ocCitations: () =>
        json([
            { citing: 'omid:br/0601 doi:10.1234/cit.1', cited: `doi:${SEED}`, creation: '2020-01' },
            { citing: 'doi:10.1234/cit.2', cited: `doi:${SEED}`, creation: '2022-05' },
        ]),
    ocReferences: () => json([{ cited: 'doi:10.1234/ref.1' }, { cited: 'doi:10.1234/ref.2' }]),
    unpaywall: () => json({ is_oa: false }),
}

function installFetch(overrides: Partial<Record<string, Handler>> = {}) {
    const calls: Array<{ key: string; url: string; init?: RequestInit }> = []
    globalThis.fetch = vi.fn(async (input: string, init?: RequestInit) => {
        const url = String(input)
        const key = hostKey(url)
        calls.push({ key, url, init })
        const handler = overrides[key] || DEFAULTS[key]
        return handler ? handler(url, init) : new Response('not found', { status: 404 })
    }) as unknown as typeof fetch
    return { calls }
}

const header = (init: RequestInit | undefined, name: string) => (init?.headers as Record<string, string> | undefined)?.[name]
const KEYED_ENV = { OPENALEX_API_KEY: 'oa-test-key', SEMANTIC_SCHOLAR_API_KEY: 's2-test-key' }
const keyedOverrides: Partial<Record<string, Handler>> = {
    oaList: (url) => {
        const filter = new URL(url).searchParams.get('filter') || ''
        if (filter.startsWith('openalex:')) return json({ results: filter.slice(9).split('|').map((id) => OA[id]).filter(Boolean) })
        if (filter === 'cites:W100') return json({ results: [OA.W401] })
        return json({ results: [] })
    },
    s2Citations: () =>
        json({
            data: [
                {
                    isInfluential: true,
                    citingPaper: { paperId: 'a'.repeat(40), title: 'Machine learning as enframing', year: 2021, citationCount: 3, externalIds: { DOI: '10.1234/cit.3' }, authors: [{ name: 'Sam Scholar' }] },
                },
            ],
        }),
    s2References: () => json({ data: null }),
    s2Recs: () => json({ recommendedPapers: [] }),
}

function fakeCache() {
    const store = new Map<string, Response>()
    const puts: Array<{ url: string; cacheControl: string | null }> = []
    return {
        puts,
        cache: {
            async match(req: Request | string) {
                const r = store.get(String(typeof req === 'string' ? req : req.url))
                return r ? r.clone() : undefined
            },
            async put(req: Request | string, res: Response) {
                const url = String(typeof req === 'string' ? req : req.url)
                puts.push({ url, cacheControl: res.headers.get('Cache-Control') })
                store.set(url, res)
            },
        },
    }
}

const seedRef: PaperRef = { raw: SEED, doi: SEED }

describe('related_papers (citation graph)', () => {
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

    it('keyless: degrades gracefully, reports 429s per source and names the missing keys', async () => {
        const { calls } = installFetch()
        const res = await findRelatedPapers(seedRef, { env: {}, noCache: true })
        expect(res.ok).toBe(true)
        expect(res.degraded).toBe(true)
        expect(res.allSourcesFailed).toBeUndefined()
        expect(res.missingKeys).toEqual(expect.arrayContaining(['OPENALEX_API_KEY', 'SEMANTIC_SCHOLAR_API_KEY']))
        const status = (id: string) => res.sources.find((s) => s.source === id)
        expect(status('openalex:cited_by')).toMatchObject({ status: 'failed', reason: 'rate_limited', httpStatus: 429 })
        expect(status('s2:citations')).toMatchObject({ status: 'failed', reason: 'rate_limited' })
        expect(status('opencitations:citations')).toMatchObject({ status: 'ok', count: 2 })
        expect(status('openalex:references')).toMatchObject({ status: 'ok', count: 2 })
        expect(res.notice).toMatch(/API key/)
        // Seed never listed as its own related work (it is in OpenAlex related_works).
        expect(res.papers.some((p) => cleanDoi(p.doi) === SEED)).toBe(false)
        // Dedupe across OpenAlex / OpenCitations / Crossref references.
        const keys = res.papers.map((p) => normalizeTitleKey(p.title))
        expect(new Set(keys).size).toBe(keys.length)
        const ref1 = res.papers.filter((p) => cleanDoi(p.doi) === '10.1234/ref.1')
        expect(ref1).toHaveLength(1)
        expect(ref1[0].relations).toEqual(['reference'])
        // Balanced across relations for direction "all".
        const rels = new Set(res.papers.flatMap((p) => p.relations))
        expect(rels).toEqual(new Set(['citing', 'reference', 'similar']))
        expect(res.papers.find((p) => p.title.includes('Digital technology and dwelling'))?.relations).toEqual(['citing'])
        // Off-topic "similar"-only recommendations are dropped; citing/reference links are kept.
        expect(res.papers.some((p) => p.title.includes('Valeological'))).toBe(false)
        // No key material sent keylessly; OpenAlex uses the polite pool.
        expect(calls.some((c) => header(c.init, 'x-api-key'))).toBe(false)
        expect(calls.filter((c) => c.key.startsWith('oa')).every((c) => c.url.includes('mailto=') && !c.url.includes('api_key='))).toBe(true)
        // Keyless OpenAlex resolves referenced works as free single-work fetches.
        expect(calls.some((c) => c.key === 'oaSingle' && c.url.includes('/works/W201?'))).toBe(true)
    })

    it('keyed: uses OpenAlex list filters with api_key and sends the S2 x-api-key header', async () => {
        const { calls } = installFetch(keyedOverrides)
        const res = await findRelatedPapers(seedRef, { env: KEYED_ENV, noCache: true })
        expect(res.ok).toBe(true)
        expect(res.missingKeys).toBeUndefined()
        expect(res.degraded).toBeUndefined()
        const s2Calls = calls.filter((c) => c.key.startsWith('s2'))
        expect(s2Calls.length).toBeGreaterThan(0)
        expect(s2Calls.every((c) => header(c.init, 'x-api-key') === 's2-test-key')).toBe(true)
        const lists = calls.filter((c) => c.key === 'oaList')
        expect(lists.some((c) => decodeURIComponent(c.url).includes('filter=openalex:W201|W202'))).toBe(true)
        expect(lists.every((c) => c.url.includes('api_key=oa-test-key'))).toBe(true)
        expect(calls.some((c) => c.key === 'oaSingle' && c.url.includes('/works/W201?'))).toBe(false)
        expect(res.sources.find((s) => s.source === 's2:references')).toMatchObject({ status: 'ok', note: 'reference list elided by publisher' })
        const titles = res.papers.map((p) => p.title)
        expect(titles).toEqual(expect.arrayContaining(['Machine learning as enframing', 'Heidegger, AI and the technological condition']))
    })

    it('direction=citations only queries citing lists', async () => {
        const { calls } = installFetch()
        const res = await findRelatedPapers(seedRef, { env: {}, noCache: true, direction: 'citations' })
        expect(res.papers.every((p) => p.relations.includes('citing'))).toBe(true)
        expect(calls.some((c) => c.key === 'ocReferences' || c.key === 's2References' || c.key === 's2Recs')).toBe(false)
    })

    it('all sources failing → ok:false, honest error, nothing cached; the tool reports degraded', async () => {
        const down = () => json({ error: 'unavailable' }, 503, { 'retry-after': '86400' })
        installFetch(Object.fromEntries(Object.keys(DEFAULTS).map((k) => [k, down])))
        const { cache, puts } = fakeCache()
        __setAcademicCacheForTests(cache)
        const res = await findRelatedPapers(seedRef, { env: {} })
        expect(res.ok).toBe(false)
        expect(res.allSourcesFailed).toBe(true)
        expect(res.error).toMatch(/NOT evidence/)
        expect(puts).toHaveLength(0)
        const exec = await executeToolCall({ id: 'r1', name: 'related_papers', argumentsJson: JSON.stringify({ paper: SEED }) }, {}, undefined, 'ask')
        expect(exec.ok).toBe(false)
        const body = JSON.parse(exec.result)
        expect(body.degraded).toBe(true)
        expect(body.error).toMatch(/temporarily unavailable/)
    })

    it('caches full results for 7 days and partial (keyless) results for 30 minutes', async () => {
        const { cache, puts } = fakeCache()
        __setAcademicCacheForTests(cache)
        const keyed = installFetch(keyedOverrides)
        const first = await findRelatedPapers(seedRef, { env: KEYED_ENV })
        expect(first.cached).toBeUndefined()
        expect(puts.at(-1)?.url).toContain('/related/')
        expect(puts.at(-1)?.cacheControl).toBe(`public, max-age=${ACADEMIC_GRAPH_TTL_S}`)
        const before = keyed.calls.length
        const again = await findRelatedPapers(seedRef, { env: KEYED_ENV })
        expect(again.cached).toBe(true)
        expect(keyed.calls.length).toBe(before)

        installFetch()
        await findRelatedPapers(seedRef, { env: {}, direction: 'references' })
        await findRelatedPapers(seedRef, { env: {}, direction: 'citations' })
        expect(puts.filter((p) => p.url.includes('/related/')).at(-1)?.cacheControl).toBe(`public, max-age=${ACADEMIC_PARTIAL_TTL_S}`)
    })

    it('similar: seed without related_works falls back to its OpenAlex topic; off-topic and front matter are dropped', async () => {
        const seedWork = {
            ...OA.W100,
            related_works: [],
            topics: [{ id: 'https://openalex.org/T12345', display_name: 'Philosophy of Technology' }],
            abstract_inverted_index: { Heidegger: [0], argues: [1], technology: [2], enframing: [3], standing: [4], reserve: [5] },
        }
        const topicWorks = [
            oaWork('W501', '10.1234/t.1', 'Postphenomenology and the enframing of digital technology', { topics: [{ id: 'T12345', display_name: 'Philosophy of Technology' }], cited_by_count: 90 }),
            oaWork('W502', '10.1234/t.2', 'Soil microbiome dynamics under drought', { topics: [{ id: 'T12345', display_name: 'Philosophy of Technology' }], cited_by_count: 900 }),
            oaWork('W503', '10.1234/t.3', 'Front matter', { type: 'paratext', cited_by_count: 5000 }),
            oaWork('W504', '10.1234/t.4', 'Heidegger on technology and the standing reserve', { cited_by_count: 12 }),
        ]
        const { calls } = installFetch({
            oaSingle: (url) => (url.includes('W100') || url.includes('doi:') ? json(seedWork) : json({ error: 'not found' }, 404)),
            oaList: (url) => (new URL(url).searchParams.get('filter') === 'topics.id:T12345' ? json({ results: topicWorks }) : json({ results: [] })),
            s2Recs: () => json({ recommendedPapers: [] }),
        })
        const res = await findRelatedPapers(seedRef, { direction: 'similar', env: {}, noCache: true })
        const lists = calls.filter((c) => c.key === 'oaList').map((c) => new URL(c.url).searchParams.get('filter'))
        expect(lists).toContain('topics.id:T12345')
        expect(res.sources.find((s) => s.source === 'openalex:related')).toMatchObject({ status: 'ok', note: 'by topic: Philosophy of Technology' })
        const titles = res.papers.map((p) => p.title)
        expect(titles).toHaveLength(2)
        expect(titles).toEqual(expect.arrayContaining(['Heidegger on technology and the standing reserve', 'Postphenomenology and the enframing of digital technology']))
    })

    it('topical overlap filter + ranking and the non-scholarly filter (unit)', () => {
        const seed = { title: 'Heidegger and the question concerning technology', abstract: 'Enframing reveals nature as standing reserve.', topics: ['Philosophy of Technology'] } as AcademicPaper
        const mk = (title: string, rel: string, extra: Partial<AcademicPaper> = {}) =>
            ({ title, citationCount: 10, ranks: { [rel]: 1 }, source: 'openalex', authors: [], ...extra }) as unknown as AcademicPaper
        const papers = [
            mk('Valeological culture of schoolchildren', 'openalex:related', { citationCount: 5000 }),
            mk('Technology in schools', 'openalex:related'), // one generic stem, no topic → dropped
            mk('Technology ethics after Heidegger', 'openalex:related'), // 2 stems (heidegger, techno)
            mk('Digital ethics', 'openalex:related', { topics: ['Philosophy of Technology'], abstract: 'Questions concerning digital technology.' }),
            mk('Unrelated but cites the seed', 'openalex:cited_by'), // facts are kept
            mk('Erratum: Heidegger and technology', 'openalex:cited_by'),
            mk('Issue Information', 's2:recommendations'),
        ]
        const kept = dropUnrelatedSimilar(papers, seed).map((p) => p.title)
        expect(kept).toEqual(['Technology ethics after Heidegger', 'Digital ethics', 'Unrelated but cites the seed'])
        expect(isNonScholarlyWork(mk('Table of Contents', 'x'))).toBe(true)
        expect(isNonScholarlyWork(mk('Book review essay: Heidegger', 'x'))).toBe(false)
        const ranked = rankRelatedPapers(
            [mk('Popular but loosely related technology survey', 's2:recommendations', { citationCount: 5000 }), mk('Heidegger, enframing and the standing reserve of technology', 's2:recommendations', { citationCount: 3 })],
            'relevance',
            undefined,
            seed
        )
        expect(ranked[0].title).toBe('Heidegger, enframing and the standing reserve of technology')

        // Turkish seed vs English candidates: two shared OpenAlex topics count as a conceptual match.
        const trSeed = {
            title: 'Heidegger’in tekniğe yönelik düşüncesinde ontik-ontolojik ayrımı',
            abstract: 'Tekniğin özü nedir sorusu, Varlık ve Zaman’daki ayrım ışığında yorumlanır.',
            topics: ['Phenomenology and Existential Philosophy', 'Political Theology and Sovereignty'],
        } as AcademicPaper
        const cross = dropUnrelatedSimilar(
            [
                mk('The essence of technology in Being and Time', 'openalex:related', { topics: ['Phenomenology and Existential Philosophy', 'Political Theology and Sovereignty'] }),
                mk('Le langage de la guerre', 'openalex:related', { topics: ['Political Theology and Sovereignty'], abstract: 'La politique et la guerre.' }),
            ],
            trSeed
        ).map((p) => p.title)
        expect(cross).toEqual(['The essence of technology in Being and Time'])
    })

    it('fails closed on a paper without any identifier', async () => {
        installFetch()
        const res = await findRelatedPapers({ raw: 'x', title: 'Only a title' }, { env: {}, noCache: true })
        expect(res.ok).toBe(false)
        expect(res.error).toMatch(/no DOI/)
    })
})

describe('parsePaperRef / matchTurnCitation', () => {
    const turn: AiCitation[] = [
        { id: 1, title: 'Heidegger and the question concerning technology today', url: `https://doi.org/${SEED}`, snippet: '', kind: 'paper', doi: SEED },
        { id: 2, title: 'A blog post', url: 'https://example.com/post', snippet: '', kind: 'web' },
        { id: 3, title: 'Enframing and the Standing Reserve', url: 'https://openalex.org/W2020', snippet: '', kind: 'paper' },
    ]
    it('parses DOIs, OpenAlex/S2 ids, CorpusId, PMID, arXiv and URLs', () => {
        const ok = (s: string) => {
            const r = parsePaperRef(s)
            if (!r.ok) throw new Error(r.error)
            return r.ref
        }
        expect(ok('https://doi.org/10.1007/S13347-014-0156-9').doi).toBe('10.1007/s13347-014-0156-9')
        expect(ok('doi:10.1234/seed.1').doi).toBe(SEED)
        expect(ok('w2049480502').openAlexId).toBe('W2049480502')
        expect(ok('https://openalex.org/W2049480502').openAlexId).toBe('W2049480502')
        expect(ok('A'.repeat(40)).s2Id).toBe('a'.repeat(40))
        expect(ok('CorpusId: 12345').s2Id).toBe('CorpusId:12345')
        expect(ok('PMID:998877').s2Id).toBe('PMID:998877')
        expect(ok('arXiv:2101.00001v2').s2Id).toBe('ARXIV:2101.00001')
        expect(ok(`https://www.semanticscholar.org/paper/Some-Title/${'b'.repeat(40)}`).s2Id).toBe('b'.repeat(40))
        expect(parsePaperRef('Being and Time').ok).toBe(false)
        expect(parsePaperRef('https://example.com/paper').ok).toBe(false)
        expect(parsePaperRef('').ok).toBe(false)
    })
    it('resolves [P#] against this turn and rejects unknown / web sources', () => {
        const p1 = parsePaperRef('[P1]', turn)
        expect(p1.ok && p1.ref.existingId).toBe(1)
        expect(p1.ok && p1.ref.doi).toBe(SEED)
        const p3 = parsePaperRef('P3', turn)
        expect(p3.ok && p3.ref.openAlexId).toBe('W2020')
        const p9 = parsePaperRef('[P9]', turn)
        expect(p9.ok).toBe(false)
        const web = parsePaperRef('[P2]', turn)
        expect(!web.ok && web.error).toMatch(/web page/)
        // A DOI that is already a source this turn keeps its id.
        const byDoi = parsePaperRef(`https://doi.org/${SEED}`, turn)
        expect(byDoi.ok && byDoi.ref.existingId).toBe(1)
    })
    it('matchTurnCitation matches DOI first, then a folded title', () => {
        expect(matchTurnCitation({ doi: `https://doi.org/${SEED.toUpperCase()}` }, turn)?.id).toBe(1)
        expect(matchTurnCitation({ title: 'Enframing and the standing reserve' }, turn)?.id).toBe(3)
        expect(matchTurnCitation({ title: 'A blog post' }, turn)).toBeUndefined()
        expect(matchTurnCitation({ title: 'Short' }, turn)).toBeUndefined()
    })
})

describe('related_papers output + [P@n] renumbering', () => {
    const originalFetch = globalThis.fetch
    beforeEach(() => {
        vi.spyOn(console, 'info').mockImplementation(() => undefined)
        __resetAcademicSearchStateForTests(0, 0)
        __setAcademicCacheForTests(null)
    })
    afterEach(() => {
        globalThis.fetch = originalFetch
        __setAcademicCacheForTests(undefined)
        vi.restoreAllMocks()
    })

    it('keeps ids of works already cited this turn and only emits cards for new works', async () => {
        installFetch()
        const turn: AiCitation[] = [
            { id: 1, title: 'Heidegger and the question concerning technology today', url: `https://doi.org/${SEED}`, snippet: '', kind: 'paper', doi: SEED },
            { id: 2, title: 'Enframing and the standing reserve', url: 'https://doi.org/10.1234/ref.2', snippet: '', kind: 'paper', doi: '10.1234/ref.2' },
        ]
        const exec = await executeToolCall(
            { id: 'r1', name: 'related_papers', argumentsJson: JSON.stringify({ paper: 'P1', limit: 6 }) },
            {},
            undefined,
            'ask',
            undefined,
            { citations: turn }
        )
        expect(exec.ok).toBe(true)
        expect(exec.result).toMatch(/^RELATED PAPERS for \[P@1\]/)
        expect(exec.result).toMatch(/\[P@2\] .*Enframing and the standing reserve/)
        expect(exec.result).not.toMatch(/^SEED/m)
        const cards = exec.citations || []
        expect(cards.length).toBeGreaterThan(0)
        expect(cards.map((c) => c.id)).toEqual(cards.map((_, i) => i + 1))
        expect(cards.some((c) => c.doi === '10.1234/ref.2' || c.doi === SEED)).toBe(false)
        const shifted = renumberToolCitations('related_papers', exec.result, cards, turn.length)
        expect(shifted.result).toMatch(/^RELATED PAPERS for \[P1\]/)
        expect(shifted.result).toMatch(/\[P2\] .*Enframing and the standing reserve/)
        expect(shifted.result).not.toMatch(/\[P@/)
        expect(shifted.citations?.map((c) => c.id)).toEqual(cards.map((_, i) => i + 3))
        // Each new card's label appears in the shifted text.
        for (const c of shifted.citations || []) expect(shifted.result).toContain(`[P${c.id}] `)
    })

    it('a new seed becomes SEED [P1]; [P@n] is rewritten even with offset 0', () => {
        const out = buildRelatedToolOutput(
            {
                ok: true,
                seed: { id: 's', title: 'Seed paper on technology', authors: ['Ada Seed'], citationCount: 1, source: 'Crossref', doi: `https://doi.org/${SEED}` },
                papers: [{ id: 'a', title: 'A citing paper on enframing', authors: [], citationCount: 0, source: 'Crossref', relations: ['citing'] }],
                sources: [],
            },
            seedRef,
            undefined
        )
        expect(out.text).toMatch(/^SEED \[P1\] Ada Seed/m)
        expect(out.text).toMatch(/^\[P2\] .*rel:citing\.$/m)
        expect(out.citations.map((c) => c.id)).toEqual([1, 2])
        expect(renumberToolCitations('find_quotes', 'see [P@4] and [P1]', undefined, 0).result).toBe('see [P4] and [P1]')
        expect(renumberToolCitations('web_search', 'keep [P@4]', undefined, 0).result).toBe('keep [P@4]')
    })

    it('balanceByRelation round-robins across relations', () => {
        const mk = (id: string, list: string, rank: number) => ({ id, title: id, authors: [], citationCount: 0, source: 'Crossref' as const, ranks: { [list]: rank } })
        const ranked = [
            mk('r1', 'crossref:references', 1),
            mk('r2', 'openalex:references', 1),
            mk('r3', 'opencitations:references', 2),
            mk('c1', 'opencitations:citations', 1),
            mk('s1', 'openalex:related', 1),
        ]
        const picked = balanceByRelation(ranked, 3).map((p) => p.id)
        expect(picked).toEqual(['c1', 'r1', 's1'])
    })
})

describe('pipeline: search_academic_corpus + related_papers in one turn', () => {
    const originalFetch = globalThis.fetch
    beforeEach(() => {
        vi.spyOn(console, 'info').mockImplementation(() => undefined)
        vi.spyOn(console, 'warn').mockImplementation(() => undefined)
        __resetAcademicSearchStateForTests(0, 0)
        __setAcademicCacheForTests(null)
        const alpha = (n: number) => ({
            DOI: `10.1234/alpha.${n}`,
            title: [`Alpha study of Spinoza substance ${n}`],
            author: [{ given: 'A', family: `Author${n}` }],
            issued: { 'date-parts': [[2000 + n]] },
        })
        globalThis.fetch = vi.fn(async (input: string) => {
            const url = String(input)
            if (/api\.crossref\.org\/works\/10\./.test(url)) {
                const doi = decodeURIComponent(url.split('/works/')[1].split('?')[0])
                if (doi !== '10.1234/alpha.1') return json({}, 404)
                return json({ message: { ...alpha(1), reference: [{ DOI: '10.1234/alpha.2' }, { DOI: '10.1234/new.1' }] } })
            }
            if (url.includes('api.crossref.org/works?') && url.includes('filter=doi')) {
                const newOne = { DOI: '10.1234/new.1', title: ['A new reading of Spinoza on substance and mode'], author: [{ given: 'N', family: 'Newman' }], issued: { 'date-parts': [[2019]] } }
                return json({ message: { items: [alpha(2), newOne] } })
            }
            if (url.includes('api.crossref.org')) return json({ message: { items: [alpha(1), alpha(2)] } })
            if (url.includes('opencitations.net')) return json([])
            if (url.includes('api.openalex.org/works/')) return json({ error: 'nf' }, 404)
            if (url.includes('api.openalex.org')) return json({ results: [] })
            if (url.includes('semanticscholar')) return rateLimited()
            if (url.includes('unpaywall')) return json({ is_oa: false })
            if (url.includes('doaj.org')) return json({ results: [] })
            if (url.includes('core.ac.uk')) return json({ results: [] })
            if (url.includes('plato.stanford.edu')) return new Response('<div class="search_results"></div>')
            if (url.includes('iep.utm.edu')) return json([])
            return new Response('nf', { status: 404 })
        }) as unknown as typeof fetch
    })
    afterEach(() => {
        globalThis.fetch = originalFetch
        __setAcademicCacheForTests(undefined)
        vi.restoreAllMocks()
    })

    it('keeps [P#] consistent: existing works keep their id, new related works continue the numbering', async () => {
        const toolMessages: string[] = []
        const complete: AgentPipelineParams['complete'] = async ({ messages, omitTools }): Promise<CompletionRound> => {
            const tools = messages.filter((m: ChatMessage) => m.role === 'tool')
            if (omitTools && tools.length === 0) return { ok: true, content: 'plan: search then expand', toolCalls: [] }
            if (tools.length === 0) {
                return { ok: true, content: '', toolCalls: [{ id: 't1', name: 'search_academic_corpus', argumentsJson: JSON.stringify({ query: 'Spinoza substance' }) }] }
            }
            if (tools.length === 1) {
                return { ok: true, content: '', toolCalls: [{ id: 't2', name: 'related_papers', argumentsJson: JSON.stringify({ paper: '[P1]', direction: 'references' }) }] }
            }
            for (const t of tools) toolMessages.push(String(t.content))
            return { ok: true, content: 'Spinoza [P1], see also [P3].', toolCalls: [] }
        }
        const result = await runAgentNodePipeline({ complete, baseMessages: [{ role: 'user', content: 'Spinoza substance and related work' }], provider: 'test', env: {} })
        expect(result.ok).toBe(true)
        const citations = result.ok ? result.citations : []
        expect(citations.map((c) => c.id)).toEqual([1, 2, 3])
        expect(citations.map((c) => c.doi)).toEqual(['10.1234/alpha.1', '10.1234/alpha.2', '10.1234/new.1'])
        const related = toolMessages.find((c) => c.startsWith('RELATED PAPERS')) || ''
        expect(related).toMatch(/^RELATED PAPERS for \[P1\] /)
        expect(related).toMatch(/\[P2\] .*Alpha study of Spinoza substance 2/)
        expect(related).toMatch(/\[P3\] .*A new reading of Spinoza on substance and mode/)
        expect(related).not.toMatch(/\[P@|SEED/)
    })
})
