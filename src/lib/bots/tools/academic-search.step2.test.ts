import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { executeToolCall } from './execute'
import {
    __resetAcademicSearchStateForTests,
    formatAcademicPayloadForModel,
    lookupDoiViaCrossref,
    passesRelevanceThreshold,
    planAcademicSources,
    queryTokenSets,
    rankAcademicPapers,
    searchAcademicCorpus,
    type AcademicPaper,
} from '../academic-search'
import { buildDoajUrl, buildTrDizinUrl, prettifyCaps } from '../academic-sources-extra'
import { filterRelevantEntries, parseSepResults, ENCYCLOPEDIA_EXCERPT_MAX } from '../academic-encyclopedia'
import { __setAcademicCacheForTests, ACADEMIC_PARTIAL_TTL_S, ACADEMIC_SEARCH_TTL_S } from '../academic-cache'
import { looksTurkish, stripTags } from '../academic-common'

type Handler = (url: string, init?: RequestInit) => Response | Promise<Response>

const json = (body: unknown, status = 200, headers?: Record<string, string>) =>
    new Response(JSON.stringify(body), { status, headers })

const EMPTY: Record<string, () => Response> = {
    openalex: () => json({ results: [] }),
    crossref: () => json({ message: { items: [] } }),
    s2: () => json({ total: 0, data: [] }),
    epmc: () => json({ resultList: { result: [] } }),
    esearch: () => json({ esearchresult: { idlist: [] } }),
    arxiv: () => new Response('<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"></feed>', { status: 200 }),
    unpaywall: () => json({ is_oa: false }),
    trdizin: () => json({ hits: { hits: [] } }),
    core: () => json({ totalHits: 0, results: [] }),
    doaj: () => json({ total: 0, results: [] }),
    sep: () => new Response('<div class="search_results"></div>', { status: 200 }),
    iep: () => json([]),
    iepPosts: () => json([]),
}

function hostKey(url: string): string {
    if (url.includes('api.openalex.org')) return 'openalex'
    if (url.includes('api.crossref.org')) return 'crossref'
    if (url.includes('semanticscholar.org')) return 's2'
    if (url.includes('ebi.ac.uk/europepmc')) return 'epmc'
    if (url.includes('esearch.fcgi')) return 'esearch'
    if (url.includes('export.arxiv.org')) return 'arxiv'
    if (url.includes('api.unpaywall.org')) return 'unpaywall'
    if (url.includes('search.trdizin.gov.tr')) return 'trdizin'
    if (url.includes('api.core.ac.uk')) return 'core'
    if (url.includes('doaj.org/api')) return 'doaj'
    if (url.includes('plato.stanford.edu')) return 'sep'
    if (url.includes('iep.utm.edu/wp-json/wp/v2/search')) return 'iep'
    if (url.includes('iep.utm.edu/wp-json/wp/v2/posts')) return 'iepPosts'
    return 'other'
}

function installFetch(overrides: Partial<Record<string, Handler>> = {}) {
    const calls: Array<{ key: string; url: string; init?: RequestInit; at: number }> = []
    const fn = vi.fn(async (input: string, init?: RequestInit) => {
        const url = String(input)
        const key = hostKey(url)
        calls.push({ key, url, init, at: Date.now() })
        const handler = overrides[key]
        if (handler) return handler(url, init)
        const fallback = EMPTY[key]
        return fallback ? fallback() : new Response('not found', { status: 404 })
    })
    globalThis.fetch = fn as unknown as typeof fetch
    return { fn, calls }
}

const paper = (over: Partial<AcademicPaper>): AcademicPaper => ({
    id: over.id || 'x',
    title: 'Untitled',
    authors: [],
    citationCount: 0,
    source: 'OpenAlex',
    ...over,
})

const trDizinHit = {
    _id: '136460',
    _source: {
        id: 136460,
        orderTitle: 'OSMANLI MODERNLEŞMESİ VE DEVLET',
        abstracts: [
            { language: 'TUR', title: 'OSMANLI MODERNLEŞMESİ VE DEVLET', abstract: 'Bu çalışma Osmanlı modernleşmesi sürecini <b>inceler</b>.' },
            { language: 'ENG', title: 'Ottoman modernization and the state', abstract: 'This study examines Ottoman modernization.' },
        ],
        authors: [{ inPublicationName: 'Yılmaz YILDIRIM', duty: 'AUTHOR' }],
        publicationYear: 2012,
        journal: { name: 'Afyon Kocatepe Üniversitesi Sosyal Bilimler Dergisi' },
        orderCitationCount: 3,
        doi: '10.1234/TRD.1',
        language: 'TUR',
        accessType: 'OPEN',
        docType: 'PAPER',
        subjects: [{ name: 'Tarih' }],
    },
}

const sepHtml = `
<div class="search_results">
<div class="result_listing">
<div class="result_title"><a class=l href="https://plato.stanford.edu/search/r?entry=/entries/ethics-virtue/&page=1"><b>Virtue</b> <b>Ethics</b>
</a>
</div><!-- end result_title -->
<div class="result_snippet">
Eudaimonist <b>Virtue</b> <b>Ethics</b> in Aristotle<b>...</b> ${'long snippet text '.repeat(40)}
<!--
16.77 = (MATCH) sum of: weight(title:virtue^10.0)
-->
</div><!-- end result_snippet -->
<div class="result_author">Rosalind Hursthouse and Glen Pettigrove
</div>
<div class="result_url">
<a href="https://plato.stanford.edu/search/r?entry=/entries/ethics-virtue/&page=1">https://plato.stanford.edu/entries/ethics-virtue/</a>
</div><!-- end result_url -->
</div>
<div class="result_listing">
<div class="result_title"><a class=l href="x"><b>Virtue</b> Epistemology</a>
</div><!-- end result_title -->
<div class="result_snippet">About knowledge.</div><!-- end result_snippet -->
<div class="result_author">John Turri</div>
<div class="result_url"><a href="x">https://plato.stanford.edu/entries/epistemology-virtue/</a></div>
</div>
</div>`

function fakeCache() {
    const store = new Map<string, { body: string; cacheControl: string | null }>()
    return {
        store,
        match: vi.fn(async (req: Request | string) => {
            const hit = store.get(String(typeof req === 'string' ? req : req.url))
            return hit ? new Response(hit.body, { status: 200, headers: { 'Cache-Control': hit.cacheControl || '' } }) : undefined
        }),
        put: vi.fn(async (req: Request | string, res: Response) => {
            store.set(String(typeof req === 'string' ? req : req.url), {
                body: await res.text(),
                cacheControl: res.headers.get('Cache-Control'),
            })
        }),
    }
}

describe('academic search step 2', () => {
    const originalFetch = globalThis.fetch
    beforeEach(() => {
        vi.restoreAllMocks()
        vi.spyOn(console, 'info').mockImplementation(() => undefined)
        __resetAcademicSearchStateForTests(0, 0)
        __setAcademicCacheForTests(null)
    })
    afterEach(() => {
        globalThis.fetch = originalFetch
        __setAcademicCacheForTests(undefined)
    })

    describe('routing', () => {
        it('detects Turkish phrasing (letters, function words, Turkish-only suffixes)', () => {
            expect(looksTurkish('Marx yabancılaşma emeği')).toBe(true)
            expect(looksTurkish('Heidegger Gestell teknoloji')).toBe(true)
            expect(looksTurkish('Osmanli modernlesmesi')).toBe(true)
            expect(looksTurkish('virtue ethics Aristotle')).toBe(false)
            expect(looksTurkish('Heidegger question concerning technology')).toBe(false)
        })

        it('runs TR Dizin for Turkish original / language tr / Turkish-studies topics only', () => {
            expect(planAcademicSources('virtue ethics Aristotle').run.trdizin).toBe(false)
            expect(planAcademicSources('virtue ethics Aristotle').skipReason.trdizin).toBe('skipped_by_field')
            const bilingual = planAcademicSources('Heidegger enframing technology', { queryOriginal: 'Heidegger Gestell teknoloji' })
            expect(bilingual.run.trdizin).toBe(true)
            expect(bilingual.turkishText).toBe('Heidegger Gestell teknoloji')
            expect(planAcademicSources('ethics', { language: 'tr' }).run.trdizin).toBe(true)
            expect(planAcademicSources('Ottoman modernization reforms').run.trdizin).toBe(true)
        })

        it('runs DOAJ / CORE for humanities or open-access requests, encyclopedias only for philosophy', () => {
            const phil = planAcademicSources('virtue ethics Aristotle')
            expect(phil.run.doaj && phil.run.core && phil.run.sep && phil.run.iep).toBe(true)
            const stem = planAcademicSources('graph neural network message passing')
            expect(stem.run.doaj).toBe(false)
            expect(stem.run.core).toBe(false)
            expect(stem.run.sep).toBe(false)
            expect(stem.skipReason.sep).toBe('skipped_by_field')
            const oa = planAcademicSources('graph neural network message passing', { openAccessOnly: true })
            expect(oa.run.doaj && oa.run.core).toBe(true)
            const history = planAcademicSources('Ottoman modernization reforms')
            expect(history.run.doaj).toBe(true)
            expect(history.run.sep).toBe(false)
        })
    })

    describe('bilingual fan-out', () => {
        it('sends Turkish to TR Dizin / Crossref / OpenAlex(language:tr) and English to the rest, then merges', async () => {
            const { calls } = installFetch({ trdizin: () => json({ hits: { hits: [trDizinHit] } }) })
            const result = await searchAcademicCorpus('Marx alienation labour', {
                queryOriginal: 'Marx emeğin yabancılaşması',
                env: {},
            })
            const tr = calls.find((c) => c.key === 'trdizin')
            expect(new URL(tr?.url || 'http://x').searchParams.get('q')).toBe('Marx emeğin yabancılaşması')
            const oa = calls.filter((c) => c.key === 'openalex').map((c) => new URL(c.url))
            expect(oa).toHaveLength(2)
            expect(oa.some((u) => u.searchParams.get('search') === 'Marx alienation labour' && !u.searchParams.get('filter')?.includes('language:tr'))).toBe(true)
            expect(oa.some((u) => u.searchParams.get('search') === 'Marx emeğin yabancılaşması' && u.searchParams.get('filter')?.includes('language:tr'))).toBe(true)
            const cr = calls.filter((c) => c.key === 'crossref').map((c) => new URL(c.url).searchParams.get('query'))
            expect(cr.sort()).toEqual(['Marx alienation labour', 'Marx emeğin yabancılaşması'].sort())
            const s2 = calls.find((c) => c.key === 's2')
            expect(new URL(s2?.url || 'http://x').searchParams.get('query')).toContain('Marx alienation labour')
            const doaj = calls.find((c) => c.key === 'doaj')
            expect(decodeURIComponent(doaj?.url || '')).toContain('Marx alienation labour')
            expect(result.sources?.some((s) => s.source === 'openalex' && s.lang === 'tr')).toBe(true)
            expect(result.sources?.some((s) => s.source === 'crossref' && s.lang === 'tr')).toBe(true)
            expect(result.queryOriginal).toBe('Marx emeğin yabancılaşması')
            const payload = formatAcademicPayloadForModel(result)
            expect(payload).toContain('openalex[tr] ok(0)')
            expect(payload).toContain('/ "Marx emeğin yabancılaşması"')
        })

        it('maps TR Dizin hits (title case, authors, DOI, OA, landing URL) and keeps them past the threshold via the Turkish tokens', async () => {
            installFetch({ trdizin: () => json({ hits: { hits: [trDizinHit] } }) })
            const result = await searchAcademicCorpus('Ottoman modernization', { queryOriginal: 'Osmanlı modernleşmesi', env: {} })
            const p = result.papers.find((x) => x.source === 'TR Dizin')
            expect(p).toBeDefined()
            expect(p?.title).toBe('Osmanlı Modernleşmesi ve Devlet')
            expect(p?.authors).toEqual(['Yılmaz Yıldırım'])
            expect(p?.doi).toBe('https://doi.org/10.1234/trd.1')
            expect(p?.url).toBe('https://search.trdizin.gov.tr/tr/yayin/detay/136460')
            expect(p?.isOpenAccess).toBe(true)
            expect(p?.language).toBe('tr')
            expect(p?.abstract).toBe('Bu çalışma Osmanlı modernleşmesi sürecini inceler.')
        })

        it('builds TR Dizin / DOAJ URLs safely', () => {
            const tr = new URL(buildTrDizinUrl('  Osmanlı   modernleşmesi ', 5))
            expect(tr.searchParams.get('q')).toBe('Osmanlı modernleşmesi')
            expect(tr.searchParams.get('order')).toBe('relevance-DESC')
            expect(tr.searchParams.get('limit')).toBe('5')
            expect(buildDoajUrl('virtue (ethics) AND "Aristotle":x', 3)).toBe(
                'https://doaj.org/api/search/articles/virtue%20ethics%20Aristotle%20x?page=1&pageSize=3'
            )
            expect(prettifyCaps('Mixed Case Title')).toBe('Mixed Case Title')
            expect(stripTags('Andrew Feenberg\\u27s Interpretation')).toBe("Andrew Feenberg's Interpretation")
            // English all-caps titles must not get Turkish dotless ı; roman numerals, suffixes, minor words.
            expect(prettifyCaps('THE FOUNDATIONS OF MARX’S THEORY OF ALIENATION', 'en')).toBe('The Foundations of Marx’s Theory of Alienation')
            expect(prettifyCaps("KARL MARX'IN YABANCILAŞMA KAVRAMI", 'tr')).toBe("Karl Marx'ın Yabancılaşma Kavramı")
            expect(prettifyCaps('OSMANLI’NIN XIX. YÜZYILDAKİ MODERNLEŞME VE REFORM ÇABALARI')).toBe('Osmanlı’nın XIX. Yüzyıldaki Modernleşme ve Reform Çabaları')
        })
    })

    describe('DOAJ / CORE', () => {
        it('maps DOAJ articles as open access with PDF / landing links', async () => {
            installFetch({
                doaj: () =>
                    json({
                        results: [
                            {
                                id: 'd1',
                                bibjson: {
                                    title: 'Virtue ethics and Aristotle today',
                                    author: [{ name: 'Ada Lovelace' }],
                                    year: '2019',
                                    journal: { title: 'Ethics Open', language: ['EN'] },
                                    identifier: [{ type: 'doi', id: '10.5555/doaj.1' }],
                                    link: [{ type: 'fulltext', url: 'https://ethics.example/a.pdf', content_type: 'PDF' }],
                                    abstract: 'Aristotle on virtue.',
                                },
                            },
                        ],
                    }),
            })
            const result = await searchAcademicCorpus('virtue ethics Aristotle', { env: {} })
            const p = result.papers.find((x) => x.source === 'DOAJ')
            expect(p).toMatchObject({ isOpenAccess: true, pdfUrl: 'https://ethics.example/a.pdf', year: 2019, venue: 'Ethics Open', language: 'en' })
            expect(result.sources?.find((s) => s.source === 'doaj')?.status).toBe('ok')
        })

        it('serializes CORE requests module-wide (keyless 5 req / 10 s) and parks CORE after a 429', async () => {
            __resetAcademicSearchStateForTests(0, 150)
            const { calls } = installFetch()
            await Promise.all([
                searchAcademicCorpus('virtue ethics Aristotle', { env: {}, noCache: true }),
                searchAcademicCorpus('Kant categorical imperative', { env: {}, noCache: true }),
            ])
            const coreCalls = calls.filter((c) => c.key === 'core')
            expect(coreCalls).toHaveLength(2)
            expect(coreCalls[1].at - coreCalls[0].at).toBeGreaterThanOrEqual(140)
            expect(coreCalls.every((c) => c.url.startsWith('https://api.core.ac.uk/v3/search/works/?'))).toBe(true)

            __resetAcademicSearchStateForTests(0, 0)
            const later = new Date(Date.now() + 5 * 60_000).toISOString().replace('Z', '+0000').replace(/\.\d{3}/, '')
            const second = installFetch({ core: () => json({ message: 'rate limited' }, 429, { 'X-RateLimit-Retry-After': later }) })
            const r1 = await searchAcademicCorpus('virtue ethics Aristotle', { env: {} })
            expect(r1.sources?.find((s) => s.source === 'core')).toMatchObject({ status: 'failed', reason: 'rate_limited', httpStatus: 429 })
            expect(second.calls.filter((c) => c.key === 'core')).toHaveLength(1) // no retry for CORE
            const r2 = await searchAcademicCorpus('Hume causation', { env: {} })
            expect(r2.sources?.find((s) => s.source === 'core')).toMatchObject({ status: 'failed', reason: 'cooldown' })
            expect(second.calls.filter((c) => c.key === 'core')).toHaveLength(1) // parked: no request sent
        })
    })

    describe('encyclopedia lookup', () => {
        it('parses SEP results into title + canonical URL + ≤300 char excerpt without score comments', () => {
            const entries = parseSepResults(sepHtml, 5)
            expect(entries[0]).toMatchObject({
                source: 'SEP',
                title: 'Virtue Ethics',
                url: 'https://plato.stanford.edu/entries/ethics-virtue/',
                authors: ['Rosalind Hursthouse', 'Glen Pettigrove'],
            })
            expect((entries[0].excerpt || '').length).toBeLessThanOrEqual(ENCYCLOPEDIA_EXCERPT_MAX)
            expect(entries[0].excerpt).not.toContain('MATCH')
            expect(filterRelevantEntries('virtue ethics Aristotle', entries).map((e) => e.title)).toEqual(['Virtue Ethics'])
        })

        it('marks SEP / IEP entries as encyclopedia items (not papers) in payload and citations', async () => {
            installFetch({
                sep: () => new Response(sepHtml, { status: 200 }),
                iep: () => json([{ id: 2262, title: 'Virtue Ethics', url: 'https://iep.utm.edu/virtue/' }, { id: 9, title: 'Neo-Kantianism', url: 'https://iep.utm.edu/neo-kant/' }]),
                iepPosts: () =>
                    json([{ id: 2262, excerpt: { rendered: '<p>Virtue Ethics Virtue ethics is a broad term for theories that emphasize character, as in Aristotle &hellip; <a href="x">Continue reading</a></p>' } }]),
                openalex: () =>
                    json({
                        results: [
                            { id: 'W1', title: 'Aristotle on virtue ethics', publication_year: 2001, cited_by_count: 10, authorships: [], primary_location: { source: { display_name: 'Phronesis' } } },
                        ],
                    }),
            })
            const executed = await executeToolCall(
                { id: 'c1', name: 'search_academic_corpus', argumentsJson: JSON.stringify({ query: 'virtue ethics Aristotle' }) },
                {}
            )
            expect(executed.ok).toBe(true)
            const lines = executed.result.split('\n')
            expect(lines.find((l) => l.startsWith('[P1]'))).toContain('Aristotle on virtue ethics')
            const encLines = lines.filter((l) => l.includes('ENCYCLOPEDIA ('))
            expect(encLines.length).toBe(2)
            expect(encLines[0]).toMatch(/^\[P2\] ENCYCLOPEDIA \(Stanford Encyclopedia of Philosophy\) "Virtue Ethics"/)
            expect(encLines[1]).toMatch(/^\[P3\] ENCYCLOPEDIA \(Internet Encyclopedia of Philosophy\) "Virtue Ethics"/)
            expect(encLines[1]).not.toContain('Continue reading')
            expect(executed.result).toContain('not papers')
            const cites = executed.citations || []
            expect(cites.map((c) => [c.id, c.kind])).toEqual([
                [1, 'paper'],
                [2, 'encyclopedia'],
                [3, 'encyclopedia'],
            ])
            expect(cites[1]).toMatchObject({ url: 'https://plato.stanford.edu/entries/ethics-virtue/', source: 'SEP' })
            expect((cites[2].snippet || '').length).toBeLessThanOrEqual(300)
        })

        it('encyclopedia failures never degrade scholarly coverage', async () => {
            installFetch({ sep: () => new Response('boom', { status: 503 }), iep: () => new Response('boom', { status: 503 }) })
            const result = await searchAcademicCorpus('virtue ethics Aristotle', { env: {} })
            expect(result.sources?.find((s) => s.source === 'sep')?.status).toBe('failed')
            expect(result.degraded).toBe(false)
            expect(result.ok).toBe(true)
        })
    })

    describe('rank fusion + relevance threshold', () => {
        it('drops weak hits such as Themistius for "virtue ethics Aristotle"', () => {
            const sets = queryTokenSets('virtue ethics Aristotle')
            const themistius = paper({ id: 't', title: "Themistius' Paraphrase of Aristotle's De Anima", abstract: 'A commentary on the soul.' })
            const good = paper({ id: 'g', title: 'Aristotle and virtue ethics', abstract: 'Virtue in the Nicomachean Ethics.' })
            expect(passesRelevanceThreshold(themistius, sets)).toBe(false)
            expect(passesRelevanceThreshold(good, sets)).toBe(true)
        })

        it('uses the original-language tokens too (Turkish hits are not dropped for an English query)', () => {
            const sets = queryTokenSets('Marx alienation labour', 'Marx yabancılaşma emeği')
            const trPaper = paper({ id: 'tr', title: "Marx'ta yabancılaşma kavramı", source: 'TR Dizin' })
            expect(passesRelevanceThreshold(trPaper, sets)).toBe(true)
        })

        it('agreement across sources outranks a highly cited single-source paper; bonuses stay modest', () => {
            const cited = paper({ id: 'cited', title: 'Virtue ethics and Aristotle', citationCount: 50_000, ranks: { openalex: 1 }, pdfUrl: 'https://x/a.pdf' })
            const agreed = paper({ id: 'agreed', title: 'Virtue ethics and Aristotle revisited', citationCount: 3, ranks: { openalex: 2, crossref: 1, doaj: 1 } })
            const ranked = rankAcademicPapers('virtue ethics Aristotle', [cited, agreed], 'relevance')
            expect(ranked[0].id).toBe('agreed')
            expect((ranked[1].score || 0) - (ranked[0].score || 0)).toBeLessThan(0)
        })

        it('search reports dropped weak matches in the notice', async () => {
            installFetch({
                crossref: () =>
                    json({
                        message: {
                            items: [
                                { DOI: '10.1234/good', title: ['Aristotle on virtue ethics'], author: [{ given: 'A', family: 'B' }], issued: { 'date-parts': [[2010]] } },
                                { DOI: '10.1234/weak', title: ["Themistius' paraphrase of Aristotle's De Anima"], issued: { 'date-parts': [[1990]] } },
                            ],
                        },
                    }),
            })
            const result = await searchAcademicCorpus('virtue ethics Aristotle', { env: {} })
            expect(result.papers.map((p) => p.title)).toEqual(['Aristotle on virtue ethics'])
            expect(result.droppedWeak).toBe(1)
            expect(result.notice).toContain('1 weak match below the relevance threshold dropped')
        })
    })

    describe('shared cache (Cloudflare Cache API)', () => {
        it('is a silent no-op when caches are unavailable', async () => {
            __setAcademicCacheForTests(null)
            const { calls } = installFetch()
            await searchAcademicCorpus('virtue ethics Aristotle', { env: {} })
            await searchAcademicCorpus('virtue ethics Aristotle', { env: {} })
            expect(calls.filter((c) => c.key === 'crossref')).toHaveLength(2)
        })

        it('serves repeat searches (normalized query + filters) from the cache with a ~3 day TTL', async () => {
            const cache = fakeCache()
            __setAcademicCacheForTests(cache)
            const { calls } = installFetch({
                crossref: () => json({ message: { items: [{ DOI: '10.1234/good', title: ['Aristotle on virtue ethics'], issued: { 'date-parts': [[2010]] } }] } }),
            })
            const first = await searchAcademicCorpus('Virtue  ethics Aristotle', { env: {} })
            expect(first.cached).toBeUndefined()
            const before = calls.length
            const second = await searchAcademicCorpus('virtue ethics aristotle', { env: {} })
            expect(second.cached).toBe(true)
            expect(second.papers.map((p) => p.title)).toEqual(first.papers.map((p) => p.title))
            expect(calls.length).toBe(before)
            const searchEntry = Array.from(cache.store.entries()).find(([k]) => k.includes('/search/'))
            expect(searchEntry?.[1].cacheControl).toBe(`public, max-age=${ACADEMIC_SEARCH_TTL_S}`)
            // Different filters → different key.
            await searchAcademicCorpus('virtue ethics aristotle', { env: {}, yearFrom: 2000 })
            expect(calls.length).toBeGreaterThan(before)
        })

        it('caches partial coverage briefly, total failure never, and Unpaywall lookups for ~30 days', async () => {
            const cache = fakeCache()
            __setAcademicCacheForTests(cache)
            installFetch({
                openalex: () => json({}, 503),
                crossref: () => json({ message: { items: [{ DOI: '10.1234/good', title: ['Aristotle on virtue ethics'], issued: { 'date-parts': [[2010]] } }] } }),
                unpaywall: () => json({ is_oa: true, best_oa_location: { url_for_pdf: 'https://oa.example/p.pdf' } }),
            })
            const r = await searchAcademicCorpus('virtue ethics Aristotle', { env: {} })
            expect(r.papers[0].pdfUrl).toBe('https://oa.example/p.pdf')
            const entries = Array.from(cache.store.entries())
            expect(entries.find(([k]) => k.includes('/search/'))?.[1].cacheControl).toBe(`public, max-age=${ACADEMIC_PARTIAL_TTL_S}`)
            expect(entries.find(([k]) => k.includes('/unpaywall/'))?.[1].cacheControl).toBe(`public, max-age=${30 * 24 * 60 * 60}`)

            const failCache = fakeCache()
            __setAcademicCacheForTests(failCache)
            installFetch({ openalex: () => json({}, 503), crossref: () => json({}, 503), s2: () => json({}, 503), doaj: () => json({}, 503), core: () => json({}, 503) })
            const failed = await searchAcademicCorpus('zzqx nonexistent notion', { env: {} })
            expect(failed.allSourcesFailed).toBe(true)
            expect(Array.from(failCache.store.keys()).some((k) => k.includes('/search/'))).toBe(false)
        })
    })

    describe('Crossref DOI lookup', () => {
        it('returns metadata when found, found:false on 404, transient on network errors', async () => {
            installFetch({
                crossref: (url) =>
                    url.includes('10.1234%2Freal') || url.includes('10.1234/real')
                        ? json({ message: { title: ['Real paper'], author: [{ given: 'Jane', family: 'Doe' }], issued: { 'date-parts': [[2020]] }, 'container-title': ['J'] } })
                        : json({ status: 'error' }, 404),
            })
            expect(await lookupDoiViaCrossref('https://doi.org/10.1234/REAL', { noCache: true })).toMatchObject({
                doi: '10.1234/real',
                found: true,
                title: 'Real paper',
                authors: ['Jane Doe'],
                year: 2020,
            })
            expect(await lookupDoiViaCrossref('10.1234/fake', { noCache: true })).toEqual({ doi: '10.1234/fake', found: false })
            globalThis.fetch = vi.fn(async () => {
                throw new TypeError('network down')
            }) as unknown as typeof fetch
            expect(await lookupDoiViaCrossref('10.1234/x', { noCache: true })).toMatchObject({ found: false, transient: true })
        })
    })

    describe('tool schema', () => {
        it('passes query_original from the tool call through to the Turkish fan-out', async () => {
            const { calls } = installFetch()
            await executeToolCall(
                {
                    id: 'c2',
                    name: 'search_academic_corpus',
                    argumentsJson: JSON.stringify({ query: 'Heidegger enframing technology', query_original: 'Heidegger Gestell teknoloji' }),
                },
                {}
            )
            const tr = calls.find((c) => c.key === 'trdizin')
            expect(new URL(tr?.url || 'http://x').searchParams.get('q')).toBe('Heidegger Gestell teknoloji')
        })
    })
})
