/**
 * Extra keyless scholarly sources for academic search (step 2):
 *   - TR Dizin (Turkish national citation index; Turkish-language literature)
 *   - CORE v3 (open-access aggregator; keyless quota ≈ 5 single requests / 10 s → serialized)
 *   - DOAJ articles (open-access journals; ≤ 2 requests / s → serialized)
 *   - OpenAIRE Graph v3 (European publications; keyless)
 *   - Zenodo records (open files, theses, preprints; keyless, ~30 searches / min)
 *
 * Every function returns AcademicPaper[] or throws AcademicSourceError so the
 * orchestrator can report per-source status.
 */

import type { AcademicPaper, AcademicSourceContext } from './academic-search'
import {
    AcademicSourceError,
    clipText,
    createSerialQueue,
    doiUrl,
    fetchAcademic,
    isPdfLike,
    readJson,
    stripTags,
    userAgent,
} from './academic-common'

const EXTRA_TIMEOUT_MS = 10_000
const ABSTRACT_KEEP_CHARS = 600

export const coreQueue = createSerialQueue(2_000)
export const doajQueue = createSerialQueue(500)
/** Zenodo allows about 30 anonymous searches a minute. */
export const zenodoQueue = createSerialQueue(2_000)
export const openaireQueue = createSerialQueue(1_000)

const LANG3_TO_2: Record<string, string> = {
    TUR: 'tr', ENG: 'en', GER: 'de', DEU: 'de', FRE: 'fr', FRA: 'fr', SPA: 'es', ITA: 'it', RUS: 'ru', ARA: 'ar', PER: 'fa', FAS: 'fa',
}

function lang2(value?: string | null): string | undefined {
    const raw = String(value || '').trim()
    if (!raw) return undefined
    if (/^[a-z]{2}$/i.test(raw)) return raw.toLowerCase()
    return LANG3_TO_2[raw.toUpperCase()]
}

// Built via RegExp(): the repo's TS target rejects the `u` literal flag.
const WORD_START_RE = new RegExp('(^|[\\s(“"\'‘’:—–/-])(\\p{L})', 'gu')
const UPPER_LETTER_RE = new RegExp('\\p{Lu}', 'u')
const LETTER_RE = new RegExp('\\p{L}', 'u')

const ROMAN_RE = /^[IVXLC]+\.?$/
const TR_MINOR = new Set(['ve', 'ile', 'veya', 'ya', 'da', 'de', 'ki'])
const EN_MINOR = new Set(['and', 'or', 'of', 'the', 'in', 'on', 'for', 'a', 'an', 'to', 'at', 'by', 'from', 'with', 'as'])
const TR_TITLE_HINT_RE = /[ÇĞİÖŞÜçğıöşü]|\b(VE|İLE|BİR|ÜZERİNE|ÜZERİNDEN|AÇISINDAN|BAĞLAMINDA)\b/

/**
 * "OSMANLI İMPARATORLUĞU" → "Osmanlı İmparatorluğu"; mixed-case text is left alone.
 * Turkish casing rules (İ/ı) only apply to Turkish-looking titles so English
 * all-caps titles don't become "Alıenatıon". Roman numerals stay upper-case,
 * letters after an apostrophe (Turkish suffixes: "MARX'IN" → "Marx'ın") and
 * minor words (ve/ile, and/of…) stay lower-case.
 */
export function prettifyCaps(text: string, language?: string): string {
    const clean = String(text || '').replace(/\s+/g, ' ').trim()
    const letters = clean.replace(/[^A-Za-zÇĞİÖŞÜçğıöşü]/g, '')
    if (letters.length < 4) return clean
    const upper = clean.replace(/[^A-ZÇĞİÖŞÜ]/g, '').length
    if (upper / letters.length < 0.8) return clean
    const turkish = language ? language === 'tr' : TR_TITLE_HINT_RE.test(clean)
    const locale = turkish ? 'tr' : 'en'
    const minor = turkish ? TR_MINOR : EN_MINOR
    return clean
        .split(' ')
        .map((word, index) => {
            if (ROMAN_RE.test(word) && word.length > 1) return word
            const lower = word.toLocaleLowerCase(locale)
            if (index > 0 && minor.has(lower)) return lower
            return lower.replace(WORD_START_RE, (_m, pre: string, ch: string, offset: number, all: string) =>
                // Apostrophe after a letter = suffix ("marx'ın"), not an opening quote.
                (pre === "'" || pre === '’') && offset > 0 && LETTER_RE.test(all[offset - 1])
                    ? `${pre}${ch}`
                    : `${pre}${ch.toLocaleUpperCase(locale)}`
            )
        })
        .join(' ')
}

/** Only uppercase words (surnames like "YILDIRIM") are recased. */
function prettifyName(name: string): string {
    return String(name || '')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .map((w) => (w.length > 1 && w === w.toLocaleUpperCase('tr') && UPPER_LETTER_RE.test(w) ? prettifyCaps(w, 'tr') : w))
        .join(' ')
}

// ---------------------------------------------------------------------------
// TR Dizin
// ---------------------------------------------------------------------------

export function buildTrDizinUrl(query: string, limit: number): string {
    const params = new URLSearchParams()
    params.set('q', query.replace(/\s+/g, ' ').trim())
    params.set('order', 'relevance-DESC')
    params.set('page', '1')
    params.set('limit', String(Math.max(1, Math.min(limit, 20))))
    return `https://search.trdizin.gov.tr/api/defaultSearch/publication/?${params.toString()}`
}

type TrDizinSource = {
    id?: number | string
    orderTitle?: string
    abstracts?: Array<{ title?: string; abstract?: string; language?: string; keywords?: unknown }> | null
    authors?: Array<{ inPublicationName?: string; duty?: string }> | null
    publicationYear?: number | string
    journal?: { name?: string } | null
    orderCitationCount?: number
    doi?: string | null
    language?: string
    accessType?: string
    docType?: string
    publicationType?: string
    subjects?: Array<{ name?: string }> | null
}

export async function queryTrDizin(ctx: AcademicSourceContext, text: string): Promise<AcademicPaper[]> {
    const res = await fetchAcademic(
        buildTrDizinUrl(text, ctx.limit),
        { headers: { 'User-Agent': userAgent(ctx.keys.contactEmail), Accept: 'application/json' } },
        EXTRA_TIMEOUT_MS,
        ctx.signal,
        { cooldownKey: 'trdizin' }
    )
    const data = await readJson<{ hits?: { hits?: Array<{ _id?: string; _source?: TrDizinSource }> } }>(res)
    const hits = data?.hits?.hits
    if (!Array.isArray(hits)) throw new AcademicSourceError('parse_error')
    const out: AcademicPaper[] = []
    for (const hit of hits) {
        const s = hit?._source
        if (!s || (s.docType && s.docType !== 'PAPER')) continue
        const id = String(s.id ?? hit._id ?? '')
        if (!id) continue
        const abstracts = Array.isArray(s.abstracts) ? s.abstracts : []
        const preferred = abstracts.find((a) => a.language && a.language === s.language) || abstracts[0]
        const titleLang = lang2(preferred?.language) || lang2(s.language)
        const title = prettifyCaps(preferred?.title || s.orderTitle || '', titleLang)
        if (!title) continue
        const authors = (s.authors || [])
            .filter((a) => !a.duty || a.duty === 'AUTHOR')
            .map((a) => prettifyName(a.inPublicationName || ''))
            .filter(Boolean)
            .slice(0, 4)
        const year = Number(s.publicationYear)
        const topics = (s.subjects || []).map((x) => String(x?.name || '').trim()).filter(Boolean).slice(0, 4)
        out.push({
            id: `trdizin-${id}`,
            title,
            authors,
            year: Number.isInteger(year) && year > 1000 ? year : undefined,
            venue: s.journal?.name?.trim() || undefined,
            citationCount: typeof s.orderCitationCount === 'number' ? s.orderCitationCount : 0,
            doi: doiUrl(s.doi || undefined),
            url: `https://search.trdizin.gov.tr/tr/yayin/detay/${encodeURIComponent(id)}`,
            abstract: clipText(stripTags(preferred?.abstract || ''), ABSTRACT_KEEP_CHARS),
            topics: topics.length ? topics : undefined,
            language: lang2(s.language),
            type: 'article',
            isOpenAccess: s.accessType === 'OPEN' ? true : undefined,
            source: 'TR Dizin',
        })
        if (out.length >= ctx.limit) break
    }
    return out
}

// ---------------------------------------------------------------------------
// CORE v3
// ---------------------------------------------------------------------------

export function buildCoreUrl(query: string, limit: number): string {
    const params = new URLSearchParams()
    params.set('q', query.replace(/\s+/g, ' ').trim())
    params.set('limit', String(Math.max(1, Math.min(limit, 10))))
    // Trailing slash matters: /search/works → 301 (costs a request from the quota).
    return `https://api.core.ac.uk/v3/search/works/?${params.toString()}`
}

type CoreWork = {
    id?: number | string
    title?: string
    authors?: Array<{ name?: string }>
    yearPublished?: number
    journals?: Array<{ title?: string }>
    publisher?: string
    citationCount?: number
    doi?: string | null
    downloadUrl?: string
    links?: Array<{ type?: string; url?: string }>
    abstract?: string | null
    language?: { code?: string } | null
    documentType?: string | null
}

export async function queryCore(ctx: AcademicSourceContext, text: string, maxWaitMs = 4_000): Promise<AcademicPaper[]> {
    return coreQueue.run(
        async () => {
            const res = await fetchAcademic(
                buildCoreUrl(text, ctx.limit),
                { headers: { 'User-Agent': userAgent(ctx.keys.contactEmail), Accept: 'application/json' } },
                EXTRA_TIMEOUT_MS,
                ctx.signal,
                { cooldownKey: 'core', noRetry: true }
            )
            const data = await readJson<{ results?: CoreWork[] }>(res)
            if (!data || !Array.isArray(data.results)) throw new AcademicSourceError('parse_error')
            return data.results.slice(0, ctx.limit).flatMap((w): AcademicPaper[] => {
                const title = stripTags(String(w.title || ''))
                if (!title) return []
                const display = (w.links || []).find((l) => l.type === 'display')?.url
                const download = typeof w.downloadUrl === 'string' && w.downloadUrl.startsWith('http') ? w.downloadUrl : undefined
                return [
                    {
                        id: `core-${w.id ?? title.slice(0, 40)}`,
                        title,
                        authors: (w.authors || [])
                            .map((a) => prettifyName(a?.name || ''))
                            .filter(Boolean)
                            .slice(0, 4),
                        year: typeof w.yearPublished === 'number' && w.yearPublished > 1000 ? w.yearPublished : undefined,
                        venue: w.journals?.[0]?.title?.trim() || w.publisher?.trim() || undefined,
                        citationCount: typeof w.citationCount === 'number' ? w.citationCount : 0,
                        doi: doiUrl(w.doi || undefined),
                        pdfUrl: download,
                        url: display || (w.id ? `https://core.ac.uk/works/${w.id}` : undefined),
                        abstract: clipText(stripTags(w.abstract || ''), ABSTRACT_KEEP_CHARS),
                        language: lang2(w.language?.code),
                        type: w.documentType || undefined,
                        isOpenAccess: download ? true : undefined,
                        source: 'CORE',
                    },
                ]
            })
        },
        maxWaitMs,
        ctx.signal
    )
}

// ---------------------------------------------------------------------------
// DOAJ
// ---------------------------------------------------------------------------

/** DOAJ search uses Elasticsearch query-string syntax in the path; strip operators. */
export function buildDoajUrl(query: string, limit: number): string {
    const safe = query
        .replace(/[+\-&|!(){}[\]^"~*?:\\/<>=]/g, ' ')
        .replace(/\b(AND|OR|NOT)\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    return `https://doaj.org/api/search/articles/${encodeURIComponent(safe)}?page=1&pageSize=${Math.max(1, Math.min(limit, 10))}`
}

type DoajArticle = {
    id?: string
    bibjson?: {
        title?: string
        author?: Array<{ name?: string }>
        year?: string | number
        journal?: { title?: string; language?: string[] }
        identifier?: Array<{ id?: string; type?: string }>
        link?: Array<{ type?: string; url?: string; content_type?: string }>
        abstract?: string
        keywords?: string[]
    }
}

export async function queryDoaj(ctx: AcademicSourceContext, text: string, maxWaitMs = 3_000): Promise<AcademicPaper[]> {
    return doajQueue.run(
        async () => {
            const res = await fetchAcademic(
                buildDoajUrl(text, ctx.limit),
                { headers: { 'User-Agent': userAgent(ctx.keys.contactEmail), Accept: 'application/json' } },
                EXTRA_TIMEOUT_MS,
                ctx.signal,
                { cooldownKey: 'doaj' }
            )
            const data = await readJson<{ results?: DoajArticle[] }>(res)
            if (!data || !Array.isArray(data.results)) throw new AcademicSourceError('parse_error')
            return data.results.slice(0, ctx.limit).flatMap((a): AcademicPaper[] => {
                const b = a.bibjson
                const title = stripTags(b?.title || '')
                if (!b || !title) return []
                const doi = (b.identifier || []).find((x) => String(x.type || '').toLowerCase() === 'doi')?.id
                const full = (b.link || []).find((l) => l.type === 'fulltext' && l.url?.startsWith('http'))
                const fullUrl = full?.url
                const isPdf = Boolean(fullUrl && (String(full?.content_type || '').toLowerCase() === 'pdf' || isPdfLike(fullUrl)))
                const year = Number(b.year)
                const languages = b.journal?.language || []
                return [
                    {
                        id: `doaj-${a.id || title.slice(0, 40)}`,
                        title,
                        authors: (b.author || [])
                            .map((x) => prettifyName(x?.name || ''))
                            .filter(Boolean)
                            .slice(0, 4),
                        year: Number.isInteger(year) && year > 1000 ? year : undefined,
                        venue: b.journal?.title?.trim() || undefined,
                        citationCount: 0,
                        doi: doiUrl(doi),
                        pdfUrl: fullUrl,
                        url: isPdf ? undefined : fullUrl,
                        abstract: clipText(stripTags(b.abstract || ''), ABSTRACT_KEEP_CHARS),
                        topics: b.keywords?.length ? b.keywords.slice(0, 4) : undefined,
                        // Journal languages are a hint only; single-language journals are reliable.
                        language: languages.length === 1 ? lang2(languages[0]) : undefined,
                        type: 'article',
                        isOpenAccess: true,
                        source: 'DOAJ',
                    },
                ]
            })
        },
        maxWaitMs,
        ctx.signal
    )
}

// ---------------------------------------------------------------------------
// Zenodo (open files, theses, preprints) and OpenAIRE Graph (European literature)
// Both are keyless. Duplicate DOIs merge with OpenAlex / Crossref later.
// ---------------------------------------------------------------------------

const OA_LANG: Record<string, string> = {
    eng: 'en', en: 'en', deu: 'de', ger: 'de', fra: 'fr', fre: 'fr', spa: 'es', ita: 'it',
    por: 'pt', tur: 'tr', rus: 'ru', ell: 'el', nld: 'nl', pol: 'pl', swe: 'sv',
}

function yearOf(value: unknown): number | undefined {
    const year = Number(String(value || '').slice(0, 4))
    return Number.isInteger(year) && year > 1000 && year < 3000 ? year : undefined
}

function oaLanguage(code: unknown): string | undefined {
    const first = String(code || '').split('/')[0].trim().toLowerCase()
    if (!first) return undefined
    if (first.length === 2) return first
    return OA_LANG[first]
}

function workTypeFromLabel(raw: unknown): string | undefined {
    const text = String(raw || '').toLowerCase()
    if (!text) return undefined
    if (text.includes('thesis') || text.includes('dissertation')) return 'dissertation'
    if (text.includes('chapter') || text.includes('section')) return 'book-chapter'
    if (text.includes('preprint') || text.includes('working')) return 'preprint'
    if (text.includes('review')) return 'review'
    if (text.includes('book')) return 'book'
    if (text.includes('article')) return 'article'
    return undefined
}

type ZenodoHit = {
    id?: number | string
    doi?: string
    metadata?: {
        title?: string
        doi?: string
        publication_date?: string
        description?: string
        access_right?: string
        resource_type?: { type?: string; subtype?: string }
        creators?: Array<{ name?: string; person_or_org?: { name?: string } }>
        journal?: { title?: string }
    }
    files?: Array<{ key?: string; links?: { self?: string } }>
    links?: { self_html?: string }
}

function buildZenodoUrl(text: string, ctx: AcademicSourceContext): string {
    const safe = text.replace(/["\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 180)
    const from = ctx.options.yearFrom || ''
    const to = ctx.options.yearTo || ''
    const dated = from || to ? ` AND metadata.publication_date:[${from || 1000} TO ${to || 3000}]` : ''
    const params = new URLSearchParams()
    params.set('q', `metadata.title:(${safe}) AND resource_type.type:publication${dated}`)
    params.set('size', String(Math.min(ctx.limit, 5)))
    params.set('sort', ctx.options.sortBy === 'recent' ? 'mostrecent' : 'bestmatch')
    params.set('type', 'publication')
    return `https://zenodo.org/api/records?${params.toString()}`
}

export async function queryZenodo(ctx: AcademicSourceContext, text: string, maxWaitMs = 3_000): Promise<AcademicPaper[]> {
    return zenodoQueue.run(
        async () => {
            const res = await fetchAcademic(
                buildZenodoUrl(text, ctx),
                { headers: { 'User-Agent': userAgent(ctx.keys.contactEmail), Accept: 'application/json' } },
                EXTRA_TIMEOUT_MS,
                ctx.signal,
                { cooldownKey: 'zenodo' }
            )
            const data = await readJson<{ hits?: { hits?: ZenodoHit[] } }>(res)
            const hits = data?.hits?.hits
            if (!Array.isArray(hits)) throw new AcademicSourceError('parse_error')
            return hits.slice(0, ctx.limit).flatMap((hit): AcademicPaper[] => {
                const meta = hit.metadata
                const title = stripTags(meta?.title || '')
                if (!title) return []
                const doi = doiUrl(meta?.doi || hit.doi)
                const file = (hit.files || []).find((item) => /\.pdf$/i.test(item.key || '') || isPdfLike(item.links?.self || ''))
                const pdfUrl = file?.links?.self
                const page = hit.links?.self_html
                return [
                    {
                        id: `zenodo-${hit.id || title.slice(0, 40)}`,
                        title,
                        authors: (meta?.creators || [])
                            .map((creator) => prettifyName(creator.name || creator.person_or_org?.name || ''))
                            .filter(Boolean)
                            .slice(0, 8),
                        year: yearOf(meta?.publication_date),
                        venue: meta?.journal?.title?.trim() || undefined,
                        citationCount: 0,
                        doi,
                        pdfUrl,
                        url: pdfUrl ? undefined : page,
                        abstract: clipText(stripTags(meta?.description || ''), ABSTRACT_KEEP_CHARS),
                        type: workTypeFromLabel(meta?.resource_type?.subtype || meta?.resource_type?.type),
                        isOpenAccess: meta?.access_right === 'open' || Boolean(pdfUrl),
                        source: 'Zenodo',
                    },
                ]
            })
        },
        maxWaitMs,
        ctx.signal
    )
}

type OpenAireProduct = {
    id?: string
    mainTitle?: string
    publicationDate?: string
    descriptions?: string[]
    authors?: Array<{ fullName?: string }>
    pids?: Array<{ scheme?: string; value?: string }>
    language?: { code?: string }
    container?: { name?: string }
    instances?: Array<{ type?: string; urls?: string[] }>
    bestAccessRight?: { label?: string } | string | null
    openAccessColor?: string | null
}

function buildOpenAireUrl(text: string, limit: number): string {
    const params = new URLSearchParams()
    params.set('search', text.replace(/\s+/g, ' ').trim().slice(0, 200))
    params.set('type', 'publication')
    params.set('page', '1')
    params.set('pageSize', String(Math.min(limit, 5)))
    return `https://api.openaire.eu/graph/v3/research-products?${params.toString()}`
}

export async function queryOpenAire(ctx: AcademicSourceContext, text: string, maxWaitMs = 3_000): Promise<AcademicPaper[]> {
    return openaireQueue.run(
        async () => {
            const res = await fetchAcademic(
                buildOpenAireUrl(text, ctx.limit),
                { headers: { 'User-Agent': userAgent(ctx.keys.contactEmail), Accept: 'application/json' } },
                EXTRA_TIMEOUT_MS,
                ctx.signal,
                { cooldownKey: 'openaire' }
            )
            const data = await readJson<{ results?: OpenAireProduct[] }>(res)
            if (!data || !Array.isArray(data.results)) throw new AcademicSourceError('parse_error')
            return data.results.slice(0, ctx.limit).flatMap((item): AcademicPaper[] => {
                const title = stripTags(item.mainTitle || '')
                if (!title) return []
                const doi = doiUrl((item.pids || []).find((pid) => String(pid.scheme || '').toLowerCase() === 'doi')?.value)
                const urls = (item.instances || []).flatMap((instance) => instance.urls || [])
                const pdfUrl = urls.find((url) => isPdfLike(url))
                const landing = urls.find((url) => url.startsWith('http') && !isPdfLike(url))
                const access = typeof item.bestAccessRight === 'string' ? item.bestAccessRight : item.bestAccessRight?.label
                return [
                    {
                        id: `openaire-${item.id || title.slice(0, 40)}`,
                        title,
                        authors: (item.authors || [])
                            .map((author) => prettifyName(author.fullName || ''))
                            .filter(Boolean)
                            .slice(0, 8),
                        year: yearOf(item.publicationDate),
                        venue: item.container?.name?.trim() || undefined,
                        citationCount: 0,
                        doi,
                        pdfUrl,
                        url: pdfUrl ? undefined : landing,
                        abstract: clipText(stripTags((item.descriptions || [])[0] || ''), ABSTRACT_KEEP_CHARS),
                        language: oaLanguage(item.language?.code),
                        type: workTypeFromLabel(item.instances?.[0]?.type),
                        isOpenAccess: Boolean(pdfUrl) || /open/i.test(String(access || item.openAccessColor || '')),
                        source: 'OpenAIRE',
                    },
                ]
            })
        },
        maxWaitMs,
        ctx.signal
    )
}
