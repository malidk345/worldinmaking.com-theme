/**
 * Earlier-turn citations carried into the next request so follow-ups like
 * "tell me more about P3" or related_papers("P3") still resolve after the turn that
 * produced [P3]. Client-safe (built in the chat UI, sanitized again on the server).
 * Token-cheap by design: at most PRIOR_CITATIONS_MAX entries, short fields, no snippets.
 */
import type { AiCitation, AiCitationKind } from './contracts'

export const PRIOR_CITATIONS_MAX = 20
const TITLE_MAX = 160
const AUTHOR_MAX = 60
const URL_MAX = 300
export const PRIOR_CITATIONS_CONTEXT_MAX = 3000

/** Compact wire shape (what the chat sends). */
export type PriorCitation = {
    id: number
    title: string
    author?: string
    year?: number
    doi?: string
    url?: string
    kind?: AiCitationKind
    /** 1 = the previous reply, 2 = the one before, … */
    turnsAgo?: number
}

type CitationSource = Pick<AiCitation, 'id' | 'title' | 'url'> & Partial<Pick<AiCitation, 'authors' | 'year' | 'doi' | 'kind'>>

function clip(value: unknown, max: number): string {
    return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
}

function bareDoi(value: unknown): string {
    const stripped = String(value || '').trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '')
    return /^10\.\d{4,9}\/\S+$/.test(stripped) ? stripped.slice(0, 200) : ''
}

/**
 * Most recent replies first. An id already taken by a more recent reply is not reused
 * (the user's "P3" means the latest P3); the same work cited in two replies appears once.
 */
export function buildPriorCitations(
    messages: Array<{ role: string; citations?: CitationSource[] }>,
    max = PRIOR_CITATIONS_MAX
): PriorCitation[] {
    const out: PriorCitation[] = []
    const ids = new Set<number>()
    const works = new Set<string>()
    let turnsAgo = 0
    for (let i = messages.length - 1; i >= 0 && out.length < max; i -= 1) {
        const message = messages[i]
        if (message.role !== 'assistant') continue
        turnsAgo += 1
        for (const c of message.citations || []) {
            if (out.length >= max) break
            if (!c || !Number.isInteger(c.id) || c.id <= 0 || ids.has(c.id)) continue
            const doi = bareDoi(c.doi) || bareDoi(c.url)
            const title = clip(c.title, TITLE_MAX)
            const work = doi ? `doi:${doi.toLowerCase()}` : `${title.toLowerCase()}|${clip(c.url, URL_MAX).toLowerCase()}`
            if (!title || works.has(work)) continue
            ids.add(c.id)
            works.add(work)
            const author = clip(c.authors?.[0], AUTHOR_MAX)
            out.push({
                id: c.id,
                title,
                ...(author ? { author } : {}),
                ...(typeof c.year === 'number' && c.year > 0 ? { year: c.year } : {}),
                ...(doi ? { doi } : c.url ? { url: clip(c.url, URL_MAX) } : {}),
                ...(c.kind ? { kind: c.kind } : {}),
                turnsAgo,
            })
        }
    }
    return out
}

const KINDS = new Set<AiCitationKind>(['paper', 'encyclopedia', 'web'])

/** Server-side: validate the untrusted wire list into AiCitation objects (no snippets). */
export function parsePriorCitations(raw: unknown): AiCitation[] {
    if (!Array.isArray(raw)) return []
    const out: AiCitation[] = []
    const ids = new Set<number>()
    for (const item of raw.slice(0, PRIOR_CITATIONS_MAX)) {
        if (!item || typeof item !== 'object') continue
        const o = item as Record<string, unknown>
        const id = Number(o.id)
        const title = clip(o.title, TITLE_MAX)
        if (!Number.isInteger(id) || id <= 0 || id > 999 || ids.has(id) || !title) continue
        const doi = bareDoi(o.doi)
        const url = /^https?:\/\//i.test(String(o.url || '')) ? clip(o.url, URL_MAX) : ''
        const author = clip(o.author, AUTHOR_MAX)
        const year = Number(o.year)
        const kind = KINDS.has(o.kind as AiCitationKind) ? (o.kind as AiCitationKind) : undefined
        ids.add(id)
        out.push({
            id,
            title,
            url: url || (doi ? `https://doi.org/${doi}` : ''),
            snippet: '',
            ...(author ? { authors: [author] } : {}),
            ...(Number.isInteger(year) && year > 0 && year < 3000 ? { year } : {}),
            ...(doi ? { doi } : {}),
            ...(kind ? { kind } : {}),
        })
    }
    return out
}

/** One short line per earlier source for the model context (capped). */
export function formatPriorCitationsContext(citations: AiCitation[]): string {
    if (!citations.length) return ''
    const lines: string[] = []
    let used = 0
    for (const c of citations) {
        const who = c.authors?.[0] ? ` — ${c.authors[0]}${c.year ? ` (${c.year})` : ''}` : c.year ? ` (${c.year})` : ''
        const where = c.doi ? ` doi:${c.doi}` : c.url ? ` ${c.url}` : ''
        const line = `- [P${c.id}] ${c.title}${who}${where}`
        if (used + line.length > PRIOR_CITATIONS_CONTEXT_MAX) break
        lines.push(line)
        used += line.length + 1
    }
    return [
        'Sources cited in earlier replies of this conversation (reference data, not the task). A [P#] the user mentions refers to this list unless this turn has its own [P#]. research tools (related_papers, find_quotes, annotated_bibliography) accept these [P#] ids. When you rely on one again in the answer, name the work (author, year) or search it again so it becomes a source of this turn — do not present these [P#] as this turn\'s sources.',
        ...lines,
    ].join('\n')
}
