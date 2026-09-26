import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { executeToolCall } from './execute'
import {
    __resetAcademicSearchStateForTests,
    ACADEMIC_CITE_INSTRUCTION,
    formatAcademicPayloadForModel,
    formatAcademicResults,
    mergeAcademicPapers,
    normalizeTitleKey,
    planAcademicSources,
    resolveAcademicApiKeys,
    resolveFieldProfile,
    retryDelayFromHeader,
    searchAcademicCorpus,
    type AcademicPaper,
    type AcademicSearchResult,
} from '../academic-search'

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
}

function hostKey(url: string): string {
    if (url.includes('api.openalex.org')) return 'openalex'
    if (url.includes('api.crossref.org')) return 'crossref'
    if (url.includes('semanticscholar.org')) return 's2'
    if (url.includes('ebi.ac.uk/europepmc')) return 'epmc'
    if (url.includes('esearch.fcgi')) return 'esearch'
    if (url.includes('esummary.fcgi')) return 'esummary'
    if (url.includes('export.arxiv.org')) return 'arxiv'
    if (url.includes('api.unpaywall.org')) return 'unpaywall'
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

function must<T>(value: T | undefined, label: string): T {
    if (value === undefined) throw new Error(`missing ${label}`)
    return value
}

const callFor = (calls: Array<{ key: string; url: string; init?: RequestInit }>, key: string) =>
    must(calls.find((c) => c.key === key), `${key} call`)

const paper = (over: Partial<AcademicPaper>): AcademicPaper => ({
    id: over.id || 'x',
    title: 'Untitled',
    authors: [],
    citationCount: 0,
    source: 'OpenAlex',
    ...over,
})

describe('academic search step 1 — sources, keys, status, payload', () => {
    const originalFetch = globalThis.fetch
    beforeEach(() => {
        vi.restoreAllMocks()
        vi.spyOn(console, 'info').mockImplementation(() => undefined)
        __resetAcademicSearchStateForTests(0)
    })
    afterEach(() => {
        globalThis.fetch = originalFetch
    })

    describe('API keys', () => {
        const env = {
            OPENALEX_API_KEY: 'oa-secret-123',
            SEMANTIC_SCHOLAR_API_KEY: 's2-secret-456',
            NCBI_API_KEY: 'ncbi-secret-789',
            ACADEMIC_CONTACT_EMAIL: 'team@example.org',
        }

        it('sends keys the documented way when present (api_key param / x-api-key header / NCBI api_key)', async () => {
            const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
            const infoSpy = console.info as unknown as ReturnType<typeof vi.fn>
            const { calls } = installFetch()
            const result = await searchAcademicCorpus('sleep deprivation clinical memory', { env })

            const oa = callFor(calls, 'openalex')
            expect(new URL(oa.url).searchParams.get('api_key')).toBe('oa-secret-123')
            const s2 = callFor(calls, 's2')
            expect((s2.init?.headers as Record<string, string>)['x-api-key']).toBe('s2-secret-456')
            const ncbi = callFor(calls, 'esearch')
            expect(new URL(ncbi.url).searchParams.get('api_key')).toBe('ncbi-secret-789')
            expect(new URL(ncbi.url).searchParams.get('email')).toBe('team@example.org')
            const cr = callFor(calls, 'crossref')
            expect(new URL(cr.url).searchParams.get('mailto')).toBe('team@example.org')

            expect(result.sources?.find((s) => s.source === 'openalex')?.keyed).toBe(true)
            // Keys never logged and never in the model payload.
            const logged = JSON.stringify([...logSpy.mock.calls, ...warnSpy.mock.calls, ...infoSpy.mock.calls])
            for (const secret of ['oa-secret-123', 's2-secret-456', 'ncbi-secret-789']) {
                expect(logged).not.toContain(secret)
                expect(formatAcademicPayloadForModel(result)).not.toContain(secret)
            }
        })

        it('works keyless: no api_key / x-api-key, default contact email', async () => {
            const { calls } = installFetch()
            const result = await searchAcademicCorpus('sleep deprivation clinical memory', { env: {} })
            const oa = callFor(calls, 'openalex')
            expect(new URL(oa.url).searchParams.get('api_key')).toBeNull()
            expect(new URL(oa.url).searchParams.get('mailto')).toBe('info@worldinmaking.com')
            const s2 = callFor(calls, 's2')
            expect((s2.init?.headers as Record<string, string>)['x-api-key']).toBeUndefined()
            const ncbi = callFor(calls, 'esearch')
            expect(new URL(ncbi.url).searchParams.get('api_key')).toBeNull()
            expect(result.ok).toBe(true)
            expect(resolveAcademicApiKeys({ ACADEMIC_CONTACT_EMAIL: 'not-an-email' }).contactEmail).toBe(
                'info@worldinmaking.com'
            )
        })
    })

    describe('429 / 5xx retry', () => {
        it('retries once on 429 honouring a short Retry-After, then succeeds', async () => {
            let s2Calls = 0
            installFetch({
                s2: () => {
                    s2Calls += 1
                    if (s2Calls === 1) return json({ message: 'Too Many Requests' }, 429, { 'Retry-After': '0' })
                    return json({ total: 1, data: [{ paperId: 'abc', title: 'Virtue and the Good Life', year: 2001, authors: [{ name: 'A. Author' }] }] })
                },
            })
            const result = await searchAcademicCorpus('virtue ethics Aristotle', { env: {} })
            expect(s2Calls).toBe(2)
            const s2 = result.sources?.find((s) => s.source === 'semantic_scholar')
            expect(s2?.status).toBe('ok')
            expect(s2?.count).toBe(1)
        })

        it('does not retry when Retry-After exceeds 3 s and reports rate_limited', async () => {
            let oaCalls = 0
            installFetch({
                openalex: () => {
                    oaCalls += 1
                    return json({ error: 'Rate limit exceeded' }, 429, { 'Retry-After': '33888' })
                },
            })
            const result = await searchAcademicCorpus('virtue ethics Aristotle', { env: {} })
            expect(oaCalls).toBe(1)
            const oa = result.sources?.find((s) => s.source === 'openalex')
            expect(oa).toMatchObject({ status: 'failed', reason: 'rate_limited', httpStatus: 429 })
            expect(result.degraded).toBe(true)
            expect(result.ok).toBe(true)
            expect(result.notice).toContain('openalex: rate_limited')
        })

        it('parses Retry-After seconds and HTTP dates', () => {
            expect(retryDelayFromHeader(null)).toBeGreaterThan(0)
            expect(retryDelayFromHeader('2')).toBe(2000)
            expect(retryDelayFromHeader('10')).toBeNull()
            const now = Date.parse('2026-09-25T12:00:00Z')
            expect(retryDelayFromHeader('Fri, 25 Sep 2026 12:00:01 GMT', now)).toBe(1000)
            expect(retryDelayFromHeader('Fri, 25 Sep 2026 12:01:00 GMT', now)).toBeNull()
        })

        it('reports timeouts as timeout', async () => {
            installFetch({
                crossref: () => {
                    throw new DOMException('The operation timed out.', 'TimeoutError')
                },
            })
            const result = await searchAcademicCorpus('virtue ethics Aristotle', { env: {} })
            expect(result.sources?.find((s) => s.source === 'crossref')).toMatchObject({ status: 'failed', reason: 'timeout' })
        })
    })

    describe('all sources failed', () => {
        it('returns ok:false / degraded with a clear "unavailable" message instead of "no literature"', async () => {
            installFetch({
                openalex: () => json({}, 503),
                crossref: () => json({}, 503),
                s2: () => json({}, 429, { 'Retry-After': '60' }),
            })
            const result = await searchAcademicCorpus('zzqx obscure nonexistent notion', { env: {} })
            expect(result.ok).toBe(false)
            expect(result.allSourcesFailed).toBe(true)
            expect(result.degraded).toBe(true)
            expect(result.papers).toHaveLength(0)
            expect(result.notice).toContain('NOT evidence that no literature exists')
            expect(result.sources?.filter((s) => s.status === 'skipped').map((s) => s.source).sort()).toEqual(
                ['arxiv', 'core', 'doaj', 'europepmc', 'iep', 'pubmed', 'sep', 'trdizin'].sort()
            )
        }, 15000)

        it('executeToolCall surfaces the degraded failure to the model and UI', async () => {
            installFetch({
                openalex: () => json({}, 503),
                crossref: () => json({}, 503),
                s2: () => json({}, 429, { 'Retry-After': '60' }),
            })
            const executed = await executeToolCall({
                id: 'deg-1',
                name: 'search_academic_corpus',
                argumentsJson: JSON.stringify({ query: 'zzqx obscure nonexistent notion' }),
            })
            expect(executed.ok).toBe(false)
            const parsed = JSON.parse(executed.result)
            expect(parsed.ok).toBe(false)
            expect(parsed.degraded).toBe(true)
            expect(parsed.error).toContain('Academic search unavailable')
            expect(parsed.sources.openalex).toBe('failed:http_error')
            expect(parsed.sources.semantic_scholar).toBe('failed:rate_limited')
            expect(parsed.sources.pubmed).toBe('skipped:skipped_by_field')
        }, 15000)

        it('zero results from healthy sources is a normal ok result (not degraded)', async () => {
            installFetch()
            const result = await searchAcademicCorpus('zzqx obscure nonexistent notion', { env: {} })
            expect(result.ok).toBe(true)
            expect(result.degraded).toBe(false)
            expect(formatAcademicPayloadForModel(result)).toContain('No papers were returned')
        })
    })

    describe('duplicate merge', () => {
        it('merges by DOI across sources and fills missing fields with the best values', () => {
            const merged = mergeAcademicPapers([
                paper({ id: 'oa', title: 'The Question Concerning Technology', doi: 'https://doi.org/10.1000/ABC', citationCount: 10, source: 'OpenAlex', authors: ['M. Heidegger'] }),
                paper({
                    id: 'cr',
                    title: 'The question concerning technology',
                    doi: '10.1000/abc',
                    citationCount: 250,
                    venue: 'Harper & Row',
                    abstract: 'Heidegger on Gestell (enframing).',
                    source: 'Crossref',
                }),
                paper({ id: 's2', title: 'Question Concerning Technology, The', doi: 'https://dx.doi.org/10.1000/abc', pdfUrl: 'https://example.org/qct.pdf', source: 'Semantic Scholar' }),
            ])
            expect(merged).toHaveLength(1)
            const m = merged[0]
            expect(m.id).toBe('oa')
            expect(m.citationCount).toBe(250)
            expect(m.venue).toBe('Harper & Row')
            expect(m.abstract).toContain('Gestell')
            expect(m.pdfUrl).toBe('https://example.org/qct.pdf')
            expect(m.authors).toEqual(['M. Heidegger'])
            expect(m.sources).toEqual(['OpenAlex', 'Crossref', 'Semantic Scholar'])
        })

        it('merges by normalized title when a copy lacks a DOI, but never merges two different DOIs', () => {
            const merged = mergeAcademicPapers([
                paper({ id: 'a', title: 'Being and Time', doi: '10.1000/aaa', source: 'Crossref' }),
                paper({ id: 'b', title: 'Being and Time', source: 'ArXiv', pdfUrl: 'https://arxiv.org/pdf/1.pdf' }),
                paper({ id: 'c', title: 'Being and Time', doi: '10.1000/bbb', source: 'OpenAlex' }),
            ])
            expect(merged.map((p) => p.id)).toEqual(['a', 'c'])
            expect(merged[0].pdfUrl).toBe('https://arxiv.org/pdf/1.pdf')
        })

        it('Unicode-aware title keys keep Turkish letters and fold case/diacritics consistently', () => {
            const a = normalizeTitleKey("Heidegger'de Teknoloji ve Gestell Kavramı")
            const b = normalizeTitleKey('HEIDEGGER’DE TEKNOLOJİ VE GESTELL KAVRAMI')
            expect(a).toBe(b)
            expect(a).toBe('heideggerdeteknolojivegestellkavrami')
            // Titles made only of non-ASCII letters are not collapsed to empty.
            expect(normalizeTitleKey('Çağdaş Felsefede Özne Sorunu')).toBe('cagdasfelsefedeoznesorunu')
            expect(normalizeTitleKey('Бытие и время: заметки')).not.toBe('')
            const merged = mergeAcademicPapers([
                paper({ id: 'tr1', title: 'Teknoloji Felsefesinde Özne', source: 'Crossref' }),
                paper({ id: 'tr2', title: 'TEKNOLOJİ FELSEFESİNDE ÖZNE', source: 'OpenAlex', abstract: 'Özet' }),
                paper({ id: 'tr3', title: 'Teknoloji Felsefesinde Nesne', source: 'OpenAlex' }),
            ])
            expect(merged.map((p) => p.id)).toEqual(['tr1', 'tr3'])
            expect(merged[0].abstract).toBe('Özet')
        })

        it('merges duplicates end-to-end in searchAcademicCorpus', async () => {
            installFetch({
                crossref: () =>
                    json({
                        message: {
                            items: [
                                { DOI: '10.5555/virtue.1', title: ['Aristotle on Virtue'], author: [{ given: 'Jane', family: 'Doe' }], 'is-referenced-by-count': 40, 'container-title': ['Phronesis'] },
                            ],
                        },
                    }),
                s2: () =>
                    json({
                        total: 1,
                        data: [
                            {
                                paperId: 'p1',
                                title: 'Aristotle on virtue',
                                externalIds: { DOI: '10.5555/VIRTUE.1' },
                                abstract: 'An account of arete.',
                                openAccessPdf: { url: 'https://repo.example.edu/virtue.pdf' },
                                citationCount: 55,
                                authors: [{ name: 'Jane Doe' }],
                            },
                        ],
                    }),
            })
            const result = await searchAcademicCorpus('Aristotle virtue', { env: {} })
            expect(result.papers).toHaveLength(1)
            expect(result.papers[0]).toMatchObject({
                citationCount: 55,
                abstract: 'An account of arete.',
                pdfUrl: 'https://repo.example.edu/virtue.pdf',
                venue: 'Phronesis',
            })
            expect(result.papers[0].sources).toEqual(['Crossref', 'Semantic Scholar'])
        })
    })

    describe('compact model payload', () => {
        const bigResult = (count: number, titleLen = 120): AcademicSearchResult => ({
            ok: true,
            query: 'Heidegger Gestell teknoloji',
            total: count,
            papers: Array.from({ length: count }, (_, i) =>
                paper({
                    id: `p${i}`,
                    title: `Paper ${i} ${'on the essence of technology '.repeat(10)}`.slice(0, titleLen),
                    authors: ['Alpha Author', 'Beta Author', 'Gamma Author', 'Delta Author'],
                    year: 2000 + i,
                    venue: 'Journal of Continental Philosophy and Phenomenological Research',
                    citationCount: 100 - i,
                    doi: `https://doi.org/10.1234/wim.${i}`,
                    pdfUrl: `https://repository.example.edu/bitstreams/very/long/path/${i}/fulltext-download.pdf`,
                    abstract: 'Gestell names the enframing essence of modern technology. '.repeat(12),
                })
            ),
            formatted: '',
            sources: [
                { source: 'openalex', status: 'failed', reason: 'rate_limited', httpStatus: 429, count: 0, ms: 10 },
                { source: 'crossref', status: 'ok', count: count, ms: 10 },
                { source: 'semantic_scholar', status: 'ok', count: 0, ms: 10 },
                { source: 'europepmc', status: 'skipped', reason: 'skipped_by_field', count: 0, ms: 0 },
                { source: 'pubmed', status: 'skipped', reason: 'skipped_by_field', count: 0, ms: 0 },
                { source: 'arxiv', status: 'skipped', reason: 'skipped_by_field', count: 0, ms: 0 },
            ],
            notice: 'Partial coverage (openalex: rate_limited); results come only from the sources that responded.',
        })

        it('one line per paper with stable [P#] ids, within the cap, never cut mid-line', () => {
            const text = formatAcademicPayloadForModel(bigResult(5), 4000)
            expect(text.length).toBeLessThanOrEqual(4000)
            expect(text).toContain(ACADEMIC_CITE_INSTRUCTION)
            expect(text).toContain('openalex failed(rate_limited 429)')
            expect(text).toContain('pubmed skipped(skipped_by_field)')
            const lines = text.split('\n').filter((l) => l.startsWith('[P'))
            expect(lines.map((l) => l.slice(0, 4))).toEqual(['[P1]', '[P2]', '[P3]', '[P4]', '[P5]'])
            expect(lines[0]).toContain('Alpha Author; Beta Author; Gamma Author et al. (2000)')
            expect(lines[0]).toContain('https://doi.org/10.1234/wim.0.')
            expect(lines[0]).toContain('cites:100.')
            expect(lines[0]).toContain('OA:https://repository.example.edu/')
            expect(lines[0]).toContain('Abstract: Gestell')
            expect(text).not.toContain('{')
        })

        it('shortens abstracts first, then drops whole lowest-ranked papers', () => {
            const ten = formatAcademicPayloadForModel(bigResult(10), 4000)
            expect(ten.length).toBeLessThanOrEqual(4000)
            const small = formatAcademicPayloadForModel(bigResult(10, 220), 1800)
            expect(small.length).toBeLessThanOrEqual(1800)
            expect(small).toMatch(/lower-ranked papers? omitted for length\)$/)
            for (const line of small.split('\n').filter((l) => l.startsWith('[P'))) {
                expect(line).not.toContain('Abstract:')
                expect(line.endsWith('.')).toBe(true)
            }
        })

        it('executeToolCall payload stays under MAX_TOOL_RESULT with 10 rich papers', async () => {
            const items = Array.from({ length: 10 }, (_, i) => ({
                DOI: `10.9999/rich.${i}`,
                title: [`Rich paper ${i} about virtue ethics and Aristotle ${'x'.repeat(150)}`],
                author: [{ given: 'A', family: `Author${i}` }, { given: 'B', family: 'Second' }, { given: 'C', family: 'Third' }, { given: 'D', family: 'Fourth' }],
                abstract: `<jats:p>${'Virtue ethics abstract text. '.repeat(40)}</jats:p>`,
                'container-title': ['A Very Long Journal Name For Testing Payload Truncation Behaviour'],
                'is-referenced-by-count': 1000 - i,
            }))
            installFetch({ crossref: () => json({ message: { items } }) })
            const executed = await executeToolCall({
                id: 'size-1',
                name: 'search_academic_corpus',
                argumentsJson: JSON.stringify({ query: 'virtue ethics Aristotle', limit: 10 }),
            })
            expect(executed.ok).toBe(true)
            expect(executed.result.length).toBeLessThanOrEqual(4000)
            const last = executed.result.split('\n').pop() as string
            expect(/^\[P\d+\]/.test(last) || /omitted for length\)$/.test(last)).toBe(true)
            // UI citations still cover every returned paper
            expect(executed.citations?.length).toBe(10)
            expect(executed.citations?.[0]).toMatchObject({ id: 1, url: 'https://doi.org/10.9999/rich.0' })
        })
    })

    describe('field routing', () => {
        it('maps fields (English and Turkish) to OpenAlex topic filters', () => {
            expect(resolveFieldProfile('Philosophy')?.openAlex.subfields).toEqual([1211])
            expect(resolveFieldProfile('felsefe')?.key).toBe('philosophy')
            expect(resolveFieldProfile('Etik')?.key).toBe('philosophy')
            expect(resolveFieldProfile('sosyoloji')?.openAlex.subfields).toEqual([3312])
            expect(resolveFieldProfile('psychology')?.openAlex.fields).toEqual([32])
            expect(resolveFieldProfile('underwater basket weaving')).toBeUndefined()
        })

        it('skips PubMed/Europe PMC and arXiv for philosophy queries', () => {
            const plan = planAcademicSources('Heidegger Gestell teknoloji', { field: 'philosophy' })
            expect(plan.run).toMatchObject({ openalex: true, crossref: true, semantic_scholar: true, pubmed: false, europepmc: false, arxiv: false })
            expect(plan.skipReason).toMatchObject({ pubmed: 'skipped_by_field', europepmc: 'skipped_by_field', arxiv: 'skipped_by_field' })
        })

        it('keeps biomedical sources for biomedical queries even under a humanities field', () => {
            expect(planAcademicSources('sleep deprivation memory').run.pubmed).toBe(true)
            expect(planAcademicSources('euthanasia patients autonomy', { field: 'philosophy' }).run.europepmc).toBe(true)
            expect(planAcademicSources('placebo', { field: 'medicine' }).run.pubmed).toBe(true)
        })

        it('runs arXiv for STEM topics, including open-access-only, and skips it for books / non-English', () => {
            expect(planAcademicSources('large language model reasoning', { openAccessOnly: true }).run.arxiv).toBe(true)
            expect(planAcademicSources('formal epistemology bayesian', { field: 'philosophy' }).run.arxiv).toBe(true)
            expect(planAcademicSources('neural networks', { type: 'book' }).skipReason.arxiv).toBe('skipped_by_filter')
            expect(planAcademicSources('neural networks', { language: 'tr' }).skipReason.arxiv).toBe('skipped_by_filter')
        })

        it('does not call PubMed / Europe PMC / arXiv for a philosophy search', async () => {
            const { calls } = installFetch()
            const result = await searchAcademicCorpus('Marx alienation labour', { field: 'philosophy', env: {} })
            const keys = new Set(calls.map((c) => c.key))
            expect(keys.has('esearch')).toBe(false)
            expect(keys.has('epmc')).toBe(false)
            expect(keys.has('arxiv')).toBe(false)
            expect(result.fieldFilter).toContain('Philosophy')
        })

        it('applies year / OA / language filters to every source that supports them', async () => {
            const { calls } = installFetch()
            await searchAcademicCorpus('sleep deprivation neural computation', {
                env: {},
                yearFrom: 2015,
                yearTo: 2020,
                openAccessOnly: true,
                language: 'en',
            })
            const url = (k: string) => new URL(callFor(calls, k).url)
            expect(url('crossref').searchParams.get('filter')).toContain('from-pub-date:2015-01-01')
            expect(url('crossref').searchParams.get('filter')).toContain('until-pub-date:2020-12-31')
            expect(url('s2').searchParams.get('year')).toBe('2015-2020')
            expect(url('s2').searchParams.has('openAccessPdf')).toBe(true)
            expect(url('arxiv').searchParams.get('search_query')).toContain('submittedDate:[201501010000 TO 202012312359]')
            expect(url('esearch').searchParams.get('mindate')).toBe('2015')
            expect(url('esearch').searchParams.get('term')).toContain('open access[filter]')
            expect(url('epmc').searchParams.get('query')).toContain('PUB_YEAR:[2015 TO 2020]')
            expect(url('epmc').searchParams.get('query')).toContain('OPEN_ACCESS:y')
            expect(url('epmc').searchParams.get('query')).toContain('LANG:eng')
        })

        it('serializes arXiv calls module-wide with a minimum spacing', async () => {
            __resetAcademicSearchStateForTests(150)
            const { calls } = installFetch()
            await Promise.all([
                searchAcademicCorpus('quantum computation algorithms', { env: {} }),
                searchAcademicCorpus('neural network optimization theorem', { env: {} }),
                searchAcademicCorpus('bayesian statistics simulation', { env: {} }),
            ])
            const starts = calls.filter((c) => c.key === 'arxiv').map((c) => c.at)
            expect(starts).toHaveLength(3)
            for (let i = 1; i < starts.length; i++) expect(starts[i] - starts[i - 1]).toBeGreaterThanOrEqual(140)
        })
    })

    describe('data hygiene & links', () => {
        it('uses OpenAlex topics (not deprecated concepts)', async () => {
            installFetch({
                openalex: () =>
                    json({
                        results: [
                            {
                                id: 'https://openalex.org/W1',
                                title: 'Enframing and the Question of Technology',
                                publication_year: 2010,
                                topics: [{ display_name: 'Heideggerian Philosophy', subfield: { display_name: 'Philosophy' } }],
                                concepts: [{ display_name: 'Deprecated Concept' }],
                            },
                        ],
                    }),
            })
            const result = await searchAcademicCorpus('Heidegger enframing technology', { env: {} })
            expect(result.papers[0].topics).toEqual(['Heideggerian Philosophy', 'Philosophy'])
            expect(JSON.stringify(result.papers)).not.toContain('Deprecated Concept')
        })

        it('canon fallback does not fake citation counts', async () => {
            installFetch()
            const result = await searchAcademicCorpus('Spinoza substance attribute', { env: {} })
            if (result.papers.length === 0) return
            for (const p of result.papers) {
                expect(p.source).toBe('Philosophical Canon')
                expect(p.citationCount).toBe(0)
            }
            expect(formatAcademicPayloadForModel(result)).not.toContain('cites:')
        })

        it('resolves Unpaywall lookups in parallel (bounded), not serially', async () => {
            let inFlight = 0
            let maxInFlight = 0
            const items = Array.from({ length: 6 }, (_, i) => ({ DOI: `10.7777/par.${i}`, title: [`Aristotle virtue paper ${i}`] }))
            installFetch({
                crossref: () => json({ message: { items } }),
                unpaywall: async () => {
                    inFlight += 1
                    maxInFlight = Math.max(maxInFlight, inFlight)
                    await new Promise((r) => setTimeout(r, 30))
                    inFlight -= 1
                    return json({ is_oa: true, best_oa_location: { url_for_pdf: 'https://oa.example.org/x.pdf' } })
                },
            })
            const result = await searchAcademicCorpus('Aristotle virtue', { env: {}, limit: 6 })
            expect(maxInFlight).toBeGreaterThan(1)
            expect(maxInFlight).toBeLessThanOrEqual(4)
            expect(result.papers.every((p) => p.pdfUrl === 'https://oa.example.org/x.pdf')).toBe(true)
        })

        it('has no shadow-library links anywhere; keeps DOI, OA PDF and Google Scholar links', async () => {
            const p = paper({
                id: 'l1',
                title: 'Being and Time',
                authors: ['Martin Heidegger'],
                doi: 'https://doi.org/10.1000/bt',
                pdfUrl: 'https://oa.example.org/bt.pdf',
            })
            const md = formatAcademicResults([p])
            expect(md).toContain('https://doi.org/10.1000/bt')
            expect(md).toContain('https://oa.example.org/bt.pdf')
            expect(md).toContain('scholar.google.com')
            const payload = formatAcademicPayloadForModel({ ok: true, query: 'q', total: 1, papers: [p], formatted: md })
            for (const text of [md, payload]) {
                expect(text.toLowerCase()).not.toMatch(/sci-hub|scihub|annas-archive|anna's archive|libgen/)
            }
            installFetch({
                crossref: () => json({ message: { items: [{ DOI: '10.1000/bt', title: ['Being and Time'] }] } }),
            })
            const executed = await executeToolCall({
                id: 'links-1',
                name: 'search_academic_corpus',
                argumentsJson: JSON.stringify({ query: 'Being and Time Heidegger' }),
            })
            expect(JSON.stringify(executed).toLowerCase()).not.toMatch(/sci-hub|annas-archive|libgen/)
        })
    })
})
