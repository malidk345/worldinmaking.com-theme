/**
 * Academic citation plumbing (0 LLM tokens):
 *   - papers / encyclopedia entries → UI citation objects (ids match [P#])
 *   - per-turn renumbering so [P#] / [Source N] labels in tool results match the
 *     global citation ids chat.ts assigns (index in state.citations + 1)
 *   - deterministic post-answer verification of cited markers / DOIs / titles
 */

import type { AiCitation, AiCitationVerification } from '../ai/contracts'
import { extractCitationIds, splitCodeSegments } from '../ai/citation-markers'
import { cleanDoi, foldText } from './academic-common'
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
        if (p.authors?.length) citation.authors = p.authors.slice(0, 6)
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

/**
 * Shifts a tool's local citation ids (1..n) by `offset` and rewrites the labels
 * the model sees so they match: `[P3]` for search_academic_corpus and
 * `[Source 3 - …]` for web_search. Other tools only get their ids shifted.
 */
export function renumberToolCitations(
    toolName: string,
    result: string,
    citations: AiCitation[] | undefined,
    offset: number
): { result: string; citations: AiCitation[] | undefined } {
    if (!citations?.length || offset <= 0) return { result, citations }
    const shifted = citations.map((c) => ({ ...c, id: c.id + offset }))
    let text = result
    if (toolName === 'search_academic_corpus') {
        text = text.replace(/\[P(\d{1,3})\]/g, (_m, n: string) => `[P${Number(n) + offset}]`)
    } else if (toolName === 'web_search') {
        text = text.replace(/\[Source (\d{1,3}) - /g, (_m, n: string) => `[Source ${Number(n) + offset} - `)
    }
    return { result: text, citations: shifted }
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
