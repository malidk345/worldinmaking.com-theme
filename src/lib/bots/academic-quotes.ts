/**
 * Grounded quotes for the opt-in `find_quotes` tool (step 3).
 *
 * Returns short VERBATIM passages that support a claim, taken only from text
 * that was actually fetched:
 *   - Semantic Scholar snippet search (only with SEMANTIC_SCHOLAR_API_KEY)
 *   - Europe PMC full-text XML (open-access PMC articles; section titles kept)
 *   - CORE v3 full text (keyless, serialized with the search queue)
 *   - the paper's open-access PDF / full-text page through the existing
 *     `read_document` reader (no new PDF parser)
 *
 * Every quote is an exact substring of the fetched text (whitespace
 * normalized); a sentence longer than the cap is cut at word boundaries and
 * marked with "…". Nothing is paraphrased or generated here.
 */

import type { AiCitation } from '../ai/contracts'
import {
    AcademicSourceError,
    abortError,
    assertAcademicNotAborted,
    cleanDoi,
    fetchAcademic,
    foldText,
    readJson,
    readText,
    resolveAcademicApiKeys,
    s2Queue,
    stripTags,
    truncateAtWord,
    userAgent,
    type AcademicApiKeys,
    type AcademicSourceReason,
} from './academic-common'
import {
    lookupDoiViaCrossref,
    normalizeTitleKey,
    queryTokenSets,
    resolveOaPdfViaUnpaywall,
    type AcademicPaper,
} from './academic-search'
import { coreQueue } from './academic-sources-extra'
import { ACADEMIC_PARTIAL_TTL_S, ACADEMIC_QUOTES_TTL_S, academicCacheGet, academicCachePut } from './academic-cache'
import { academicResultsToCitations, existingMarker, matchTurnCitation } from './academic-citations'
import type { PaperRef } from './academic-graph'
import { executeReadDocument, readRemotePdfPages } from './tools/read-document'
import { pdfPageLabel } from './pdf-text'
import type { EnvStore } from './runtime-env'

export const QUOTE_MAX_CHARS = 320
export const QUOTES_DEFAULT = 3
export const QUOTES_MAX = 5
const QUOTE_MIN_CHARS = 40
const SOURCE_TIMEOUT_MS = 10_000
const S2_QUEUE_WAIT_MS = 8_000
const CORE_QUEUE_WAIT_MS = 5_000

export type QuoteSourceId = 's2_snippets' | 'europepmc' | 'core' | 'oa_pdf' | 'metadata'

export interface QuoteSourceStatus {
    source: QuoteSourceId
    status: 'ok' | 'failed' | 'skipped'
    reason?: AcademicSourceReason
    httpStatus?: number
    /** Quotes found in this source. */
    count: number
    ms: number
    keyed?: boolean
    note?: string
}

export interface GroundedQuote {
    /** Verbatim text (whitespace normalized); leading / trailing "…" = cut inside a longer sentence. */
    text: string
    source: QuoteSourceId
    /** Human location: section title, PDF text block, or position in the full text. */
    location: string
    score: number
    /** Paper the quote comes from when the search spanned several papers (S2 corpus-wide). */
    paper?: AcademicPaper
}

export interface GroundedQuotesResult {
    ok: boolean
    claim: string
    paper?: AcademicPaper
    quotes: GroundedQuote[]
    sources: QuoteSourceStatus[]
    /** True when at least one source returned readable full text. */
    fullTextFound: boolean
    notice?: string
    error?: string
    missingKeys?: string[]
    cached?: boolean
}

// ---------------------------------------------------------------------------
// Passage extraction (pure)
// ---------------------------------------------------------------------------

// Built via RegExp(): the repo's TS target rejects the `u` literal flag.
const SENTENCE_SPLIT_RE = new RegExp('(?<=[.!?…][”"’)\\]]?)\\s+(?=[\\p{Lu}\\p{N}"“‘(\\[])', 'u')
const LETTER_RE = new RegExp('\\p{L}', 'gu')
const NON_LETTER_RE = new RegExp('[^\\p{L}]', 'gu')

/** Rejects extractor garbage (binary PDF streams, glyph soup, reference lists). */
export function looksLikeProse(text: string): boolean {
    const t = text.trim()
    if (t.length < QUOTE_MIN_CHARS || t.includes('\uFFFD')) return false
    const nonSpace = t.replace(/\s+/g, '')
    const letters = (t.match(LETTER_RE) || []).length
    if (nonSpace.length === 0 || letters / nonSpace.length < 0.75) return false
    const words = t.split(/\s+/)
    if (words.length < 6) return false
    const tiny = words.filter((w) => w.replace(NON_LETTER_RE, '').length === 1).length
    if (tiny / words.length > 0.3) return false
    const upper = (t.match(/[A-ZÇĞİÖŞÜ]/g) || []).length
    if (letters > 0 && upper / letters > 0.6) return false
    return true
}

function tokenHits(folded: string, tokens: string[]): number {
    let hits = 0
    for (const t of tokens) {
        if (folded.includes(t) || (t.length >= 7 && folded.includes(t.slice(0, t.length - 2)))) hits += 1
    }
    return hits
}

interface Candidate {
    start: number
    end: number
    text: string
    score: number
}

/** Cut an over-long sentence to ≤ max chars around its first matching term, at word boundaries. */
function windowAround(sentence: string, tokens: string[], max: number): string {
    const folded = foldText(sentence)
    let pos = -1
    for (const t of tokens) {
        const i = folded.indexOf(t.length >= 7 ? t.slice(0, t.length - 2) : t)
        if (i >= 0 && (pos < 0 || i < pos)) pos = i
    }
    // foldText can change length (NFKD); clamp to the original string.
    pos = Math.min(Math.max(pos, 0), sentence.length - 1)
    let start = Math.max(0, pos - Math.floor(max / 3))
    let end = Math.min(sentence.length, start + max - 2)
    if (end - start < max - 2) start = Math.max(0, end - (max - 2))
    if (start > 0) {
        const sp = sentence.indexOf(' ', start)
        start = sp >= 0 && sp < pos ? sp + 1 : start
    }
    if (end < sentence.length) {
        const sp = sentence.lastIndexOf(' ', end)
        end = sp > start ? sp : end
    }
    const core = sentence.slice(start, end).trim()
    return `${start > 0 ? '…' : ''}${core}${end < sentence.length ? '…' : ''}`
}

/**
 * Passages of `text` that best support `claim` (term coverage on folded text).
 * Returned strings are verbatim substrings (whitespace normalized), ≤ maxChars.
 */
export function extractSupportingPassages(
    text: string,
    claim: string,
    opts: { maxQuotes?: number; maxChars?: number } = {}
): Array<{ text: string; score: number; offset: number }> {
    const maxQuotes = Math.max(1, Math.min(opts.maxQuotes ?? QUOTES_DEFAULT, QUOTES_MAX))
    const maxChars = Math.max(80, Math.min(opts.maxChars ?? QUOTE_MAX_CHARS, 600))
    const tokens = queryTokenSets(claim)[0] || []
    if (tokens.length === 0) return []
    const norm = String(text || '').replace(/\s+/g, ' ').trim()
    if (!norm) return []
    const need = tokens.length <= 2 ? tokens.length : Math.max(2, Math.ceil(tokens.length * 0.4))

    const sentences: Array<{ start: number; text: string }> = []
    let cursor = 0
    for (const piece of norm.split(SENTENCE_SPLIT_RE)) {
        const s = piece.trim()
        if (!s) continue
        const start = norm.indexOf(s, cursor)
        if (start < 0) continue
        cursor = start + s.length
        sentences.push({ start, text: s })
    }

    const candidates: Candidate[] = []
    const consider = (start: number, raw: string) => {
        if (!looksLikeProse(raw)) return
        const folded = foldText(raw)
        const hits = tokenHits(folded, tokens)
        if (hits < need) return
        const body = raw.length > maxChars ? windowAround(raw, tokens, maxChars) : raw
        const bodyHits = tokenHits(foldText(body), tokens)
        if (bodyHits < need) return
        const coverage = bodyHits / tokens.length
        const score = Math.round((coverage * 10 + bodyHits * 0.5 - body.length / 1000) * 1000) / 1000
        candidates.push({ start, end: start + raw.length, text: body, score })
    }
    sentences.forEach((s, i) => {
        consider(s.start, s.text)
        const next = sentences[i + 1]
        if (next) {
            const pair = norm.slice(s.start, next.start + next.text.length)
            if (pair.length <= maxChars) consider(s.start, pair)
        }
    })
    candidates.sort((a, b) => b.score - a.score || a.start - b.start)
    const picked: Candidate[] = []
    for (const c of candidates) {
        if (picked.some((p) => c.start < p.end && p.start < c.end)) continue
        // Verbatim guard: the quote body (minus cut markers) must occur in the source text.
        const core = c.text.replace(/^…/, '').replace(/…$/, '')
        if (!norm.includes(core)) continue
        picked.push(c)
        if (picked.length >= maxQuotes) break
    }
    return picked.map((c) => ({ text: c.text, score: c.score, offset: c.start / Math.max(norm.length, 1) }))
}

/** JATS (Europe PMC / PMC) → paragraphs with their section path. Tables, figures, formulas and references dropped. */
export function parseJatsParagraphs(xml: string): Array<{ section: string; text: string }> {
    const out: Array<{ section: string; text: string }> = []
    const abstract = xml.match(/<abstract\b[^>]*>([\s\S]*?)<\/abstract>/)
    if (abstract) {
        for (const m of Array.from(abstract[1].matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g))) {
            const text = stripTags(m[1])
            if (text) out.push({ section: 'Abstract', text })
        }
    }
    const bodyStart = xml.indexOf('<body')
    const bodyEnd = xml.indexOf('</body>')
    if (bodyStart < 0 || bodyEnd < bodyStart) return out
    const body = xml
        .slice(bodyStart, bodyEnd)
        .replace(/<(table-wrap|fig|disp-formula|ref-list|supplementary-material)\b[\s\S]*?<\/\1>/g, ' ')
    const stack: string[] = []
    const re = /<sec\b[^>]*>|<\/sec>|<title>([\s\S]*?)<\/title>|<p\b[^>]*>([\s\S]*?)<\/p>/g
    for (const m of Array.from(body.matchAll(re))) {
        const tag = m[0]
        if (tag.startsWith('<sec')) stack.push('')
        else if (tag === '</sec>') stack.pop()
        else if (m[1] !== undefined) {
            if (stack.length && !stack[stack.length - 1]) stack[stack.length - 1] = stripTags(m[1])
        } else if (m[2] !== undefined) {
            const text = stripTags(m[2])
            if (text) out.push({ section: stack.filter(Boolean).slice(-2).join(' › ') || 'Body', text })
        }
    }
    return out
}

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

function headersFor(keys: AcademicApiKeys): Record<string, string> {
    return { 'User-Agent': userAgent(keys.contactEmail), Accept: 'application/json' }
}

type S2Snippet = {
    snippet?: { text?: string; snippetKind?: string; section?: string }
    paper?: { corpusId?: number | string; title?: string; authors?: Array<{ name?: string } | string> }
}

async function s2SnippetQuotes(
    claim: string,
    paperId: string | undefined,
    maxQuotes: number,
    keys: AcademicApiKeys,
    signal?: AbortSignal
): Promise<GroundedQuote[]> {
    const params = new URLSearchParams()
    params.set('query', claim)
    params.set('limit', String(paperId ? 5 : Math.max(maxQuotes * 2, 6)))
    if (paperId) params.set('paperIds', paperId)
    const data = await s2Queue.run(
        async () => {
            const res = await fetchAcademic(
                `https://api.semanticscholar.org/graph/v1/snippet/search?${params.toString()}`,
                { headers: { ...headersFor(keys), 'x-api-key': keys.semanticScholarKey as string } },
                SOURCE_TIMEOUT_MS,
                signal,
                { cooldownKey: 's2-graph-key' }
            )
            return readJson<{ data?: S2Snippet[] }>(res)
        },
        S2_QUEUE_WAIT_MS,
        signal
    )
    if (!data || !Array.isArray(data.data)) throw new AcademicSourceError('parse_error')
    const quotes: GroundedQuote[] = []
    for (const hit of data.data) {
        const text = hit.snippet?.text || ''
        const where =
            hit.snippet?.snippetKind === 'body'
                ? `Semantic Scholar snippet, section "${truncateAtWord(hit.snippet?.section || 'body', 80)}"`
                : `Semantic Scholar snippet (${hit.snippet?.snippetKind || 'text'})`
        let paper: AcademicPaper | undefined
        if (!paperId && hit.paper?.title) {
            const corpusId = hit.paper.corpusId
            paper = {
                id: corpusId ? `CorpusId:${corpusId}` : `s2-snippet-${normalizeTitleKey(hit.paper.title).slice(0, 30)}`,
                title: hit.paper.title,
                authors: (hit.paper.authors || [])
                    .map((a) => (typeof a === 'string' ? a : a?.name || ''))
                    .filter(Boolean)
                    .slice(0, 4),
                citationCount: 0,
                url: corpusId ? `https://api.semanticscholar.org/CorpusID:${corpusId}` : undefined,
                source: 'Semantic Scholar',
            }
        }
        for (const p of extractSupportingPassages(text, claim, { maxQuotes: 1 })) {
            quotes.push({ text: p.text, source: 's2_snippets', location: where, score: p.score, paper })
        }
    }
    return quotes
}

async function europePmcFullText(doi: string | undefined, pmcidHint: string | undefined, keys: AcademicApiKeys, signal?: AbortSignal): Promise<{ xml?: string; note?: string; meta?: AcademicPaper }> {
    let pmcid = pmcidHint
    let meta: AcademicPaper | undefined
    if (!pmcid) {
        if (!doi) return { note: 'no DOI or PMCID' }
        const params = new URLSearchParams()
        params.set('query', `DOI:"${doi}"`)
        params.set('format', 'json')
        params.set('resultType', 'lite')
        params.set('pageSize', '1')
        const res = await fetchAcademic(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?${params.toString()}`, { headers: headersFor(keys) }, SOURCE_TIMEOUT_MS, signal)
        const data = await readJson<{
            resultList?: { result?: Array<{ pmcid?: string; isOpenAccess?: string; title?: string; authorString?: string; pubYear?: string; journalTitle?: string }> }
        }>(res)
        const row = data?.resultList?.result?.[0]
        if (!row) return { note: 'not in Europe PMC' }
        if (row.title) {
            const year = Number(row.pubYear)
            meta = {
                id: `epmc-${doi}`,
                title: stripTags(row.title).replace(/\.$/, ''),
                authors: String(row.authorString || '')
                    .split(',')
                    .map((a) => a.trim().replace(/\.$/, ''))
                    .filter(Boolean)
                    .slice(0, 4),
                year: Number.isInteger(year) ? year : undefined,
                venue: row.journalTitle || undefined,
                citationCount: 0,
                doi: `https://doi.org/${doi}`,
                source: 'Europe PMC',
            }
        }
        if (!row.pmcid) return { note: 'no PMC full text', meta }
        if (row.isOpenAccess !== 'Y') return { note: 'not open access in Europe PMC', meta }
        pmcid = row.pmcid
    }
    const res = await fetchAcademic(
        `https://www.ebi.ac.uk/europepmc/webservices/rest/${encodeURIComponent(pmcid)}/fullTextXML`,
        { headers: { 'User-Agent': userAgent(keys.contactEmail), Accept: 'application/xml' } },
        SOURCE_TIMEOUT_MS,
        signal,
        { noRetry: true }
    )
    const xml = await readText(res)
    if (!xml.includes('<article')) throw new AcademicSourceError('parse_error')
    return { xml, meta }
}

async function coreFullText(doi: string | undefined, title: string | undefined, keys: AcademicApiKeys, signal?: AbortSignal): Promise<{ text?: string; downloadUrl?: string; note?: string }> {
    const titleKey = title ? normalizeTitleKey(title) : ''
    if (!doi && !titleKey) return { note: 'no DOI or title' }
    const q = doi ? `doi:"${doi}"` : `title:"${String(title).replace(/"/g, ' ').slice(0, 200)}"`
    return coreQueue.run(
        async () => {
            const res = await fetchAcademic(
                `https://api.core.ac.uk/v3/search/works/?q=${encodeURIComponent(q)}&limit=${doi ? 1 : 3}`,
                { headers: headersFor(keys) },
                SOURCE_TIMEOUT_MS,
                signal,
                { cooldownKey: 'core', noRetry: true }
            )
            const data = await readJson<{ results?: Array<{ title?: string; doi?: string | null; fullText?: string | null; downloadUrl?: string }> }>(res)
            if (!data || !Array.isArray(data.results)) throw new AcademicSourceError('parse_error')
            const hit = data.results.find((w) => (doi ? cleanDoi(w.doi || '') === doi : normalizeTitleKey(String(w.title || '')) === titleKey))
            if (!hit) return { note: 'not in CORE' }
            const downloadUrl = typeof hit.downloadUrl === 'string' && hit.downloadUrl.startsWith('http') ? hit.downloadUrl : undefined
            const text = typeof hit.fullText === 'string' ? hit.fullText : ''
            if (text.replace(/\s+/g, ' ').trim().length < 500) return { note: 'no full text in CORE', downloadUrl }
            return { text, downloadUrl }
        },
        CORE_QUEUE_WAIT_MS,
        signal
    )
}

/**
 * OA PDF / full-text page. PDFs go through the pdf.js extractor (compressed /
 * object-stream PDFs such as DergiPark's, every page within PDF_TEXT_LIMITS,
 * real page numbers). PDFs pdf.js cannot open use the legacy byte scan of the
 * same download (no second fetch); HTML landing pages go through read_document.
 */
async function readDocumentChunks(url: string, signal?: AbortSignal): Promise<{ chunks: Array<{ label: string; text: string }>; note?: string }> {
    const pdf = await readRemotePdfPages(url, signal)
    if (signal?.aborted) throw abortError()
    if (pdf.ok) {
        const chunks = pdf.pdf.pages
            .filter((p) => p.text.trim())
            .map((p) => ({ label: `open-access PDF, ${pdfPageLabel(p)}`, text: p.text }))
        if (chunks.length) return { chunks, note: pdf.pdf.note }
    } else if (pdf.fetchFailed) {
        throw Object.assign(new AcademicSourceError('http_error'), { note: truncateAtWord(pdf.error, 90) })
    }
    let body: string
    if (!pdf.ok && pdf.legacyText !== undefined) {
        // A PDF pdf.js could not read: the reader already ran the legacy scan on the same bytes.
        if (!pdf.legacyText) throw Object.assign(new AcademicSourceError('http_error'), { note: truncateAtWord(pdf.error, 90) })
        body = pdf.legacyText
    } else {
        // HTML landing page / not a PDF: the read_document reader as before.
        const read = await executeReadDocument({ url }, undefined, signal)
        if (signal?.aborted) throw abortError()
        if (!read.ok) throw Object.assign(new AcademicSourceError('http_error'), { note: truncateAtWord(read.error, 90) })
        body = read.text.replace(/^\[Document Content for [^\]]*\]\n?/, '')
    }
    const parts = body.split(/\[Page (\d+)\]\n?/)
    if (parts.length <= 1) return { chunks: [{ label: 'open-access full-text page', text: body }] }
    const chunks: Array<{ label: string; text: string }> = []
    for (let i = 1; i < parts.length; i += 2) {
        chunks.push({ label: `open-access PDF, text block ${parts[i]} (approximate page)`, text: parts[i + 1] || '' })
    }
    return { chunks, note: body.length >= 11_900 ? 'first ~12k characters of the PDF text searched' : undefined }
}

function pmcidFromUrl(url?: string): string | undefined {
    const m = String(url || '').match(/\bPMC(\d{4,})\b/i)
    return m ? `PMC${m[1]}` : undefined
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

export interface GroundedQuotesOptions {
    maxQuotes?: number
    /** Explicit open-access PDF / full-text URL for the paper. */
    pdfUrl?: string
    noCache?: boolean
    env?: EnvStore
}

function dedupeQuotes(quotes: GroundedQuote[]): GroundedQuote[] {
    const out: GroundedQuote[] = []
    for (const q of [...quotes].sort((a, b) => b.score - a.score)) {
        const core = foldText(q.text.replace(/…/g, ' ')).replace(/\s+/g, ' ').trim()
        if (out.some((o) => {
            const other = foldText(o.text.replace(/…/g, ' ')).replace(/\s+/g, ' ').trim()
            return other.includes(core) || core.includes(other)
        })) continue
        out.push(q)
    }
    return out
}

/**
 * Verbatim supporting passages for `claim`, from one paper (`ref`) or — with a
 * Semantic Scholar key and no paper — across the S2 snippet index.
 */
export async function findGroundedQuotes(
    ref: PaperRef | undefined,
    claimInput: string,
    options: GroundedQuotesOptions = {},
    signal?: AbortSignal
): Promise<GroundedQuotesResult> {
    assertAcademicNotAborted(signal)
    const claim = String(claimInput || '').replace(/\s+/g, ' ').trim().slice(0, 300)
    const maxQuotes = Math.max(1, Math.min(Math.floor(options.maxQuotes || QUOTES_DEFAULT), QUOTES_MAX))
    const keys = resolveAcademicApiKeys(options.env)
    if (!claim || (queryTokenSets(claim)[0] || []).length === 0) {
        return { ok: false, claim, quotes: [], sources: [], fullTextFound: false, error: 'claim is required: the statement or key terms the quote should support' }
    }
    if (!ref && !keys.semanticScholarKey) {
        return {
            ok: false,
            claim,
            quotes: [],
            sources: [{ source: 's2_snippets', status: 'skipped', reason: 'missing_key', count: 0, ms: 0 }],
            fullTextFound: false,
            missingKeys: ['SEMANTIC_SCHOLAR_API_KEY'],
            error: 'Pass a paper (DOI or [P#]). Searching quotes across all papers needs SEMANTIC_SCHOLAR_API_KEY, which is not configured.',
        }
    }
    const doi = ref?.doi
    const explicitPdf = /^https?:\/\//i.test(String(options.pdfUrl || '')) ? String(options.pdfUrl) : undefined
    const useCache = !options.noCache
    const cacheParts = {
        paper: ref ? doi || ref.s2Id || ref.openAlexId || ref.pdfUrl || ref.title || ref.raw : 'corpus',
        claim,
        max: maxQuotes,
        pdf: explicitPdf,
        keyed: Boolean(keys.semanticScholarKey),
    }
    if (useCache) {
        const hit = await academicCacheGet<GroundedQuotesResult>('quotes', cacheParts)
        assertAcademicNotAborted(signal)
        if (hit && Array.isArray(hit.quotes)) return { ...hit, cached: true }
    }

    const statuses: QuoteSourceStatus[] = []
    const quotes: GroundedQuote[] = []
    let fullTextFound = false
    let paper: AcademicPaper | undefined
    let coreDownload: string | undefined

    const record = (source: QuoteSourceId, t0: number, found: number, extra: Partial<QuoteSourceStatus> = {}) =>
        statuses.push({ source, status: 'ok', count: found, ms: Date.now() - t0, ...extra })
    const fail = (source: QuoteSourceId, t0: number, err: unknown, extra: Partial<QuoteSourceStatus> = {}) => {
        if (signal?.aborted) throw err instanceof Error ? err : abortError()
        const reason: AcademicSourceReason = err instanceof AcademicSourceError ? err.reason : 'error'
        const httpStatus = err instanceof AcademicSourceError ? err.httpStatus : undefined
        const note = (err as { note?: string })?.note
        statuses.push({ source, status: 'failed', reason, httpStatus, count: 0, ms: Date.now() - t0, ...(note ? { note } : {}), ...extra })
    }
    const skip = (source: QuoteSourceId, reason: AcademicSourceReason, note?: string) =>
        statuses.push({ source, status: 'skipped', reason, count: 0, ms: 0, ...(note ? { note } : {}) })

    const jobs: Array<Promise<void>> = []

    // Metadata for a paper that is not yet a source this turn (needed for its citation card).
    if (ref && !ref.citation && doi) {
        jobs.push(
            (async () => {
                const t0 = Date.now()
                try {
                    const found = await lookupDoiViaCrossref(doi, { env: options.env, signal, noCache: !useCache })
                    if (found.found && found.title) {
                        paper = {
                            id: doi,
                            title: found.title,
                            authors: found.authors || [],
                            year: found.year,
                            venue: found.venue,
                            citationCount: 0,
                            doi: `https://doi.org/${doi}`,
                            source: 'Crossref',
                        }
                    }
                    record('metadata', t0, 0, { note: found.found ? 'Crossref' : found.transient ? 'Crossref unavailable' : 'DOI not found in Crossref' })
                } catch (err) {
                    fail('metadata', t0, err)
                }
            })()
        )
    }

    // 1) Semantic Scholar snippets (key only).
    if (!keys.semanticScholarKey) {
        skip('s2_snippets', 'missing_key')
    } else {
        const paperId = ref ? ref.s2Id || (doi ? `DOI:${doi}` : undefined) : undefined
        if (ref && !paperId) skip('s2_snippets', 'no_identifier')
        else
            jobs.push(
                (async () => {
                    const t0 = Date.now()
                    try {
                        const found = await s2SnippetQuotes(claim, paperId, maxQuotes, keys, signal)
                        if (found.length) fullTextFound = true
                        quotes.push(...found)
                        record('s2_snippets', t0, found.length, { keyed: true })
                    } catch (err) {
                        fail('s2_snippets', t0, err, { keyed: true })
                    }
                })()
            )
    }

    if (ref) {
        // 2) Europe PMC full text (OA PMC articles).
        const pmcid = pmcidFromUrl(ref.pdfUrl) || pmcidFromUrl(ref.oaUrl) || pmcidFromUrl(ref.citation?.url)
        if (!doi && !pmcid) skip('europepmc', 'no_identifier')
        else
            jobs.push(
                (async () => {
                    const t0 = Date.now()
                    try {
                        const ft = await europePmcFullText(doi, pmcid, keys, signal)
                        if (ft.meta && !paper && !ref.citation) paper = ft.meta
                        if (!ft.xml) {
                            statuses.push({ source: 'europepmc', status: 'skipped', reason: 'no_fulltext', count: 0, ms: Date.now() - t0, note: ft.note })
                            return
                        }
                        fullTextFound = true
                        const found: GroundedQuote[] = []
                        for (const para of parseJatsParagraphs(ft.xml)) {
                            for (const p of extractSupportingPassages(para.text, claim, { maxQuotes: 1 })) {
                                found.push({ text: p.text, source: 'europepmc', location: `Europe PMC full text, section "${truncateAtWord(para.section, 90)}"`, score: p.score })
                            }
                        }
                        found.sort((a, b) => b.score - a.score)
                        quotes.push(...found.slice(0, maxQuotes))
                        record('europepmc', t0, Math.min(found.length, maxQuotes))
                    } catch (err) {
                        fail('europepmc', t0, err)
                    }
                })()
            )

        // 3) CORE full text.
        jobs.push(
            (async () => {
                const t0 = Date.now()
                try {
                    const ft = await coreFullText(doi, ref.title || ref.citation?.title, keys, signal)
                    coreDownload = ft.downloadUrl
                    if (!ft.text) {
                        statuses.push({ source: 'core', status: 'skipped', reason: 'no_fulltext', count: 0, ms: Date.now() - t0, note: ft.note })
                        return
                    }
                    fullTextFound = true
                    const found = extractSupportingPassages(ft.text, claim, { maxQuotes }).map((p) => ({
                        text: p.text,
                        source: 'core' as const,
                        location: `CORE full text (no page numbers), about ${Math.round(p.offset * 100)}% into the text`,
                        score: p.score,
                    }))
                    quotes.push(...found)
                    record('core', t0, found.length)
                } catch (err) {
                    fail('core', t0, err)
                }
            })()
        )
    } else {
        skip('europepmc', 'no_identifier', 'no paper given')
        skip('core', 'no_identifier', 'no paper given')
    }

    await Promise.all(jobs)
    assertAcademicNotAborted(signal)

    // 4) Open-access PDF / page via read_document — only when no full text was found above.
    if (ref) {
        if (fullTextFound && dedupeQuotes(quotes).length >= 1) {
            skip('oa_pdf', 'skipped_by_filter', 'full text already searched')
        } else {
            const t0 = Date.now()
            let url = explicitPdf || ref.pdfUrl || ref.oaUrl || paper?.pdfUrl
            if (!url && doi) {
                try {
                    url = await resolveOaPdfViaUnpaywall(doi, keys.contactEmail, signal, useCache)
                } catch (err) {
                    if (signal?.aborted) throw err
                }
            }
            url = url || coreDownload
            if (!url) {
                skip('oa_pdf', 'no_fulltext', 'no open-access copy found')
            } else {
                try {
                    const doc = await readDocumentChunks(url, signal)
                    const found: GroundedQuote[] = []
                    for (const chunk of doc.chunks) {
                        for (const p of extractSupportingPassages(chunk.text, claim, { maxQuotes })) {
                            found.push({ text: p.text, source: 'oa_pdf', location: chunk.label, score: p.score })
                        }
                    }
                    const readable = doc.chunks.some((c) => looksLikeProse(c.text.slice(0, 2_000)))
                    if (readable) fullTextFound = true
                    found.sort((a, b) => b.score - a.score)
                    quotes.push(...found.slice(0, maxQuotes))
                    const note = readable ? doc.note : 'no readable text extracted (scanned or compressed PDF)'
                    record('oa_pdf', t0, Math.min(found.length, maxQuotes), note ? { note } : {})
                } catch (err) {
                    fail('oa_pdf', t0, err)
                }
            }
        }
    }

    const finalQuotes = dedupeQuotes(quotes).slice(0, maxQuotes)
    const unreadablePdf = statuses.some((s) => s.source === 'oa_pdf' && s.status === 'ok' && /no readable text/.test(s.note || ''))
    const attempted = statuses.filter((s) => s.status !== 'skipped' && s.source !== 'metadata')
    const failed = attempted.filter((s) => s.status === 'failed')
    const missingKeys = keys.semanticScholarKey ? undefined : ['SEMANTIC_SCHOLAR_API_KEY']
    const notes: string[] = []
    if (finalQuotes.length === 0) {
        notes.push(
            fullTextFound
                ? 'No verbatim passage matching the claim was found in the accessible full text. Do not quote; say no supporting passage was found.'
                : unreadablePdf
                  ? 'An open-access PDF was found, but its text could not be extracted here (scanned or compressed PDF). Do not quote it; cite it without quotation marks, tell the user an exact passage could not be verified, and point them to the PDF link.'
                  : 'No open full text was reachable for this paper. Do not quote it; cite it without quotation marks and tell the user an exact passage could not be verified.'
        )
    }
    if (failed.length) notes.push(`Some sources failed (${failed.map((s) => `${s.source}: ${s.reason || 'error'}`).join(', ')}).`)

    const result: GroundedQuotesResult = {
        ok: finalQuotes.length > 0 || attempted.length === 0 || failed.length < attempted.length,
        claim,
        paper,
        quotes: finalQuotes,
        sources: statuses,
        fullTextFound,
        notice: notes.length ? notes.join(' ') : undefined,
        missingKeys,
    }
    if (!result.ok) result.error = result.notice

    console.info('[academic] quotes', {
        statuses: statuses.map((s) => `${s.source}:${s.status}${s.reason ? `:${s.reason}` : ''}:${s.count}`),
        quotes: finalQuotes.length,
    })
    if (useCache && result.ok && (finalQuotes.length > 0 || fullTextFound)) {
        await academicCachePut('quotes', cacheParts, result, failed.length ? ACADEMIC_PARTIAL_TTL_S : ACADEMIC_QUOTES_TTL_S)
    }
    return result
}

// ---------------------------------------------------------------------------
// Model payload + citations
// ---------------------------------------------------------------------------

export const QUOTES_INSTRUCTION =
    'Verbatim text only (whitespace normalized; "…" marks where a longer sentence was cut). Quote these passages exactly, attribute each to its [P#] and the location shown, and never alter the wording or present a paraphrase as a quote. If none supports the claim, say no supporting passage was found in the accessible full text.'

function formatQuoteStatus(sources: QuoteSourceStatus[]): string {
    return sources
        .filter((s) => s.source !== 'metadata')
        .map((s) => {
            if (s.status === 'ok') return `${s.source} ok(${s.count}${s.note ? `; ${s.note}` : ''})`
            return `${s.source} ${s.status}(${s.reason || 'error'}${s.httpStatus ? ` ${s.httpStatus}` : ''}${s.note ? `; ${s.note}` : ''})`
        })
        .join(' · ')
}

function paperFromRef(ref: PaperRef): AcademicPaper | undefined {
    const c = ref.citation
    if (!c) return undefined
    return {
        id: c.doi || c.url,
        title: c.title,
        authors: c.authors || [],
        year: c.year,
        venue: c.venue,
        citationCount: c.citationCount || 0,
        doi: c.doi ? `https://doi.org/${c.doi}` : undefined,
        pdfUrl: c.pdfUrl,
        url: c.url,
        source: 'Crossref',
    }
}

function shortRef(p: AcademicPaper | undefined): string {
    if (!p) return ''
    const author = p.authors[0] ? `${p.authors[0].split(/\s+/).slice(-1)[0]}${p.authors.length > 1 ? ' et al.' : ''} ` : ''
    return `${author}(${p.year || 'n.d.'}) "${truncateAtWord(p.title, 120)}"`
}

/**
 * Model payload + UI citations for find_quotes. A paper that is already a
 * source this turn keeps its id (`[P@n]`); otherwise it becomes `[P1]` with the
 * first quote as the card snippet.
 */
export function buildQuotesToolOutput(
    result: GroundedQuotesResult,
    ref: PaperRef | undefined,
    turnCitations: AiCitation[] | undefined,
    maxChars = 3_000
): { text: string; citations: AiCitation[] } {
    const fresh: AcademicPaper[] = []
    const labelFor = (p: AcademicPaper | undefined, existingId?: number): string => {
        if (existingId !== undefined) return existingMarker(existingId)
        if (!p) return ''
        const hit = matchTurnCitation(p, turnCitations)
        if (hit) return existingMarker(hit.id)
        const key = normalizeTitleKey(p.title) || p.id
        let idx = fresh.findIndex((f) => (normalizeTitleKey(f.title) || f.id) === key)
        if (idx < 0) {
            fresh.push(p)
            idx = fresh.length - 1
        }
        return `[P${idx + 1}]`
    }
    const mainPaper = ref ? result.paper || paperFromRef(ref) : undefined
    const mainLabel = ref ? labelFor(mainPaper, ref.existingId) || (ref.doi ? `doi:${ref.doi}` : ref.raw) : ''
    const header: string[] = [
        `GROUNDED QUOTES — claim: "${truncateAtWord(result.claim, 160)}"${ref ? ` — paper: ${mainLabel} ${shortRef(mainPaper)}`.trimEnd() : ' — across Semantic Scholar'}`,
    ]
    if (result.sources.length) header.push(`Sources: ${formatQuoteStatus(result.sources)}`)
    if (result.notice) header.push(`NOTE: ${truncateAtWord(result.notice, 500)}`)
    if (result.quotes.length) header.push(QUOTES_INSTRUCTION)
    const lines: string[] = []
    result.quotes.forEach((q, i) => {
        const label = q.paper ? labelFor(q.paper) : mainLabel
        lines.push(`Q${i + 1} ${label} "${q.text}" — ${q.location}`)
    })
    let text = [...header, ...lines].join('\n')
    while (text.length > maxChars && lines.length > 1) {
        lines.pop()
        text = [...header, ...lines, `(${result.quotes.length - lines.length} more quote(s) omitted for length)`].join('\n')
    }
    if (text.length > maxChars) text = truncateAtWord(text, maxChars - 1)
    const citations = academicResultsToCitations(fresh)
    // The card shows the first verbatim passage from that paper instead of the abstract.
    citations.forEach((c, i) => {
        const p = fresh[i]
        const q = result.quotes.find((x) => (x.paper ? x.paper === p : p === mainPaper))
        if (q) c.snippet = `“${truncateAtWord(q.text.replace(/^…|…$/g, ''), 200)}”`
    })
    return { text, citations }
}
