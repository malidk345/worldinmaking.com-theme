/**
 * Philosophy encyclopedia lookup (step 2): Stanford Encyclopedia of Philosophy
 * and Internet Encyclopedia of Philosophy.
 *
 * Returns only title + URL + a short (≤ 300 char) search excerpt per entry.
 * We never fetch, store or re-serve full entry text. Entries are reference
 * works, not papers — callers must label them as such.
 */

import {
    AcademicSourceError,
    fetchAcademic,
    foldText,
    readJson,
    readText,
    stripTags,
    truncateAtWord,
    userAgent,
} from './academic-common'

export const ENCYCLOPEDIA_EXCERPT_MAX = 300
const ENCYCLOPEDIA_TIMEOUT_MS = 6_000

export type EncyclopediaSourceLabel = 'SEP' | 'IEP'

export interface EncyclopediaEntry {
    id: string
    source: EncyclopediaSourceLabel
    title: string
    url: string
    /** ≤ 300 chars, from the search snippet / WP excerpt only. */
    excerpt?: string
    authors?: string[]
}

export const ENCYCLOPEDIA_NAMES: Record<EncyclopediaSourceLabel, string> = {
    SEP: 'Stanford Encyclopedia of Philosophy',
    IEP: 'Internet Encyclopedia of Philosophy',
}

function excerpt(text: string): string | undefined {
    const clean = stripTags(text)
        .replace(/\s*Continue reading\b.*$/i, '')
        .replace(/\s*\.\.\.\s*/g, ' … ')
        .replace(/\s+/g, ' ')
        .trim()
    return clean ? truncateAtWord(clean, ENCYCLOPEDIA_EXCERPT_MAX) : undefined
}

export function buildSepSearchUrl(query: string): string {
    return `https://plato.stanford.edu/search/searcher.py?query=${encodeURIComponent(query.replace(/\s+/g, ' ').trim())}`
}

/** Parses SEP searcher.py HTML result listings (title, canonical entry URL, snippet, authors). */
export function parseSepResults(html: string, limit: number): EncyclopediaEntry[] {
    const out: EncyclopediaEntry[] = []
    const blocks = String(html || '').split('<div class="result_listing">').slice(1)
    for (const block of blocks) {
        const titleHtml = block.match(/<div class="result_title">([\s\S]*?)<\/div>/)?.[1] || ''
        const snippetHtml = block.match(/<div class="result_snippet">([\s\S]*?)<\/div><!-- end result_snippet -->/)?.[1] || ''
        const authorHtml = block.match(/<div class="result_author">([\s\S]*?)<\/div>/)?.[1] || ''
        const urlText = block.match(/<div class="result_url">[\s\S]*?<a [^>]*>([^<]+)<\/a>/)?.[1]?.trim() || ''
        const entryPath = block.match(/entry=(\/entries\/[^&"]+)/)?.[1]
        const url = /^https:\/\/plato\.stanford\.edu\/entries\//.test(urlText)
            ? urlText
            : entryPath
              ? `https://plato.stanford.edu${entryPath}`
              : ''
        const title = stripTags(titleHtml)
        if (!title || !url) continue
        const authorText = stripTags(authorHtml)
        out.push({
            id: `sep-${url.replace(/^.*\/entries\//, '').replace(/\/$/, '')}`,
            source: 'SEP',
            title,
            url,
            excerpt: excerpt(snippetHtml),
            authors: authorText
                ? authorText
                      .split(/,\s*(?:and\s+)?|\s+and\s+/)
                      .map((a) => a.trim())
                      .filter(Boolean)
                      .slice(0, 4)
                : undefined,
        })
        if (out.length >= limit) break
    }
    return out
}

export async function searchSep(query: string, limit: number, email: string, signal?: AbortSignal): Promise<EncyclopediaEntry[]> {
    const res = await fetchAcademic(
        buildSepSearchUrl(query),
        { headers: { 'User-Agent': userAgent(email), Accept: 'text/html' } },
        ENCYCLOPEDIA_TIMEOUT_MS,
        signal,
        { cooldownKey: 'sep' }
    )
    const html = await readText(res)
    if (!html.includes('search_results') && !html.includes('result_listing')) throw new AcademicSourceError('parse_error')
    return parseSepResults(html, limit)
}

export function buildIepSearchUrl(query: string, limit: number): string {
    const params = new URLSearchParams()
    params.set('search', query.replace(/\s+/g, ' ').trim())
    // WP search orders by date, not relevance → over-fetch and rank locally.
    params.set('per_page', String(Math.max(1, Math.min(limit, 10))))
    params.set('type', 'post')
    params.set('_fields', 'id,title,url')
    return `https://iep.utm.edu/wp-json/wp/v2/search?${params.toString()}`
}

export async function searchIep(query: string, limit: number, email: string, signal?: AbortSignal): Promise<EncyclopediaEntry[]> {
    const headers = { 'User-Agent': userAgent(email), Accept: 'application/json' }
    type IepRow = { id?: number; title?: string; url?: string }
    const fetchRows = async (text: string): Promise<IepRow[]> => {
        const res = await fetchAcademic(buildIepSearchUrl(text, IEP_FETCH_ROWS), { headers }, ENCYCLOPEDIA_TIMEOUT_MS, signal, { cooldownKey: 'iep' })
        const rows = await readJson<IepRow[]>(res)
        if (!Array.isArray(rows)) throw new AcademicSourceError('parse_error')
        return rows
    }
    let rows = await fetchRows(query)
    // WP search ANDs every word; a long query ("Heidegger Gestell technology") often
    // returns nothing. One retry with the leading significant term (usually the thinker).
    const tokens = encyclopediaTokens(query)
    if (rows.length === 0 && tokens.length >= 2) rows = await fetchRows(tokens[0])
    const ranked = rows
        .filter((r) => r && r.title && typeof r.url === 'string' && r.url.startsWith('https://iep.utm.edu/'))
        .map((r, index) => ({ r, index, score: titleTokenHits(tokens, stripTags(r.title || '')) }))
        .sort((a, b) => b.score - a.score || a.index - b.index)
        .slice(0, limit)
        .map((x) => x.r)
    const entries: EncyclopediaEntry[] = ranked.map((r) => ({
        id: `iep-${r.id ?? r.url}`,
        source: 'IEP' as const,
        title: stripTags(r.title || ''),
        url: r.url as string,
    }))
    const ids = ranked.map((r) => r.id).filter((id): id is number => typeof id === 'number')
    if (ids.length === 0) return entries
    // Excerpt only (`_fields=id,excerpt`): WP's own teaser, never the article body.
    try {
        const exRes = await fetchAcademic(
            `https://iep.utm.edu/wp-json/wp/v2/posts?include=${ids.join(',')}&_fields=id,excerpt`,
            { headers },
            ENCYCLOPEDIA_TIMEOUT_MS,
            signal,
            { cooldownKey: 'iep', noRetry: true }
        )
        const posts = await readJson<Array<{ id?: number; excerpt?: { rendered?: string } }>>(exRes)
        const byId = new Map<string, string>()
        for (const p of Array.isArray(posts) ? posts : []) {
            if (typeof p?.id === 'number' && p.excerpt?.rendered) byId.set(`iep-${p.id}`, p.excerpt.rendered)
        }
        for (const e of entries) {
            const raw = byId.get(e.id)
            if (raw) {
                // WP excerpts start with the title repeated; drop it.
                const text = excerpt(raw) || ''
                e.excerpt = text.startsWith(e.title) ? truncateAtWord(text.slice(e.title.length).trim(), ENCYCLOPEDIA_EXCERPT_MAX) : text
            }
        }
    } catch (err) {
        if (signal?.aborted) throw err
        // Titles + URLs are still useful without excerpts.
    }
    return entries
}

const ENC_STOP = new Set(['the', 'and', 'of', 'in', 'on', 'for', 'a', 'an', 'to', 'philosophy', 'ethics'])
const IEP_FETCH_ROWS = 10

function encyclopediaTokens(query: string): string[] {
    return foldText(query)
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length > 2 && !ENC_STOP.has(t))
}

function titleTokenHits(tokens: string[], title: string): number {
    const folded = foldText(title)
    return tokens.filter((t) => folded.includes(t)).length
}

/** Capitalized query words that aren't sentence-initial function words — thinker/topic names. */
function properNameTokens(query: string): Set<string> {
    const out = new Set<string>()
    for (const word of String(query || '').split(/\s+/)) {
        if (/^[A-ZÇĞİÖŞÜ][a-zçğıöşü]{2,}/.test(word)) {
            for (const t of encyclopediaTokens(word)) out.add(t)
        }
    }
    return out
}

/**
 * Keeps entries whose title (or excerpt, for multi-word queries) shares a meaningful
 * token with the query. A short title naming a capitalized query term ("Martin
 * Heidegger", "Aristotle") also passes — that is the thinker's own entry.
 */
export function filterRelevantEntries(query: string, entries: EncyclopediaEntry[]): EncyclopediaEntry[] {
    const tokens = encyclopediaTokens(query)
    if (tokens.length === 0) return entries
    const names = properNameTokens(query)
    return entries.filter((e) => {
        const title = foldText(e.title)
        const hitsTitle = titleTokenHits(tokens, e.title)
        if (hitsTitle >= Math.min(2, tokens.length)) return true
        const body = foldText(`${e.title} ${e.excerpt || ''}`)
        const hitsAll = tokens.filter((t) => body.includes(t)).length
        if (hitsTitle >= 1 && hitsAll >= Math.min(2, tokens.length)) return true
        const shortTitle = title.split(/[^a-z0-9]+/).filter(Boolean).length <= 3 && !title.includes(':')
        return shortTitle && Array.from(names).some((n) => title.includes(n))
    })
}
