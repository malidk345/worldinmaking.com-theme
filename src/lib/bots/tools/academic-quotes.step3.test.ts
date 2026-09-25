import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { executeToolCall } from './execute'
import type { HostSnapshot } from './host'
import { __resetAcademicSearchStateForTests } from '../academic-search'
import { __setAcademicCacheForTests, ACADEMIC_QUOTES_TTL_S } from '../academic-cache'
import { extractSupportingPassages, findGroundedQuotes, looksLikeProse, parseJatsParagraphs, QUOTE_MAX_CHARS } from '../academic-quotes'
import { buildAnnotatedBibliography, normalizeBibliographyEntries, ANNOTATION_MAX_CHARS } from '../academic-bibliography'
import type { AiCitation } from '../../ai/contracts'

type Handler = (url: string, init?: RequestInit) => Response | Promise<Response>
const json = (body: unknown, status = 200, headers?: Record<string, string>) => new Response(JSON.stringify(body), { status, headers })

const DOI = '10.3389/fspor.2025.1688670'
const PMCID = 'PMC1234567'
const JATS = `<?xml version="1.0"?><article><front><article-meta><title-group><article-title>Sport</article-title></title-group>
<abstract><p>This article reads sport through a posthuman lens and asks what animality means today.</p></abstract></article-meta></front>
<body><sec><label>1</label><title>Introduction</title><p>Heidegger argued that modern technology reveals nature as a standing reserve. In <italic>sport</italic>, technology increasingly shapes how athletes train and compete.</p></sec>
<sec><label>2</label><title>Discussion</title><p>The subject that tames is not sport but technology. This reversal matters for the ethics of training.</p>
<table-wrap><caption><p>Table 1 technology sport technology sport metrics listed here for testing only</p></caption></table-wrap></sec></body></article>`

const PDF_TEXT = [
    'Heidegger claims that the essence of technology is by no means anything technological.',
    'This essay follows that claim into the design of everyday tools and machines.',
]
const PDF = `%PDF-1.4\n1 0 obj\n<< /Type /Page >>\nstream\n${PDF_TEXT.map((t) => `BT\n/F1 12 Tf\n(${t}) Tj\nET`).join('\n')}\nendstream\nendobj\n%%EOF`

function hostKey(url: string): string {
    if (url.includes('europepmc/webservices/rest/search')) return 'epmcSearch'
    if (url.includes('/fullTextXML')) return 'epmcXml'
    if (url.includes('api.core.ac.uk')) return 'core'
    if (url.includes('semanticscholar.org') && url.includes('/snippet/search')) return 's2Snippets'
    if (url.includes('semanticscholar.org')) return 's2'
    if (/api\.crossref\.org\/works\/10\./.test(url)) return 'crWork'
    if (url.includes('api.unpaywall.org')) return 'unpaywall'
    if (url.includes('cloudflare-dns.com')) return 'doh'
    if (url.includes('files.example.org')) return 'pdf'
    return 'other'
}

const DEFAULTS: Record<string, Handler> = {
    epmcSearch: () =>
        json({
            resultList: {
                result: [{ pmcid: PMCID, isOpenAccess: 'Y', title: 'Rediscovery of animality in the concept of sport.', authorString: 'Sakamoto K, Lee J.', pubYear: '2025', journalTitle: 'Front Sports Act Living' }],
            },
        }),
    epmcXml: () => new Response(JATS, { status: 200, headers: { 'content-type': 'application/xml' } }),
    core: () => json({ message: 'rate limited' }, 429),
    s2Snippets: () => json({ message: 'Too Many Requests' }, 429),
    s2: () => json({ message: 'Too Many Requests' }, 429),
    crWork: (url) => {
        const doi = decodeURIComponent(url.split('/works/')[1].split('?')[0])
        return json({ message: { DOI: doi, title: ['Rediscovery of animality in the concept of sport'], author: [{ given: 'Kenji', family: 'Sakamoto' }], issued: { 'date-parts': [[2025]] }, 'container-title': ['Frontiers in Sports'] } })
    },
    unpaywall: () => json({ is_oa: false }),
    doh: () => json({ Status: 0, Answer: [{ type: 1, data: '93.184.216.34' }] }),
    pdf: () => new Response(PDF, { status: 200, headers: { 'content-type': 'application/pdf' } }),
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
const status = (res: { sources: Array<{ source: string }> }, id: string) => res.sources.find((s) => s.source === id)

describe('find_quotes (grounded verbatim passages)', () => {
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

    it('without a paper and without SEMANTIC_SCHOLAR_API_KEY: fails honestly, no network', async () => {
        const { calls } = installFetch()
        const res = await findGroundedQuotes(undefined, 'technology enframing', { env: {} })
        expect(res.ok).toBe(false)
        expect(res.missingKeys).toEqual(['SEMANTIC_SCHOLAR_API_KEY'])
        expect(res.error).toMatch(/SEMANTIC_SCHOLAR_API_KEY/)
        expect(calls).toHaveLength(0)
    })

    it('keyless with a DOI: Europe PMC JATS quotes with section, S2 skipped (missing_key), CORE 429 reported', async () => {
        const { calls } = installFetch()
        const res = await findGroundedQuotes({ raw: DOI, doi: DOI }, 'sport technology', { env: {}, noCache: true })
        expect(res.ok).toBe(true)
        expect(status(res, 's2_snippets')).toMatchObject({ status: 'skipped', reason: 'missing_key' })
        expect(status(res, 'core')).toMatchObject({ status: 'failed', reason: 'rate_limited', httpStatus: 429 })
        expect(status(res, 'europepmc')).toMatchObject({ status: 'ok' })
        expect(status(res, 'oa_pdf')).toMatchObject({ status: 'skipped' })
        expect(res.missingKeys).toEqual(['SEMANTIC_SCHOLAR_API_KEY'])
        expect(res.quotes.length).toBeGreaterThan(0)
        expect(res.quotes.length).toBeLessThanOrEqual(3)
        const body = parseJatsParagraphs(JATS).map((p) => p.text).join(' ')
        for (const q of res.quotes) {
            expect(q.text.length).toBeLessThanOrEqual(QUOTE_MAX_CHARS)
            expect(body).toContain(q.text.replace(/^…|…$/g, ''))
            expect(q.location).toMatch(/Europe PMC full text, section "(Introduction|Discussion)"/)
            expect(q.text).not.toMatch(/Table 1/)
        }
        expect(res.quotes.map((q) => q.text)).toContain('The subject that tames is not sport but technology.')
        expect(calls.some((c) => header(c.init, 'x-api-key'))).toBe(false)
        expect(calls.some((c) => c.key === 'pdf')).toBe(false)

        // Through the tool: a new paper becomes [P1] and its card shows the first verbatim passage.
        const exec = await executeToolCall({ id: 'q1', name: 'find_quotes', argumentsJson: JSON.stringify({ paper: DOI, claim: 'sport technology', max_quotes: 2 }) }, {}, undefined, 'ask')
        expect(exec.ok).toBe(true)
        expect(exec.result).toMatch(/^GROUNDED QUOTES — claim: "sport technology" — paper: \[P1\]/)
        expect(exec.result).toMatch(/^Q1 \[P1\] "/m)
        expect(exec.result).toMatch(/s2_snippets skipped\(missing_key\)/)
        expect(exec.citations).toHaveLength(1)
        expect(exec.citations?.[0].doi).toBe(DOI)
        expect(exec.citations?.[0].snippet).toMatch(/^“/)
    })

    it('a paper already cited this turn keeps its id ([P@n]) and emits no new card', async () => {
        installFetch()
        const turn: AiCitation[] = [
            { id: 4, title: 'Rediscovery of animality in the concept of sport', url: `https://doi.org/${DOI}`, snippet: 'abs', kind: 'paper', doi: DOI },
        ]
        const exec = await executeToolCall({ id: 'q1', name: 'find_quotes', argumentsJson: JSON.stringify({ paper: '[P4]', claim: 'sport technology' }) }, {}, undefined, 'ask', undefined, { citations: turn })
        expect(exec.ok).toBe(true)
        expect(exec.result).toMatch(/paper: \[P@4\]/)
        expect(exec.result).toMatch(/^Q1 \[P@4\] "/m)
        expect(exec.citations).toBeUndefined()
    })

    it('with SEMANTIC_SCHOLAR_API_KEY: snippet search sends x-api-key and returns attributed snippets', async () => {
        const { calls } = installFetch({
            s2Snippets: () =>
                json({
                    data: [
                        {
                            snippet: { text: 'Gestell names the way modern technology challenges forth nature as a calculable standing reserve.', snippetKind: 'body', section: 'Enframing' },
                            paper: { corpusId: 424242, title: 'Enframing and the standing reserve', authors: [{ name: 'Ann Author' }] },
                        },
                        { snippet: { text: 'x y z', snippetKind: 'body' }, paper: { corpusId: 1, title: 'Noise' } },
                    ],
                }),
        })
        const res = await findGroundedQuotes(undefined, 'modern technology standing reserve', { env: { SEMANTIC_SCHOLAR_API_KEY: 's2-test-key' }, noCache: true })
        expect(res.ok).toBe(true)
        expect(res.missingKeys).toBeUndefined()
        const snippetCall = calls.find((c) => c.key === 's2Snippets')
        expect(header(snippetCall?.init, 'x-api-key')).toBe('s2-test-key')
        expect(res.quotes).toHaveLength(1)
        expect(res.quotes[0]).toMatchObject({ source: 's2_snippets', location: 'Semantic Scholar snippet, section "Enframing"' })
        expect(res.quotes[0].paper?.title).toBe('Enframing and the standing reserve')

        const withPaper = await findGroundedQuotes({ raw: DOI, doi: DOI }, 'modern technology standing reserve', { env: { SEMANTIC_SCHOLAR_API_KEY: 's2-test-key' }, noCache: true })
        expect(withPaper.ok).toBe(true)
        const scoped = calls.filter((c) => c.key === 's2Snippets').at(-1)
        expect(new URL(scoped?.url || 'https://x').searchParams.get('paperIds')).toBe(`DOI:${DOI}`)
    })

    it('S2 snippet 429 with a key is reported as a failed source, not hidden', async () => {
        installFetch({ epmcSearch: () => json({ resultList: { result: [] } }), core: () => json({ results: [] }) })
        const res = await findGroundedQuotes({ raw: DOI, doi: DOI }, 'sport technology', { env: { SEMANTIC_SCHOLAR_API_KEY: 'k' }, noCache: true })
        expect(status(res, 's2_snippets')).toMatchObject({ status: 'failed', reason: 'rate_limited', keyed: true })
    })

    it('falls back to the open-access PDF through read_document with an approximate page label', async () => {
        const { calls } = installFetch({
            epmcSearch: () => json({ resultList: { result: [] } }),
            core: () => json({ results: [] }),
            unpaywall: () => json({ is_oa: true, best_oa_location: { url_for_pdf: 'https://files.example.org/heidegger.pdf' } }),
        })
        const res = await findGroundedQuotes({ raw: DOI, doi: DOI }, 'essence of technology', { env: {}, noCache: true })
        expect(res.ok).toBe(true)
        expect(calls.some((c) => c.key === 'pdf')).toBe(true)
        expect(status(res, 'europepmc')).toMatchObject({ status: 'skipped', reason: 'no_fulltext', note: 'not in Europe PMC' })
        expect(status(res, 'core')).toMatchObject({ status: 'skipped', note: 'not in CORE' })
        expect(res.quotes[0]).toMatchObject({ source: 'oa_pdf', location: 'open-access PDF, text block 1 (approximate page)' })
        expect(PDF_TEXT.join(' ')).toContain(res.quotes[0].text)
    })

    it('garbage PDF text yields no quotes and tells the model not to quote', async () => {
        const junk = `%PDF-1.5\n${'x\u0001\u0002ÿþ'.repeat(200)}\n%%EOF`
        installFetch({
            epmcSearch: () => json({ resultList: { result: [] } }),
            core: () => json({ results: [] }),
            pdf: () => new Response(junk, { status: 200, headers: { 'content-type': 'application/pdf' } }),
        })
        const res = await findGroundedQuotes({ raw: DOI, doi: DOI, pdfUrl: 'https://files.example.org/scan.pdf' }, 'essence of technology', { env: {}, noCache: true })
        expect(res.quotes).toHaveLength(0)
        expect(res.notice || res.error).toMatch(/Do not quote/)
    })

    it('no open full text anywhere → honest notice, no quotes', async () => {
        installFetch({ epmcSearch: () => json({ resultList: { result: [] } }), core: () => json({ results: [] }) })
        const res = await findGroundedQuotes({ raw: DOI, doi: DOI }, 'essence of technology', { env: {}, noCache: true })
        expect(res.ok).toBe(true)
        expect(res.quotes).toHaveLength(0)
        expect(status(res, 'oa_pdf')).toMatchObject({ status: 'skipped', reason: 'no_fulltext' })
        expect(res.notice).toMatch(/No open full text was reachable/)
    })

    it('caches successful quote lookups for 7 days', async () => {
        const puts: string[] = []
        const store = new Map<string, Response>()
        __setAcademicCacheForTests({
            async match(req) {
                const r = store.get(String(typeof req === 'string' ? req : req.url))
                return r?.clone()
            },
            async put(req, res) {
                const url = String(typeof req === 'string' ? req : req.url)
                if (url.includes('/quotes/')) puts.push(res.headers.get('Cache-Control') || '')
                store.set(url, res)
            },
        })
        installFetch({ core: () => json({ results: [] }) })
        const first = await findGroundedQuotes({ raw: DOI, doi: DOI }, 'sport technology', { env: {} })
        expect(first.quotes.length).toBeGreaterThan(0)
        expect(puts).toEqual([`public, max-age=${ACADEMIC_QUOTES_TTL_S}`])
        const { calls } = installFetch()
        const second = await findGroundedQuotes({ raw: DOI, doi: DOI }, 'sport technology', { env: {} })
        expect(second.quotes).toEqual(first.quotes)
        expect(calls.filter((c) => c.key === 'epmcXml')).toHaveLength(0)
    })
})

describe('quote extraction helpers', () => {
    it('returns verbatim, capped passages and never invents text', () => {
        const long = `${'Background sentence without the terms. '.repeat(3)}Technology, Heidegger writes, is a way of revealing, and ${'the revealing that rules throughout modern technology has the character of a setting-upon, '.repeat(4)}which he calls enframing. Unrelated closing line here.`
        const out = extractSupportingPassages(long, 'Heidegger technology revealing enframing')
        expect(out.length).toBeGreaterThan(0)
        const norm = long.replace(/\s+/g, ' ')
        for (const q of out) {
            expect(q.text.length).toBeLessThanOrEqual(QUOTE_MAX_CHARS)
            expect(norm).toContain(q.text.replace(/^…|…$/g, ''))
        }
        expect(extractSupportingPassages(long, 'quantum chromodynamics lattice')).toEqual([])
    })
    it('matches Turkish text with folded (diacritic-insensitive) terms', () => {
        const tr = 'Giriş bölümü kısa tutulmuştur. Heidegger’e göre teknolojinin özü teknolojik bir şey değildir ve bu öz çerçeveleme olarak adlandırılır. Son cümle.'
        const out = extractSupportingPassages(tr, 'teknolojinin özü çerçeveleme')
        expect(out[0]?.text).toBe('Heidegger’e göre teknolojinin özü teknolojik bir şey değildir ve bu öz çerçeveleme olarak adlandırılır.')
    })
    it('rejects extractor garbage and parses JATS sections', () => {
        expect(looksLikeProse('ÿþ\u0001 a b c d e f g h')).toBe(false)
        expect(looksLikeProse('A B C D E F G H I J K L M N O P Q R S T U V W')).toBe(false)
        expect(looksLikeProse('This is an ordinary sentence of academic prose about technology.')).toBe(true)
        const paras = parseJatsParagraphs(JATS)
        expect(paras.map((p) => p.section)).toEqual(['Abstract', 'Introduction', 'Discussion'])
        expect(paras.some((p) => p.text.includes('Table 1'))).toBe(false)
    })
})

describe('annotated_bibliography (literature-review mode)', () => {
    const originalFetch = globalThis.fetch
    const turn: AiCitation[] = [
        { id: 1, title: 'The question concerning technology', url: 'https://doi.org/10.1234/qct', snippet: '', kind: 'paper', doi: '10.1234/qct', authors: ['Martin Heidegger'], year: 1977, venue: 'Harper & Row' },
        { id: 2, title: 'A web page', url: 'https://example.com', snippet: '', kind: 'web' },
    ]
    const host: HostSnapshot = { notebookId: 'nb-1', notebookTitle: 'Thesis notes', notebooks: [{ id: 'nb-1', title: 'Thesis notes', content: 'Draft.' }] }
    beforeEach(() => {
        vi.spyOn(console, 'info').mockImplementation(() => undefined)
        __resetAcademicSearchStateForTests(0, 0)
        __setAcademicCacheForTests(null)
        installFetch({
            crWork: (url) => {
                const doi = decodeURIComponent(url.split('/works/')[1].split('?')[0])
                if (doi === '10.9999/missing') return json({ status: 'error' }, 404)
                return DEFAULTS.crWork(url)
            },
        })
    })
    afterEach(() => {
        globalThis.fetch = originalFetch
        __setAcademicCacheForTests(undefined)
        vi.restoreAllMocks()
    })

    it('builds alphabetical APA entries from real metadata and rejects anything unverifiable', async () => {
        const entries = normalizeBibliographyEntries([
            { paper: 'P1', annotation: 'Classic essay on enframing. '.repeat(40) },
            { ref: DOI, note: 'Applies the argument to sport.' },
            { paper: '[P9]', annotation: 'Unknown id' },
            { paper: '[P2]', annotation: 'Web page' },
            { paper: 'Being and Time', annotation: 'No id' },
            { paper: '10.9999/missing', annotation: 'Bad DOI' },
        ])
        const res = await buildAnnotatedBibliography(entries, turn, { title: 'Heidegger and technology', env: {} })
        expect(res.ok).toBe(true)
        expect(res.entries.map((e) => e.paper)).toEqual(['P1', DOI])
        expect(res.rejected.map((r) => r.paper).sort()).toEqual(['10.9999/missing', 'Being and Time', '[P2]', '[P9]'].sort())
        expect(res.markdown.startsWith('## Annotated bibliography: Heidegger and technology')).toBe(true)
        expect(res.markdown.indexOf('Heidegger, M.')).toBeLessThan(res.markdown.indexOf('Sakamoto, K.'))
        const annotation = res.markdown.split('\n').find((l) => l.startsWith('Classic essay')) || ''
        expect(annotation.length).toBeLessThanOrEqual(ANNOTATION_MAX_CHARS)
        expect(res.entries[0].citationId).toBe(1)
    })

    it('adds the bibliography to the bound notebook through the existing insert_notebook_block action', async () => {
        const exec = await executeToolCall(
            { id: 'b1', name: 'annotated_bibliography', argumentsJson: JSON.stringify({ title: 'Heidegger', entries: [{ paper: 'P1', annotation: 'Classic.' }], add_to_notebook: true }) },
            {},
            host,
            'ask',
            undefined,
            { citations: turn }
        )
        expect(exec.ok).toBe(true)
        expect(exec.action?.type).toBe('insert_notebook_block')
        expect(String(exec.action?.payload.content)).toMatch(/^## Annotated bibliography: Heidegger/)
        expect(JSON.parse(exec.result)).toMatchObject({ added_to_notebook: true, entries: 1 })
    })

    it('without a notebook returns the markdown plus a notebook_error; plan mode blocks it', async () => {
        const exec = await executeToolCall(
            { id: 'b1', name: 'annotated_bibliography', argumentsJson: JSON.stringify({ entries: [{ paper: 'P1', annotation: 'Classic.' }], add_to_notebook: true }) },
            {},
            undefined,
            'ask',
            undefined,
            { citations: turn }
        )
        expect(exec.ok).toBe(true)
        expect(exec.action).toBeUndefined()
        const body = JSON.parse(exec.result)
        expect(body.added_to_notebook).toBe(false)
        expect(body.notebook_error).toMatch(/No notebook is bound/)
        expect(body.markdown).toMatch(/Heidegger, M\./)

        const planned = await executeToolCall({ id: 'b2', name: 'annotated_bibliography', argumentsJson: JSON.stringify({ entries: ['P1'] }) }, {}, host, 'plan', undefined, { citations: turn })
        expect(planned.ok).toBe(false)

        const none = await executeToolCall({ id: 'b3', name: 'annotated_bibliography', argumentsJson: JSON.stringify({ entries: [{ paper: 'Being and Time' }] }) }, {}, host, 'ask', undefined, { citations: turn })
        expect(none.ok).toBe(false)
        expect(JSON.parse(none.result).error).toMatch(/none of the entries/)
    })
})
