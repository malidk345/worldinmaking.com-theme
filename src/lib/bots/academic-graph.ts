/**
 * Citation-graph expansion for the `related_papers` tool (step 3).
 *
 * Given one paper (DOI, Semantic Scholar id, OpenAlex id, or a [P#] from this
 * turn) returns works that cite it, works it cites, and recommended / related
 * works, merged with the same Unicode-aware duplicate logic as academic search,
 * ranked by reciprocal-rank fusion across lists, and cached in `caches.default`.
 *
 * Sources (all optional, status reported per list):
 *   - Semantic Scholar: /citations, /references, recommendations (keyless works
 *     intermittently; SEMANTIC_SCHOLAR_API_KEY makes it reliable). Serialized
 *     through `s2Queue` (~1 request / s).
 *   - OpenAlex: single-work fetch (free without a key) → referenced_works and
 *     related_works; `cites:` lists (works citing the seed) need OPENALEX_API_KEY
 *     because keyless list queries draw on an exhausted shared daily budget.
 *   - OpenCitations index v2 (keyless): citing / cited DOIs.
 *   - Crossref (keyless): the seed record + publisher-deposited reference list,
 *     and a batched `filter=doi:…` metadata lookup for DOI-only hits.
 */

import type { AiCitation } from '../ai/contracts'
import {
    AcademicSourceError,
    abortError,
    assertAcademicNotAborted,
    cleanDoi,
    doiUrl,
    fetchAcademic,
    mapWithConcurrency,
    readJson,
    resolveAcademicApiKeys,
    s2Queue,
    stripTags,
    truncateAtWord,
    userAgent,
    type AcademicApiKeys,
    type AcademicSourceReason,
} from './academic-common'
import {
    crossrefItemToPaper,
    formatPaperLine,
    mergeAcademicPapers,
    applyRetractionPolicy,
    queryWantsRetracted,
    normalizeTitleKey,
    openAlexWorkToPaper,
    queryTokenSets,
    relevanceCoverage,
    resolveOaPdfViaUnpaywall,
    s2PaperToPaper,
    RRF_K,
    type AcademicPaper,
    type CrossrefItem,
    type OpenAlexWork,
    type S2Paper,
} from './academic-search'
import { ACADEMIC_GRAPH_TTL_S, ACADEMIC_PARTIAL_TTL_S, academicCacheGet, academicCachePut } from './academic-cache'
import { prettifyCaps } from './academic-sources-extra'
import { academicResultsToCitations, existingMarker, matchTurnCitation } from './academic-citations'
import type { EnvStore } from './runtime-env'

const GRAPH_TIMEOUT_MS = 8_000
const S2_QUEUE_WAIT_MS = 9_000
const OPENALEX_SINGLE_CONCURRENCY = 3
/** Keyless OpenAlex: resolve at most this many referenced / related works one by one (free singleton fetches). */
const OPENALEX_KEYLESS_SINGLETONS = 6
const OPENALEX_LIST_IDS = 50
const DOI_LIST_CAP = 40
const CROSSREF_BATCH_MAX = 20
const UNPAYWALL_MAX = 6
const ABSTRACT_KEEP = 400

export const RELATED_DEFAULT_LIMIT = 8
export const RELATED_MAX_LIMIT = 15

export type RelatedDirection = 'all' | 'citations' | 'references' | 'similar'
export const RELATED_DIRECTIONS: readonly RelatedDirection[] = ['all', 'citations', 'references', 'similar']

/** How a related work connects to the seed. */
export type RelationKind = 'citing' | 'reference' | 'similar'

export type GraphListId =
    | 's2:paper'
    | 's2:citations'
    | 's2:references'
    | 's2:recommendations'
    | 'openalex:work'
    | 'openalex:references'
    | 'openalex:related'
    | 'openalex:cited_by'
    | 'opencitations:citations'
    | 'opencitations:references'
    | 'crossref:work'
    | 'crossref:references'
    | 'crossref:metadata'

export interface GraphSourceStatus {
    source: GraphListId
    status: 'ok' | 'failed' | 'skipped'
    reason?: AcademicSourceReason
    httpStatus?: number
    count: number
    ms: number
    keyed?: boolean
    /** Short human note (e.g. "references elided by publisher"). */
    note?: string
}

export interface RelatedPaper extends AcademicPaper {
    relations: RelationKind[]
}

export interface RelatedPapersResult {
    ok: boolean
    seed?: AcademicPaper
    /** Canonical seed key used for caching (doi:… / W… / s2 id). */
    seedKey?: string
    papers: RelatedPaper[]
    sources: GraphSourceStatus[]
    notice?: string
    error?: string
    degraded?: boolean
    allSourcesFailed?: boolean
    /** Env keys that would widen coverage (names only, never values). */
    missingKeys?: string[]
    cached?: boolean
}

// ---------------------------------------------------------------------------
// Paper reference parsing ([P#], DOI, S2, OpenAlex, arXiv, PMID)
// ---------------------------------------------------------------------------

export interface PaperRef {
    raw: string
    doi?: string
    /** Semantic Scholar paper id: 40-hex sha, CorpusId:n, ARXIV:…, PMID:… */
    s2Id?: string
    /** OpenAlex work id, e.g. W2049480502 */
    openAlexId?: string
    title?: string
    pdfUrl?: string
    oaUrl?: string
    /** Turn-global citation id when the reference is a source already shown this turn. */
    existingId?: number
    citation?: AiCitation
}

function idsFromUrl(url: string | undefined): Partial<PaperRef> {
    const out: Partial<PaperRef> = {}
    const u = String(url || '')
    const s2 = u.match(/semanticscholar\.org\/paper\/(?:[^/?#]+\/)?([0-9a-f]{40})\b/i)
    if (s2) out.s2Id = s2[1].toLowerCase()
    const oa = u.match(/openalex\.org\/(?:works\/)?(W\d{4,})\b/i)
    if (oa) out.openAlexId = oa[1].toUpperCase()
    const arxiv = u.match(/arxiv\.org\/(?:abs|pdf)\/(\d{4}\.\d{4,5})/i)
    if (arxiv) out.s2Id = `ARXIV:${arxiv[1]}`
    return out
}

function refFromCitation(c: AiCitation, raw: string): PaperRef {
    const fromUrl = idsFromUrl(c.url)
    const fromOa = idsFromUrl(c.oaUrl)
    return {
        raw,
        doi: cleanDoi(c.doi) || cleanDoi(c.url) || undefined,
        s2Id: fromUrl.s2Id || fromOa.s2Id,
        openAlexId: fromUrl.openAlexId || fromOa.openAlexId,
        title: c.title,
        pdfUrl: c.pdfUrl,
        oaUrl: c.oaUrl,
        existingId: c.id,
        citation: c,
    }
}

/**
 * Parses the `paper` argument of related_papers / find_quotes. `[P3]` / `P3`
 * resolve against this turn's citations (ids are turn-global).
 */
export function parsePaperRef(input: string, turnCitations?: AiCitation[]): { ok: true; ref: PaperRef } | { ok: false; error: string } {
    const raw = String(input || '').trim().slice(0, 300)
    if (!raw) return { ok: false, error: 'paper is required: a DOI, a [P#] from this turn, a Semantic Scholar id, or an OpenAlex id (W…)' }
    const marker = raw.match(/^\[?\s*P\s*@?(\d{1,3})\s*\]?$/i)
    if (marker) {
        const id = Number(marker[1])
        const c = (turnCitations || []).find((x) => x.id === id)
        if (!c) return { ok: false, error: `[P${id}] is not a source in this turn — pass its DOI instead` }
        if (c.kind !== 'paper' && c.kind !== 'encyclopedia') return { ok: false, error: `[P${id}] is a web page, not a paper — pass a DOI instead` }
        return { ok: true, ref: refFromCitation(c, raw) }
    }
    const ref: PaperRef = { raw }
    const doi = cleanDoi(raw)
    if (doi) ref.doi = doi
    else if (/^(https?:\/\/(www\.)?openalex\.org\/(works\/)?)?W\d{4,}$/i.test(raw)) ref.openAlexId = raw.replace(/^.*\//, '').toUpperCase()
    else if (/^[0-9a-f]{40}$/i.test(raw)) ref.s2Id = raw.toLowerCase()
    else if (/^corpus\s*id\s*:\s*\d+$/i.test(raw)) ref.s2Id = `CorpusId:${raw.replace(/\D+/g, '')}`
    else if (/^pmid\s*:\s*\d+$/i.test(raw)) ref.s2Id = `PMID:${raw.replace(/\D+/g, '')}`
    else if (/^arxiv\s*:\s*\d{4}\.\d{4,5}(v\d+)?$/i.test(raw)) ref.s2Id = `ARXIV:${raw.replace(/^arxiv\s*:\s*/i, '').replace(/v\d+$/, '')}`
    else if (/^https?:\/\//i.test(raw)) {
        const ids = idsFromUrl(raw)
        if (!ids.s2Id && !ids.openAlexId) return { ok: false, error: 'unrecognized paper URL — pass a DOI, [P#], Semantic Scholar or OpenAlex id' }
        Object.assign(ref, ids)
    } else {
        return { ok: false, error: 'unrecognized paper id — pass a DOI (10.…), a [P#] from this turn, a Semantic Scholar id, or an OpenAlex id (W…)' }
    }
    const existing = matchTurnCitation({ doi: ref.doi }, turnCitations)
    if (existing) {
        ref.existingId = existing.id
        ref.citation = existing
        ref.title = existing.title
        ref.pdfUrl = existing.pdfUrl
        ref.oaUrl = existing.oaUrl
    }
    return { ok: true, ref }
}

// ---------------------------------------------------------------------------
// Source helpers
// ---------------------------------------------------------------------------

function headersFor(keys: AcademicApiKeys): Record<string, string> {
    return { 'User-Agent': userAgent(keys.contactEmail), Accept: 'application/json' }
}

const S2_FIELDS = 'title,authors,year,venue,citationCount,externalIds,openAccessPdf,isOpenAccess,abstract'

function s2PathId(id: string): string {
    // DOIs keep their slashes (S2 accepts DOI:10.x/y in the path).
    return encodeURIComponent(id).replace(/%2F/gi, '/').replace(/%3A/gi, ':')
}

async function s2Get<T>(url: string, keys: AcademicApiKeys, signal?: AbortSignal): Promise<T> {
    return s2Queue.run(
        async () => {
            const headers = headersFor(keys)
            if (keys.semanticScholarKey) headers['x-api-key'] = keys.semanticScholarKey
            const res = await fetchAcademic(url, { headers }, GRAPH_TIMEOUT_MS, signal, {
                cooldownKey: keys.semanticScholarKey ? 's2-graph-key' : 's2-graph',
            })
            return readJson<T>(res)
        },
        S2_QUEUE_WAIT_MS,
        signal
    )
}

function openAlexAuth(keys: AcademicApiKeys, params: URLSearchParams): void {
    if (keys.openAlexKey) params.set('api_key', keys.openAlexKey)
    else params.set('mailto', keys.contactEmail)
}

const OPENALEX_SELECT =
    'id,doi,title,publication_year,cited_by_count,primary_location,best_oa_location,authorships,open_access,abstract_inverted_index,type,language,is_retracted'

async function openAlexSingle(id: string, keys: AcademicApiKeys, signal: AbortSignal | undefined, withLinks = false): Promise<OpenAlexWork> {
    const params = new URLSearchParams()
    params.set('select', withLinks ? `${OPENALEX_SELECT},referenced_works,related_works` : OPENALEX_SELECT)
    openAlexAuth(keys, params)
    const path = id.startsWith('doi:') ? `doi:${encodeURIComponent(id.slice(4)).replace(/%2F/gi, '/')}` : encodeURIComponent(id)
    const res = await fetchAcademic(`https://api.openalex.org/works/${path}?${params.toString()}`, { headers: headersFor(keys) }, GRAPH_TIMEOUT_MS, signal, {
        cooldownKey: 'openalex-single',
        noRetry: true,
    })
    const data = await readJson<OpenAlexWork>(res)
    if (!data || typeof data !== 'object' || !data.id) throw new AcademicSourceError('parse_error')
    return data
}

async function openAlexList(filter: string, perPage: number, keys: AcademicApiKeys, signal?: AbortSignal): Promise<OpenAlexWork[]> {
    const params = new URLSearchParams()
    params.set('filter', filter)
    params.set('per_page', String(Math.max(1, Math.min(perPage, 50))))
    params.set('sort', 'cited_by_count:desc')
    params.set('select', OPENALEX_SELECT)
    openAlexAuth(keys, params)
    const res = await fetchAcademic(`https://api.openalex.org/works?${params.toString()}`, { headers: headersFor(keys) }, GRAPH_TIMEOUT_MS, signal, {
        cooldownKey: keys.openAlexKey ? 'openalex-list-key' : 'openalex-list',
    })
    const data = await readJson<{ results?: OpenAlexWork[] }>(res)
    if (!data || !Array.isArray(data.results)) throw new AcademicSourceError('parse_error')
    return data.results
}

function shortOpenAlexId(url: string): string {
    const m = String(url || '').match(/W\d+/)
    return m ? m[0] : ''
}

/** referenced_works / related_works ids → papers (one list call with a key, a few free singletons without). */
async function resolveOpenAlexIds(ids: string[], keys: AcademicApiKeys, limit: number, signal?: AbortSignal): Promise<AcademicPaper[]> {
    const clean = Array.from(new Set(ids.map(shortOpenAlexId).filter(Boolean)))
    if (clean.length === 0) return []
    if (keys.openAlexKey) {
        const works = await openAlexList(`openalex:${clean.slice(0, OPENALEX_LIST_IDS).join('|')}`, Math.max(limit, 10), keys, signal)
        return works.map(openAlexWorkToPaper)
    }
    const picked = clean.slice(0, Math.min(OPENALEX_KEYLESS_SINGLETONS, limit))
    const out: Array<AcademicPaper | undefined> = new Array(picked.length)
    let firstError: unknown
    await mapWithConcurrency(
        picked.map((id, i) => ({ id, i })),
        OPENALEX_SINGLE_CONCURRENCY,
        async ({ id, i }) => {
            try {
                out[i] = openAlexWorkToPaper(await openAlexSingle(id, keys, signal))
            } catch (err) {
                if (signal?.aborted) throw err
                firstError = firstError ?? err
            }
        }
    )
    const papers = out.filter((p): p is AcademicPaper => Boolean(p))
    if (papers.length === 0 && firstError) throw firstError
    return papers
}

function extractDoisFromOci(field: string | undefined): string {
    const m = String(field || '').match(/\bdoi:(10\.\S+)/i)
    return m ? cleanDoi(m[1]) : ''
}

async function openCitationsDois(kind: 'citations' | 'references', doi: string, keys: AcademicApiKeys, signal?: AbortSignal): Promise<string[]> {
    const res = await fetchAcademic(
        `https://api.opencitations.net/index/v2/${kind}/doi:${encodeURIComponent(doi).replace(/%2F/gi, '/')}`,
        { headers: headersFor(keys) },
        GRAPH_TIMEOUT_MS,
        signal,
        { cooldownKey: 'opencitations' }
    )
    const rows = await readJson<Array<{ citing?: string; cited?: string; creation?: string }>>(res)
    if (!Array.isArray(rows)) throw new AcademicSourceError('parse_error')
    const pick = kind === 'citations' ? (r: { citing?: string }) => r.citing : (r: { cited?: string }) => r.cited
    // Newest citing works first (OpenCitations returns index order).
    const sorted = kind === 'citations' ? [...rows].sort((a, b) => String(b.creation || '').localeCompare(String(a.creation || ''))) : rows
    const out: string[] = []
    for (const r of sorted) {
        const d = extractDoisFromOci(pick(r))
        if (d && d !== doi && !out.includes(d)) out.push(d)
        if (out.length >= DOI_LIST_CAP) break
    }
    return out
}

type CrossrefReference = {
    DOI?: string
    'article-title'?: string
    'volume-title'?: string
    'journal-title'?: string
    author?: string
    year?: string
    unstructured?: string
}

async function crossrefWork(doi: string, keys: AcademicApiKeys, signal?: AbortSignal): Promise<CrossrefItem & { reference?: CrossrefReference[] }> {
    const res = await fetchAcademic(
        `https://api.crossref.org/works/${encodeURIComponent(doi)}?mailto=${encodeURIComponent(keys.contactEmail)}`,
        { headers: headersFor(keys) },
        GRAPH_TIMEOUT_MS,
        signal
    )
    const data = await readJson<{ message?: CrossrefItem & { reference?: CrossrefReference[] } }>(res)
    if (!data?.message) throw new AcademicSourceError('parse_error')
    return data.message
}

async function crossrefByDois(dois: string[], keys: AcademicApiKeys, signal?: AbortSignal): Promise<AcademicPaper[]> {
    if (dois.length === 0) return []
    const params = new URLSearchParams()
    params.set('filter', dois.map((d) => `doi:${d}`).join(','))
    params.set('rows', String(dois.length))
    params.set(
        'select',
        'DOI,URL,title,author,issued,published-print,published-online,container-title,is-referenced-by-count,abstract,subject,link,type,license,update-to,updated-by'
    )
    params.set('mailto', keys.contactEmail)
    const res = await fetchAcademic(`https://api.crossref.org/works?${params.toString()}`, { headers: headersFor(keys) }, GRAPH_TIMEOUT_MS, signal)
    const data = await readJson<{ message?: { items?: CrossrefItem[] } }>(res)
    const items = data?.message?.items
    if (!Array.isArray(items)) throw new AcademicSourceError('parse_error')
    return items.filter((i) => Array.isArray(i.title) && i.title[0]).map(crossrefItemToPaper)
}

function referenceToPaper(r: CrossrefReference): AcademicPaper | undefined {
    const title = stripTags(r['article-title'] || r['volume-title'] || '')
    if (!title) return undefined
    const year = Number(String(r.year || '').slice(0, 4))
    return {
        id: `crossref-ref-${normalizeTitleKey(title).slice(0, 40) || Math.random()}`,
        title,
        authors: r.author ? [r.author.trim()] : [],
        year: Number.isInteger(year) && year > 1000 ? year : undefined,
        venue: r['journal-title'] ? stripTags(r['journal-title']) : r['article-title'] && r['volume-title'] ? stripTags(r['volume-title']) : undefined,
        citationCount: 0,
        doi: doiUrl(r.DOI),
        source: 'Crossref',
    }
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

export interface RelatedPapersOptions {
    direction?: RelatedDirection
    limit?: number
    sortBy?: 'relevance' | 'citations' | 'recent'
    /** Optional topic words to favour among the related works (soft boost only). */
    focus?: string
    noCache?: boolean
    env?: EnvStore
}

type ListRun = { id: GraphListId; relation?: RelationKind; keyed?: boolean }

function relationOf(listKey: string): RelationKind | undefined {
    if (listKey === 's2:citations' || listKey === 'openalex:cited_by' || listKey === 'opencitations:citations') return 'citing'
    if (listKey === 's2:references' || listKey === 'openalex:references' || listKey === 'opencitations:references' || listKey === 'crossref:references') {
        return 'reference'
    }
    if (listKey === 's2:recommendations' || listKey === 'openalex:related') return 'similar'
    return undefined
}

function withListRanks(papers: AcademicPaper[], listKey: string): AcademicPaper[] {
    return papers.map((p, i) => ({ ...p, ranks: { ...(p.ranks || {}), [listKey]: i + 1 } }))
}

function failure(err: unknown): { reason: AcademicSourceReason; httpStatus?: number } {
    if (err instanceof AcademicSourceError) return { reason: err.reason, httpStatus: err.httpStatus }
    return { reason: 'error' }
}

/** Fused score: RRF over lists (agreement across sources wins) + modest citation / OA / focus signals. */
export function relatedScore(paper: AcademicPaper, focusSets: string[][]): number {
    let rrf = 0
    for (const rank of Object.values(paper.ranks || {})) {
        if (typeof rank === 'number' && rank > 0) rrf += 100 / (RRF_K + rank)
    }
    let score = rrf + Math.min(Math.log10((paper.citationCount || 0) + 1) * 0.4, 1.6)
    if (paper.pdfUrl || paper.isOpenAccess) score += 0.3
    if (cleanDoi(paper.doi)) score += 0.1
    if (focusSets.length) {
        const { coverage, titleCoverage } = relevanceCoverage(paper, focusSets)
        score += coverage * 4 + titleCoverage * 2
    }
    return Math.round(score * 1000) / 1000
}

export function rankRelatedPapers(papers: AcademicPaper[], sortBy: RelatedPapersOptions['sortBy'] = 'relevance', focus?: string): AcademicPaper[] {
    const sets = focus ? queryTokenSets(focus) : []
    const scored = papers.map((p) => ({ ...p, score: relatedScore(p, sets) }))
    scored.sort((a, b) => {
        if (sortBy === 'citations' && b.citationCount !== a.citationCount) return b.citationCount - a.citationCount
        if (sortBy === 'recent' && (b.year || 0) !== (a.year || 0)) return (b.year || 0) - (a.year || 0)
        return (b.score || 0) - (a.score || 0)
    })
    return scored
}

function stems(text: string): Set<string> {
    const out = new Set<string>()
    for (const t of queryTokenSets(text)[0] || []) if (t.length >= 5) out.add(t.slice(0, 6))
    return out
}

/**
 * "similar" recommendations (OpenAlex related_works, S2 recommendations) can be
 * off-topic for new or non-English papers. A work that is ONLY "similar" must
 * share at least one content stem with the seed (title, abstract, focus);
 * citing / reference links are kept regardless — they are facts.
 */
export function dropUnrelatedSimilar(papers: AcademicPaper[], seed: AcademicPaper | undefined, focus?: string): AcademicPaper[] {
    const seedStems = stems([seed?.title, seed?.abstract, seed?.topics?.join(' '), focus].filter(Boolean).join(' '))
    if (seedStems.size < 3) return papers
    return papers.filter((p) => {
        const rels = new Set(Object.keys(p.ranks || {}).map(relationOf).filter(Boolean))
        if (rels.size !== 1 || !rels.has('similar')) return true
        for (const st of Array.from(stems(`${p.title} ${p.abstract || ''}`))) if (seedStems.has(st)) return true
        return false
    })
}

const RELATION_ORDER: RelationKind[] = ['citing', 'reference', 'similar']

/** The relation of the list where the paper ranked best (ties: citing > reference > similar). */
export function primaryRelation(paper: AcademicPaper): RelationKind | undefined {
    let best: { rel: RelationKind; rank: number } | undefined
    for (const [key, rank] of Object.entries(paper.ranks || {})) {
        const rel = relationOf(key)
        if (!rel || typeof rank !== 'number') continue
        if (!best || rank < best.rank || (rank === best.rank && RELATION_ORDER.indexOf(rel) < RELATION_ORDER.indexOf(best.rel))) best = { rel, rank }
    }
    return best?.rel
}

/**
 * direction "all": round-robin across citing / reference / similar so one
 * well-covered relation (references usually appear in 3 lists) cannot crowd out
 * the others; output grouped by relation, each group in score order.
 */
export function balanceByRelation(ranked: AcademicPaper[], limit: number): AcademicPaper[] {
    const groups = new Map<RelationKind, AcademicPaper[]>(RELATION_ORDER.map((r) => [r, []]))
    const other: AcademicPaper[] = []
    for (const p of ranked) {
        const rel = primaryRelation(p)
        if (rel) groups.get(rel)?.push(p)
        else other.push(p)
    }
    const picked = new Set<AcademicPaper>()
    let progress = true
    while (picked.size < limit && progress) {
        progress = false
        for (const rel of RELATION_ORDER) {
            if (picked.size >= limit) break
            const next = groups.get(rel)?.find((p) => !picked.has(p))
            if (next) {
                picked.add(next)
                progress = true
            }
        }
    }
    for (const p of other) if (picked.size < limit) picked.add(p)
    const order = (p: AcademicPaper) => {
        const rel = primaryRelation(p)
        return rel ? RELATION_ORDER.indexOf(rel) : RELATION_ORDER.length
    }
    return ranked.filter((p) => picked.has(p)).sort((a, b) => order(a) - order(b))
}

function isSameWork(p: AcademicPaper, seed: { doi?: string; openAlexId?: string; s2Id?: string; titleKey?: string }): boolean {
    const doi = cleanDoi(p.doi)
    if (seed.doi && doi && doi === seed.doi) return true
    if (seed.openAlexId && shortOpenAlexId(p.id) === seed.openAlexId) return true
    if (seed.s2Id && p.id === seed.s2Id) return true
    if (seed.titleKey && normalizeTitleKey(p.title) === seed.titleKey && (!doi || !seed.doi)) return true
    return false
}

function seedCacheKey(ref: PaperRef): string {
    if (ref.doi) return `doi:${ref.doi}`
    if (ref.openAlexId) return ref.openAlexId
    if (ref.s2Id) return `s2:${ref.s2Id}`
    return ''
}

/**
 * Related works for one paper. Throws AbortError on client Stop; provider
 * failures are reported per list in `sources`.
 */
export async function findRelatedPapers(ref: PaperRef, options: RelatedPapersOptions = {}, signal?: AbortSignal): Promise<RelatedPapersResult> {
    assertAcademicNotAborted(signal)
    const direction: RelatedDirection = RELATED_DIRECTIONS.includes(options.direction as RelatedDirection) ? (options.direction as RelatedDirection) : 'all'
    const limit = Math.min(Math.max(Math.floor(options.limit || RELATED_DEFAULT_LIMIT), 1), RELATED_MAX_LIMIT)
    const sortBy = options.sortBy || 'relevance'
    const focus = String(options.focus || '').replace(/\s+/g, ' ').trim().slice(0, 200) || undefined
    const seedKey = seedCacheKey(ref)
    if (!seedKey) {
        return {
            ok: false,
            papers: [],
            sources: [],
            error: 'This source has no DOI, Semantic Scholar or OpenAlex id, so its citation graph cannot be looked up.',
        }
    }
    const useCache = !options.noCache
    const cacheParts = { seed: seedKey, dir: direction, limit, sort: sortBy, focus }
    if (useCache) {
        const hit = await academicCacheGet<RelatedPapersResult>('related', cacheParts)
        assertAcademicNotAborted(signal)
        if (hit && Array.isArray(hit.papers)) return { ...hit, cached: true }
    }

    const keys = resolveAcademicApiKeys(options.env)
    const statuses: GraphSourceStatus[] = []
    const collected: AcademicPaper[] = []
    /** DOI-only hits (OpenCitations, Crossref reference DOIs) with their per-list ranks. */
    const doiRanks = new Map<string, Record<string, number>>()
    const want = {
        citing: direction === 'all' || direction === 'citations',
        reference: direction === 'all' || direction === 'references',
        similar: direction === 'all' || direction === 'similar',
    }
    const perList = Math.max(limit, 10)
    const ids = { doi: ref.doi, s2Id: ref.s2Id, openAlexId: ref.openAlexId }
    let seed: AcademicPaper | undefined
    let openAlexWork: OpenAlexWork | undefined
    let crossrefRefs: CrossrefReference[] | undefined

    const run = async <T>(list: ListRun, fn: () => Promise<T>, count: (v: T) => number, note?: (v: T) => string | undefined): Promise<T | undefined> => {
        const t0 = Date.now()
        try {
            const value = await fn()
            const status: GraphSourceStatus = { source: list.id, status: 'ok', count: count(value), ms: Date.now() - t0 }
            if (list.keyed !== undefined) status.keyed = list.keyed
            const n = note?.(value)
            if (n) status.note = n
            statuses.push(status)
            return value
        } catch (err) {
            if (signal?.aborted) throw err instanceof Error ? err : abortError()
            const { reason, httpStatus } = failure(err)
            const status: GraphSourceStatus = { source: list.id, status: 'failed', reason, httpStatus, count: 0, ms: Date.now() - t0 }
            if (list.keyed !== undefined) status.keyed = list.keyed
            statuses.push(status)
            return undefined
        }
    }
    const skip = (id: GraphListId, reason: AcademicSourceReason, note?: string) =>
        statuses.push({ source: id, status: 'skipped', reason, count: 0, ms: 0, ...(note ? { note } : {}) })

    // ---- Phase 1: seed records (ids + metadata + OpenAlex / Crossref link lists)
    const phase1: Array<Promise<unknown>> = []
    if (!ids.doi && ids.s2Id) {
        phase1.push(
            run({ id: 's2:paper', keyed: Boolean(keys.semanticScholarKey) }, () =>
                s2Get<S2Paper>(`https://api.semanticscholar.org/graph/v1/paper/${s2PathId(ids.s2Id as string)}?fields=${S2_FIELDS}`, keys, signal),
            (v) => (v?.title ? 1 : 0)).then((p) => {
                if (p?.title) {
                    seed = s2PaperToPaper(p)
                    if (p.paperId) ids.s2Id = p.paperId
                    const d = cleanDoi(p.externalIds?.DOI)
                    if (d) ids.doi = d
                }
            })
        )
    }
    if (ids.doi || ids.openAlexId) {
        phase1.push(
            run({ id: 'openalex:work', keyed: Boolean(keys.openAlexKey) }, () =>
                openAlexSingle(ids.openAlexId || `doi:${ids.doi}`, keys, signal, true),
            (v) => (v ? 1 : 0)).then((w) => {
                if (!w) return
                openAlexWork = w
                const paper = openAlexWorkToPaper(w)
                seed = seed ? mergeAcademicPapers([seed, paper])[0] : paper
                ids.openAlexId = shortOpenAlexId(w.id) || ids.openAlexId
                const d = cleanDoi(w.doi)
                if (d && !ids.doi) ids.doi = d
            })
        )
    }
    if (ids.doi) {
        phase1.push(
            run({ id: 'crossref:work' }, () => crossrefWork(ids.doi as string, keys, signal), (v) => (v ? 1 : 0)).then((w) => {
                if (!w) return
                const paper = crossrefItemToPaper(w)
                seed = seed ? mergeAcademicPapers([seed, paper])[0] : paper
                crossrefRefs = Array.isArray(w.reference) ? w.reference : []
            })
        )
    }
    await Promise.all(phase1)
    assertAcademicNotAborted(signal)
    // An S2 id resolved to a DOI only now: fetch the Crossref / OpenAlex seed records too.
    if (ids.doi && !statuses.some((s) => s.source === 'crossref:work')) {
        await Promise.all([
            run({ id: 'openalex:work', keyed: Boolean(keys.openAlexKey) }, () => openAlexSingle(`doi:${ids.doi}`, keys, signal, true), (v) => (v ? 1 : 0)).then((w) => {
                if (!w) return
                openAlexWork = w
                seed = seed ? mergeAcademicPapers([seed, openAlexWorkToPaper(w)])[0] : openAlexWorkToPaper(w)
                ids.openAlexId = shortOpenAlexId(w.id) || ids.openAlexId
            }),
            run({ id: 'crossref:work' }, () => crossrefWork(ids.doi as string, keys, signal), (v) => (v ? 1 : 0)).then((w) => {
                if (!w) return
                seed = seed ? mergeAcademicPapers([seed, crossrefItemToPaper(w)])[0] : crossrefItemToPaper(w)
                crossrefRefs = Array.isArray(w.reference) ? w.reference : []
            }),
        ])
        assertAcademicNotAborted(signal)
    }

    // ---- Phase 2: link lists
    const s2Id = ids.s2Id || (ids.doi ? `DOI:${ids.doi}` : '')
    const s2Keyed = Boolean(keys.semanticScholarKey)
    const addPapers = (listKey: GraphListId, papers: AcademicPaper[] | undefined) => {
        if (papers?.length) collected.push(...withListRanks(papers, listKey))
    }
    const addDois = (listKey: GraphListId, dois: string[] | undefined) => {
        const list = dois || []
        for (let i = 0; i < list.length; i++) {
            const d = list[i]
            const ranks = doiRanks.get(d) || {}
            ranks[listKey] = Math.min(ranks[listKey] ?? i + 1, i + 1)
            doiRanks.set(d, ranks)
        }
    }
    const phase2: Array<Promise<unknown>> = []

    // Semantic Scholar (serialized by s2Queue).
    const s2Jobs: Array<{ id: GraphListId; want: boolean; url: string; pick: (d: unknown) => { papers: AcademicPaper[]; note?: string } }> = [
        {
            id: 's2:citations',
            want: want.citing,
            url: `https://api.semanticscholar.org/graph/v1/paper/${s2PathId(s2Id)}/citations?fields=isInfluential,${S2_FIELDS}&limit=${perList * 2}`,
            pick: (d) => {
                const rows = (d as { data?: Array<{ citingPaper?: S2Paper; isInfluential?: boolean }> | null })?.data
                if (rows === null) return { papers: [], note: 'citations elided by publisher' }
                if (!Array.isArray(rows)) throw new AcademicSourceError('parse_error')
                const good = rows.filter((r) => r.citingPaper?.title)
                // Influential citations first, then by citation count.
                good.sort((a, b) => Number(Boolean(b.isInfluential)) - Number(Boolean(a.isInfluential)) || (b.citingPaper?.citationCount || 0) - (a.citingPaper?.citationCount || 0))
                return { papers: good.slice(0, perList).map((r) => s2PaperToPaper(r.citingPaper as S2Paper)) }
            },
        },
        {
            id: 's2:references',
            want: want.reference,
            url: `https://api.semanticscholar.org/graph/v1/paper/${s2PathId(s2Id)}/references?fields=${S2_FIELDS}&limit=${perList * 3}`,
            pick: (d) => {
                const rows = (d as { data?: Array<{ citedPaper?: S2Paper }> | null })?.data
                if (rows === null) return { papers: [], note: 'reference list elided by publisher' }
                if (!Array.isArray(rows)) throw new AcademicSourceError('parse_error')
                const good = rows.filter((r) => r.citedPaper?.title).map((r) => r.citedPaper as S2Paper)
                good.sort((a, b) => (b.citationCount || 0) - (a.citationCount || 0))
                return { papers: good.slice(0, perList).map(s2PaperToPaper) }
            },
        },
        {
            id: 's2:recommendations',
            want: want.similar,
            url: `https://api.semanticscholar.org/recommendations/v1/papers/forpaper/${s2PathId(s2Id)}?fields=${S2_FIELDS}&limit=${perList}`,
            pick: (d) => {
                const rows = (d as { recommendedPapers?: S2Paper[] })?.recommendedPapers
                if (!Array.isArray(rows)) throw new AcademicSourceError('parse_error')
                return { papers: rows.filter((p) => p.title).slice(0, perList).map(s2PaperToPaper) }
            },
        },
    ]
    for (const job of s2Jobs) {
        if (!job.want) continue
        if (!s2Id) {
            skip(job.id, 'no_identifier')
            continue
        }
        phase2.push(
            run(
                { id: job.id, keyed: s2Keyed },
                async () => job.pick(await s2Get<unknown>(job.url, keys, signal)),
                (v) => v.papers.length,
                (v) => v.note
            ).then((v) => addPapers(job.id, v?.papers))
        )
    }

    // OpenAlex
    const oaKeyed = Boolean(keys.openAlexKey)
    if (want.reference) {
        if (openAlexWork?.referenced_works?.length) {
            phase2.push(
                run({ id: 'openalex:references', keyed: oaKeyed }, () => resolveOpenAlexIds(openAlexWork?.referenced_works || [], keys, perList, signal), (v) => v.length,
                    () => (oaKeyed ? undefined : `keyless: first ${Math.min(OPENALEX_KEYLESS_SINGLETONS, openAlexWork?.referenced_works?.length || 0)} of ${openAlexWork?.referenced_works?.length} resolved`)
                ).then((v) => addPapers('openalex:references', v))
            )
        } else {
            skip('openalex:references', openAlexWork ? 'no_fulltext' : 'no_identifier', openAlexWork ? 'no reference list in OpenAlex' : undefined)
        }
    }
    if (want.similar) {
        if (openAlexWork?.related_works?.length) {
            phase2.push(
                run({ id: 'openalex:related', keyed: oaKeyed }, () => resolveOpenAlexIds(openAlexWork?.related_works || [], keys, perList, signal), (v) => v.length).then((v) =>
                    addPapers('openalex:related', v)
                )
            )
        } else {
            skip('openalex:related', openAlexWork ? 'no_fulltext' : 'no_identifier', openAlexWork ? 'no related works in OpenAlex' : undefined)
        }
    }
    if (want.citing) {
        if (ids.openAlexId) {
            phase2.push(
                run({ id: 'openalex:cited_by', keyed: oaKeyed }, () => openAlexList(`cites:${ids.openAlexId}`, perList, keys, signal), (v) => v.length).then((v) =>
                    addPapers('openalex:cited_by', v?.map(openAlexWorkToPaper))
                )
            )
        } else {
            skip('openalex:cited_by', 'no_identifier')
        }
    }

    // OpenCitations (DOI only)
    for (const kind of ['citations', 'references'] as const) {
        const id: GraphListId = `opencitations:${kind}`
        if (!(kind === 'citations' ? want.citing : want.reference)) continue
        if (!ids.doi) {
            skip(id, 'no_identifier')
            continue
        }
        phase2.push(run({ id }, () => openCitationsDois(kind, ids.doi as string, keys, signal), (v) => v.length).then((v) => addDois(id, v)))
    }

    // Crossref deposited references
    if (want.reference) {
        if (crossrefRefs === undefined) {
            skip('crossref:references', ids.doi ? 'error' : 'no_identifier', ids.doi ? 'seed record unavailable' : undefined)
        } else {
            const refs = crossrefRefs.slice(0, DOI_LIST_CAP * 2)
            const titled: AcademicPaper[] = []
            const dois: string[] = []
            for (const r of refs) {
                const d = cleanDoi(r.DOI)
                if (d) dois.push(d)
                else {
                    const p = referenceToPaper(r)
                    if (p) titled.push(p)
                }
            }
            statuses.push({
                source: 'crossref:references',
                status: 'ok',
                count: crossrefRefs.length,
                ms: 0,
                ...(crossrefRefs.length === 0 ? { note: 'publisher deposited no open reference list' } : {}),
            })
            addDois('crossref:references', dois.slice(0, DOI_LIST_CAP))
            // Titled references without DOI rank after the DOI ones.
            addPapers('crossref:references', titled)
        }
    }

    await Promise.all(phase2)
    assertAcademicNotAborted(signal)

    // ---- Phase 3: metadata for DOI-only hits
    if (doiRanks.size > 0) {
        const byDoi = new Map<string, AcademicPaper>()
        for (const p of collected) {
            const d = cleanDoi(p.doi)
            if (d && !byDoi.has(d)) byDoi.set(d, p)
        }
        const missing: Array<{ doi: string; best: number }> = []
        for (const [d, ranks] of Array.from(doiRanks.entries())) {
            const known = byDoi.get(d)
            if (known) {
                // Already have metadata from S2 / OpenAlex: carry the extra list ranks over.
                collected.push({ ...known, ranks: { ...ranks } })
            } else {
                missing.push({ doi: d, best: Math.min(...Object.values(ranks)) })
            }
        }
        missing.sort((a, b) => a.best - b.best)
        const batch = missing.slice(0, CROSSREF_BATCH_MAX).map((m) => m.doi)
        if (batch.length) {
            const papers = await run({ id: 'crossref:metadata' }, () => crossrefByDois(batch, keys, signal), (v) => v.length)
            for (const p of papers || []) {
                const d = cleanDoi(p.doi)
                const ranks = d ? doiRanks.get(d) : undefined
                if (ranks) collected.push({ ...p, ranks: { ...ranks } })
            }
        }
        assertAcademicNotAborted(signal)
    }

    // ---- Merge, drop the seed, rank
    const seedMatch = { doi: ids.doi, openAlexId: ids.openAlexId, s2Id: ids.s2Id, titleKey: seed ? normalizeTitleKey(seed.title) : undefined }
    // Retracted works / retraction notices are not related-work evidence (kept, last, only when `focus` asks for them).
    const merged = applyRetractionPolicy(
        mergeAcademicPapers(collected).filter((p) => !isSameWork(p, seedMatch)),
        { wantsRetracted: queryWantsRetracted(focus) }
    )
    const ranked = rankRelatedPapers(dropUnrelatedSimilar(merged, seed, focus), sortBy, focus)
    const selected = direction === 'all' && sortBy === 'relevance' ? balanceByRelation(ranked, limit) : ranked.slice(0, limit)

    const oaPool = selected.filter((p) => !p.pdfUrl && cleanDoi(p.doi)).slice(0, UNPAYWALL_MAX)
    if (oaPool.length) {
        await mapWithConcurrency(oaPool, 3, async (p) => {
            const url = await resolveOaPdfViaUnpaywall(p.doi as string, keys.contactEmail, signal, useCache)
            if (url) {
                p.pdfUrl = url
                p.isOpenAccess = true
            }
        })
        assertAcademicNotAborted(signal)
    }

    const papers: RelatedPaper[] = selected.map((p) => {
        const relations = Array.from(new Set(Object.keys(p.ranks || {}).map(relationOf).filter((r): r is RelationKind => Boolean(r))))
        const copy: RelatedPaper = { ...p, title: prettifyCaps(p.title), abstract: p.abstract ? truncateAtWord(p.abstract, ABSTRACT_KEEP) : undefined, relations }
        delete copy.ranks
        return copy
    })

    // ---- Status, notes
    const linkStatuses = statuses.filter((s) => relationOf(s.source))
    const attempted = linkStatuses.filter((s) => s.status !== 'skipped')
    const failed = attempted.filter((s) => s.status === 'failed')
    const seedFailed = !seed
    const allSourcesFailed = attempted.length > 0 ? failed.length === attempted.length : seedFailed
    const missingKeys: string[] = []
    const rateLimited = (s: GraphSourceStatus) => s.status === 'failed' && (s.reason === 'rate_limited' || s.reason === 'cooldown')
    const notes: string[] = []
    if (!keys.semanticScholarKey && statuses.some((s) => s.source.startsWith('s2:') && rateLimited(s))) {
        missingKeys.push('SEMANTIC_SCHOLAR_API_KEY')
        notes.push('Semantic Scholar was rate-limited (no API key configured), so its citations / references / recommendations are missing.')
    }
    if (!keys.openAlexKey && statuses.some((s) => s.source === 'openalex:cited_by' && rateLimited(s))) {
        missingKeys.push('OPENALEX_API_KEY')
        notes.push('OpenAlex "cited by" lists need an API key (none configured); citing works come only from the other sources.')
    }
    if (allSourcesFailed) {
        notes.unshift(
            'Citation-graph lookup unavailable — every source failed. This is NOT evidence that the paper has no citations or references; tell the user the lookup was temporarily unavailable.'
        )
    } else if (failed.length) {
        notes.push(`Partial coverage (${failed.map((s) => `${s.source}: ${s.reason || 'error'}`).join(', ')}).`)
    }
    if (!allSourcesFailed && papers.length === 0) notes.push('The sources that responded listed no related works for this paper.')

    const result: RelatedPapersResult = {
        ok: !allSourcesFailed || papers.length > 0,
        seed: seed ? { ...seed, title: prettifyCaps(seed.title), abstract: seed.abstract ? truncateAtWord(seed.abstract, ABSTRACT_KEEP) : undefined, ranks: undefined } : undefined,
        seedKey,
        papers,
        sources: statuses,
        notice: notes.length ? notes.join(' ') : undefined,
        degraded: failed.length > 0 || undefined,
        allSourcesFailed: allSourcesFailed || undefined,
        missingKeys: missingKeys.length ? missingKeys : undefined,
    }
    if (allSourcesFailed && papers.length === 0) result.error = result.notice

    console.info('[academic] related', {
        statuses: statuses.map((s) => `${s.source}:${s.status}${s.reason ? `:${s.reason}` : ''}:${s.count}${s.keyed ? ':key' : ''}`),
        total: papers.length,
    })

    if (useCache && !allSourcesFailed && (papers.length > 0 || seed)) {
        await academicCachePut('related', cacheParts, result, failed.length > 0 ? ACADEMIC_PARTIAL_TTL_S : ACADEMIC_GRAPH_TTL_S)
    }
    return result
}

// ---------------------------------------------------------------------------
// Model payload + citations
// ---------------------------------------------------------------------------

export function formatGraphStatusLine(sources: GraphSourceStatus[]): string {
    return sources
        .map((s) => {
            if (s.status === 'ok') return `${s.source} ok(${s.count}${s.note ? `; ${s.note}` : ''})`
            if (s.status === 'skipped' && s.note) return `${s.source} skipped(${s.note})`
            return `${s.source} ${s.status}(${s.reason || 'error'}${s.httpStatus ? ` ${s.httpStatus}` : ''}${s.note ? `; ${s.note}` : ''})`
        })
        .join(' · ')
}

const RELATION_TEXT: Record<RelationKind, string> = { citing: 'citing', reference: 'reference', similar: 'similar' }

export const RELATED_CITE_INSTRUCTION =
    'rel: citing = cites the seed paper · reference = in the seed paper’s bibliography · similar = recommended as related. Cite only these works, by their [P#] id, with exactly the metadata shown. Never invent papers, authors, years or DOIs.'

function describeSeed(found: AcademicPaper | undefined, ref: PaperRef): string {
    // A seed that is already a source this turn is described exactly as its card.
    const c = ref.citation
    const seed: AcademicPaper | undefined = c
        ? { id: c.url, title: c.title, authors: c.authors?.length ? c.authors : found?.authors || [], year: c.year ?? found?.year, citationCount: 0, source: 'Crossref' }
        : found
    if (!seed) return ref.title ? `"${truncateAtWord(ref.title, 140)}"` : ref.doi ? `doi:${ref.doi}` : ref.raw
    const author = seed.authors[0] ? `${seed.authors[0].split(/\s+/).slice(-1)[0]}${seed.authors.length > 1 ? ' et al.' : ''} ` : ''
    return `${author}(${seed.year || 'n.d.'}) "${truncateAtWord(seed.title, 140)}"`
}

/**
 * Model payload + UI citations for related_papers. New works get local ids
 * `[P1]…` (the seed first when it is not yet a source this turn); works that
 * are already sources this turn keep their id via `[P@n]` (no duplicate card).
 */
export function buildRelatedToolOutput(
    result: RelatedPapersResult,
    ref: PaperRef,
    turnCitations: AiCitation[] | undefined,
    maxChars = 4_000
): { text: string; citations: AiCitation[] } {
    const counts: Record<RelationKind, number> = { citing: 0, reference: 0, similar: 0 }
    for (const p of result.papers) for (const r of p.relations) counts[r] += 1
    const seedExisting = ref.existingId ?? (result.seed ? matchTurnCitation(result.seed, turnCitations)?.id : undefined)
    const newSeed = seedExisting === undefined && result.seed ? result.seed : undefined

    const header: string[] = []
    const n = result.papers.length
    const seedLabel = seedExisting !== undefined ? `${existingMarker(seedExisting)} ` : newSeed ? '[P1] ' : ''
    header.push(
        `RELATED PAPERS for ${seedLabel}${describeSeed(result.seed, ref)} — ${n} work${n === 1 ? '' : 's'} (${counts.citing} citing, ${counts.reference} references, ${counts.similar} similar)`
    )
    if (result.sources.length) header.push(`Sources: ${formatGraphStatusLine(result.sources)}`)
    if (result.notice) header.push(`NOTE: ${truncateAtWord(result.notice, 600)}`)
    header.push(n > 0 ? RELATED_CITE_INSTRUCTION : 'No related works were returned by the sources that responded.')
    const head = header.join('\n')

    type Row = { paper: AcademicPaper; existing?: number; relations?: RelationKind[]; seed?: boolean }
    const rows: Row[] = []
    if (newSeed) rows.push({ paper: newSeed, seed: true })
    for (const p of result.papers) rows.push({ paper: p, existing: matchTurnCitation(p, turnCitations)?.id, relations: p.relations })

    const render = (abstractChars: number, keep: number) => {
        let local = 0
        const fresh: AcademicPaper[] = []
        const lines = rows.slice(0, keep).map((row) => {
            let line: string
            if (row.existing !== undefined) {
                line = formatPaperLine(row.paper, 0, abstractChars).replace(/^\[P1\]/, existingMarker(row.existing))
            } else {
                line = formatPaperLine(row.paper, local, abstractChars)
                local += 1
                fresh.push(row.paper)
            }
            if (row.seed) return `SEED ${line}`
            const rel = (row.relations || []).map((r) => RELATION_TEXT[r]).join('+')
            return rel ? `${line} rel:${rel}.` : line
        })
        return { text: lines.length ? `${head}\n${lines.join('\n')}` : head, fresh }
    }
    for (const abstractChars of [220, 140, 80, 0]) {
        const out = render(abstractChars, rows.length)
        if (out.text.length <= maxChars) return { text: out.text, citations: academicResultsToCitations(out.fresh) }
    }
    for (let keep = rows.length - 1; keep >= 1; keep--) {
        const out = render(0, keep)
        const omitted = rows.length - keep
        const text = `${out.text}\n(${omitted} lower-ranked work${omitted === 1 ? '' : 's'} omitted for length)`
        if (text.length <= maxChars) return { text, citations: academicResultsToCitations(out.fresh) }
    }
    return { text: truncateAtWord(head, maxChars - 1), citations: [] }
}
