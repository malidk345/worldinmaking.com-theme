/**
 * Academic citation plumbing (0 LLM tokens):
 *   - papers / encyclopedia entries → UI citation objects (ids match [P#])
 *   - per-turn renumbering so [P#] / [Source N] labels in tool results match the
 *     global citation ids chat.ts assigns (index in state.citations + 1)
 *   - deterministic post-answer verification of cited markers / DOIs / titles
 */

import type { AiCitation, AiCitationVerification } from '../ai/contracts'
import { extractCitationIds, splitCodeSegments } from '../ai/citation-markers'
import { NON_LETTER_DIGIT_RE, cleanDoi, foldText } from './academic-common'
import type { AcademicPaper, DoiLookup } from './academic-search'
import { ENCYCLOPEDIA_NAMES, type EncyclopediaEntry } from './academic-encyclopedia'

function clip(text: string, max: number): string {
    const clean = String(text || '').replace(/\s+/g, ' ').trim()
    return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean
}

/** Citation objects for the UI — id N matches [PN] in the model payload (papers first, then encyclopedia). */
export function academicResultsToCitations(papers: AcademicPaper[], encyclopedia: EncyclopediaEntry[] = []): AiCitation[] {
    const out: AiCitation[] = papers.map((p, idx) => {
        const doi = cleanDoi(p.doi)
        let url = (doi ? `https://doi.org/${doi}` : '') || p.pdfUrl || p.url || (p.id.startsWith('http') ? p.id : '')
        if (!url || p.id.startsWith('canon-')) url = `https://scholar.google.com/scholar?q=${encodeURIComponent(p.title)}`
        const pdf = p.pdfUrl && /\.pdf(\?|$)|\/pdf\b|pdf=render/i.test(p.pdfUrl) ? p.pdfUrl : undefined
        const citation: AiCitation = {
            id: idx + 1,
            kind: p.source === 'Web Search' ? 'web' : 'paper',
            title: p.title,
            url,
            snippet: p.abstract ? clip(p.abstract, 200) : clip(p.title, 120),
            source: p.venue || p.source,
        }
        // Full APA list (≤ 20, or first 19 + last with the real count) so "Copy APA" is complete.
        if (p.authors?.length) citation.authors = p.authors.slice(0, 20)
        if (p.authorCount && p.authorCount > (citation.authors?.length || 0)) citation.authorCount = p.authorCount
        if (p.retracted) citation.retracted = true
        if (p.year) citation.year = p.year
        if (p.venue) citation.venue = p.venue
        if (p.citationCount > 0) citation.citationCount = p.citationCount
        if (doi) citation.doi = doi
        if (pdf) citation.pdfUrl = pdf
        if (p.pdfUrl && !pdf) citation.oaUrl = p.pdfUrl
        else if (p.isOpenAccess && !pdf && p.url) citation.oaUrl = p.url
        return citation
    })
    encyclopedia.forEach((e, i) => {
        const citation: AiCitation = {
            id: papers.length + i + 1,
            kind: 'encyclopedia',
            title: e.title,
            url: e.url,
            snippet: e.excerpt ? clip(e.excerpt, 300) : ENCYCLOPEDIA_NAMES[e.source],
            source: e.source,
            venue: ENCYCLOPEDIA_NAMES[e.source],
            oaUrl: e.url,
        }
        if (e.authors?.length) citation.authors = e.authors
        out.push(citation)
    })
    return out
}

/** Tools whose model payload labels papers `[P#]` (renumbered per turn). */
export const ACADEMIC_MARKER_TOOLS = new Set(['search_academic_corpus', 'related_papers', 'find_quotes'])

/**
 * `[P@7]` = a reference to an EXISTING turn-global citation (id 7) inside a tool
 * payload. Unlike local `[P#]` labels it is never shifted; renumbering turns it
 * into plain `[P7]`.
 */
export const EXISTING_MARKER_RE = /\[P@(\d{1,3})\]/g

export function existingMarker(id: number): string {
    return `[P@${id}]`
}

/**
 * Legacy pure shift (no dedupe) — the pipeline now uses `mergeToolCitations`.
 * Shifts a tool's local citation ids (1..n) by `offset` and rewrites the labels
 * the model sees so they match: `[P3]` for the academic tools and
 * `[Source 3 - …]` for web_search. Other tools only get their ids shifted.
 * Academic `[P@n]` markers (existing citations) become `[Pn]` unshifted.
 */
export function renumberToolCitations(
    toolName: string,
    result: string,
    citations: AiCitation[] | undefined,
    offset: number
): { result: string; citations: AiCitation[] | undefined } {
    const academic = ACADEMIC_MARKER_TOOLS.has(toolName)
    const finalize = (text: string) => (academic ? text.replace(EXISTING_MARKER_RE, (_m, n: string) => `[P${Number(n)}]`) : text)
    if (!citations?.length || offset <= 0) return { result: finalize(result), citations }
    const shifted = citations.map((c) => ({ ...c, id: c.id + offset }))
    let text = result
    if (academic) {
        text = text.replace(/\[P(\d{1,3})\]/g, (_m, n: string) => `[P${Number(n) + offset}]`)
    } else if (toolName === 'web_search') {
        text = text.replace(/\[Source (\d{1,3}) - /g, (_m, n: string) => `[Source ${Number(n) + offset} - `)
    }
    return { result: finalize(text), citations: shifted }
}

/** Comparable URL: no scheme / `www.` / hash / trailing slash; host lowercased. */
export function normalizeCitationUrl(url: string | undefined): string {
    const raw = String(url || '').trim()
    if (!raw) return ''
    try {
        const u = new URL(raw)
        const path = u.pathname.replace(/\/+$/, '')
        return `${u.hostname.toLowerCase().replace(/^www\./, '')}${path}${u.search}`
    } catch {
        return raw.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/#.*$/, '').replace(/\/+$/, '').toLowerCase()
    }
}

const isAcademicKind = (c: Pick<AiCitation, 'kind'>) => c.kind === 'paper' || c.kind === 'encyclopedia'

/** Existing turn citation that is the same source as `incoming` (academic: DOI / title / URL; web: URL). */
function findSameCitation(incoming: AiCitation, pool: AiCitation[]): AiCitation | undefined {
    if (isAcademicKind(incoming)) {
        const hit = matchTurnCitation(incoming, pool)
        if (hit) return hit
        const url = normalizeCitationUrl(incoming.url)
        const incomingDoi = cleanDoi(incoming.doi) || cleanDoi(incoming.url)
        if (!url) return undefined
        return pool.find((c) => {
            if (!isAcademicKind(c) || c.verified === false) return false
            const cDoi = cleanDoi(c.doi) || cleanDoi(c.url)
            if (incomingDoi && cDoi && cDoi !== incomingDoi) return false
            return normalizeCitationUrl(c.url) === url
        })
    }
    if (incoming.kind === 'web') {
        const url = normalizeCitationUrl(incoming.url)
        return url ? pool.find((c) => c.kind === 'web' && normalizeCitationUrl(c.url) === url) : undefined
    }
    return undefined
}

export interface MergedToolCitations {
    /** Tool result with labels rewritten to turn-global ids (never contains `[P@n]` for academic tools). */
    result: string
    /** Only the citations that are NEW this turn (ids continue after `turnCitations.length`). */
    citations: AiCitation[]
    /** Local tool id → turn-global id. */
    idMap: Map<number, number>
}

/**
 * Merges one tool execution into the turn's citation list (0 LLM tokens):
 *   - a local citation that is the same source as an existing turn citation
 *     reuses that id (no duplicate card: repeated / cached searches, SEP entry
 *     returned by two searches, sub-agent results);
 *   - other local citations get the next contiguous global ids (chat.ts assigns
 *     id = index + 1, so the returned list must be appended as-is);
 *   - academic payload labels `[Pk]` → `[P<global>]`, `[P@n]` → `[Pn]` ALWAYS
 *     (also when the tool returned no citations), web `[Source k - ` likewise.
 */
export function mergeToolCitations(
    toolName: string,
    result: string,
    citations: AiCitation[] | undefined,
    turnCitations: AiCitation[]
): MergedToolCitations {
    const academic = ACADEMIC_MARKER_TOOLS.has(toolName)
    const dedupe = academic || toolName === 'web_search'
    const offset = turnCitations.length
    const idMap = new Map<number, number>()
    const fresh: AiCitation[] = []
    for (const c of citations || []) {
        const same = dedupe ? findSameCitation(c, [...turnCitations, ...fresh]) : undefined
        if (same) {
            idMap.set(c.id, same.id)
            continue
        }
        const id = offset + fresh.length + 1
        idMap.set(c.id, id)
        fresh.push({ ...c, id })
    }
    let text = String(result ?? '')
    if (academic) {
        text = text.replace(/\[P(@?)(\d{1,3})\]/g, (_m, at: string, n: string) => {
            const k = Number(n)
            if (at) return `[P${k}]`
            return `[P${idMap.get(k) ?? k + offset}]`
        })
    } else if (toolName === 'web_search') {
        text = text.replace(/\[Source (\d{1,3}) - /g, (_m, n: string) => `[Source ${idMap.get(Number(n)) ?? Number(n) + offset} - `)
    }
    return { result: text, citations: fresh, idMap }
}

function citationTitleKey(title: string): string {
    const key = foldText(title).replace(NON_LETTER_DIGIT_RE, '')
    return key.length >= 12 ? key : ''
}

/**
 * The turn-global citation that describes the same work (DOI match, else the
 * same Unicode-folded title), so later tools reuse its [P#] instead of adding a
 * duplicate source.
 */
export function matchTurnCitation(
    work: { doi?: string; title?: string; url?: string },
    turnCitations: AiCitation[] | undefined
): AiCitation | undefined {
    if (!turnCitations?.length) return undefined
    const academic = turnCitations.filter((c) => c.kind === 'paper' || c.kind === 'encyclopedia')
    const doi = cleanDoi(work.doi) || cleanDoi(work.url)
    if (doi) {
        const hit = academic.find((c) => (cleanDoi(c.doi) || cleanDoi(c.url)) === doi)
        if (hit) return hit
    }
    const key = citationTitleKey(work.title || '')
    if (!key) return undefined
    return academic.find((c) => {
        if (c.verified === false) return false
        const cDoi = cleanDoi(c.doi) || cleanDoi(c.url)
        if (doi && cDoi && cDoi !== doi) return false
        return citationTitleKey(c.title) === key
    })
}

const DOI_IN_TEXT_RE = /\b10\.\d{4,9}\/[^\s"'<>()[\]{}]+/g

/** DOIs mentioned in the answer prose (code excluded), lowercased, trailing punctuation trimmed. */
export function extractDois(text: string): string[] {
    const found = new Set<string>()
    for (const seg of splitCodeSegments(text)) {
        if (seg.code) continue
        for (const m of seg.text.match(DOI_IN_TEXT_RE) || []) {
            const doi = cleanDoi(m.replace(/[.,;:!?*_]+$/, ''))
            if (doi) found.add(doi)
        }
    }
    return Array.from(found)
}

function titleKey(title: string): string {
    return foldText(title).replace(/[^a-z0-9]+/g, ' ').trim()
}

export interface VerifyCitationsOptions {
    lookupDoi: (doi: string) => Promise<DoiLookup>
    maxLookups?: number
}

export interface VerifyCitationsResult {
    citations: AiCitation[]
    verification?: AiCitationVerification
    changed: boolean
}

/**
 * Deterministic citation check after the final answer (never rewrites the answer).
 * Only runs when the turn produced academic sources (paper / encyclopedia).
 *  - [P#] / [n] markers → the matching source is `verified: true`; markers pointing
 *    at no source are reported in `verification.unknownMarkers`.
 *  - DOIs in the answer → matched against this turn's sources; unknown DOIs are
 *    checked via Crossref /works/{doi} and appended as extra citations with
 *    `verified: true` (exists) or `verified: false` (not found).
 *  - Titles of academic sources quoted verbatim in the answer count as cited.
 */
export async function verifyAnswerCitations(
    reply: string,
    citations: AiCitation[],
    options: VerifyCitationsOptions
): Promise<VerifyCitationsResult> {
    const academic = citations.some((c) => c.kind === 'paper' || c.kind === 'encyclopedia')
    if (!academic || !reply) return { citations, changed: false }

    const next = citations.map((c) => ({ ...c }))
    const byId = new Map(next.map((c) => [c.id, c]))
    const cited = new Set<number>()
    const unknownMarkers: string[] = []

    for (const id of extractCitationIds(reply)) {
        const c = byId.get(id)
        if (c) cited.add(id)
        else unknownMarkers.push(`[${id}]`)
    }

    const folded = ` ${titleKey(reply)} `
    for (const c of next) {
        if (cited.has(c.id) || !(c.kind === 'paper' || c.kind === 'encyclopedia')) continue
        const key = titleKey(c.title)
        if (key.split(' ').length >= 4 && folded.includes(` ${key} `)) cited.add(c.id)
    }

    const knownDois = new Map<string, AiCitation>()
    for (const c of next) {
        const doi = cleanDoi(c.doi) || cleanDoi(c.url)
        if (doi) knownDois.set(doi, c)
    }
    const unknownDois: string[] = []
    for (const doi of extractDois(reply)) {
        const c = knownDois.get(doi)
        if (c) cited.add(c.id)
        else unknownDois.push(doi)
    }

    for (const id of Array.from(cited)) {
        const c = byId.get(id)
        if (c) c.verified = true
    }

    let unverifiedDois = 0
    let verifiedExtra = 0
    const lookups = unknownDois.slice(0, options.maxLookups ?? 5)
    if (lookups.length > 0) {
        const results = await Promise.all(
            lookups.map(async (doi) => {
                try {
                    return await options.lookupDoi(doi)
                } catch {
                    return { doi, found: false, transient: true } as DoiLookup
                }
            })
        )
        let nextId = next.reduce((max, c) => Math.max(max, c.id), 0)
        for (const r of results) {
            if (r.transient) continue
            nextId += 1
            if (r.found) {
                verifiedExtra += 1
                next.push({
                    id: nextId,
                    kind: 'paper',
                    title: r.title || `DOI ${r.doi}`,
                    url: `https://doi.org/${r.doi}`,
                    snippet: 'Cited in the answer; DOI confirmed via Crossref (not among this turn’s search results).',
                    source: 'Crossref',
                    ...(r.authors?.length ? { authors: r.authors } : {}),
                    ...(r.year ? { year: r.year } : {}),
                    ...(r.venue ? { venue: r.venue } : {}),
                    ...(r.authorCount ? { authorCount: r.authorCount } : {}),
                    ...(r.retracted ? { retracted: true } : {}),
                    doi: r.doi,
                    verified: true,
                })
            } else {
                unverifiedDois += 1
                next.push({
                    id: nextId,
                    kind: 'paper',
                    title: `DOI ${r.doi}`,
                    url: `https://doi.org/${r.doi}`,
                    snippet: 'Cited in the answer but not found in Crossref or in this turn’s sources.',
                    source: 'Unverified',
                    doi: r.doi,
                    verified: false,
                })
            }
        }
    }

    const verification: AiCitationVerification = {
        checked: cited.size + unknownMarkers.length + lookups.length,
        verified: cited.size + verifiedExtra,
        unverified: unknownMarkers.length + unverifiedDois,
    }
    if (unknownMarkers.length) verification.unknownMarkers = unknownMarkers.slice(0, 20)
    const changed = cited.size > 0 || next.length !== citations.length || unknownMarkers.length > 0
    return { citations: next, verification, changed }
}

/**
 * Runs `task` with its own AbortSignal (linked to `parent`) and gives up after
 * `ms`: resolves `undefined` AND aborts the signal, so in-flight work (e.g.
 * Crossref DOI lookups in the post-answer check) stops instead of running on
 * after the budget. Rejects only when `task` rejects before the deadline.
 */
export function runWithAbortBudget<T>(task: (signal: AbortSignal) => Promise<T>, ms: number, parent?: AbortSignal): Promise<T | undefined> {
    const controller = new AbortController()
    const onParentAbort = () => controller.abort()
    if (parent?.aborted) controller.abort()
    else parent?.addEventListener('abort', onParentAbort, { once: true })
    return new Promise<T | undefined>((resolve, reject) => {
        let settled = false
        const finish = () => {
            settled = true
            clearTimeout(timer)
            parent?.removeEventListener('abort', onParentAbort)
        }
        const timer = setTimeout(() => {
            if (settled) return
            finish()
            controller.abort()
            resolve(undefined)
        }, ms)
        let running: Promise<T>
        try {
            running = task(controller.signal)
        } catch (err) {
            finish()
            reject(err)
            return
        }
        running.then(
            (value) => {
                if (settled) return
                finish()
                resolve(value)
            },
            (err) => {
                if (settled) return
                finish()
                reject(err)
            }
        )
    })
}
