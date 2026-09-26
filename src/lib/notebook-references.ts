/**
 * References of a notebook for BibTeX / RIS export (package E1).
 *
 * Sources: `[^n]: …` footnote definitions (what "Add to notebook" writes) and the
 * lines under a References / Bibliography / Works Cited / Kaynakça / Annotated
 * bibliography heading. Each reference is parsed heuristically (APA 7, MLA 9 and
 * Chicago author-date shapes, which is what this app writes) and, when it has a
 * DOI, optionally enriched from Crossref in the browser (CORS-enabled, keyless).
 * Plain notes without a DOI, URL or author+year+title are skipped — the export
 * carries references, not commentary. Nothing is stored or sent to our servers.
 */
import type { ExportableCitation } from './ai/citation-export'

export type NotebookReference = ExportableCitation & { raw: string }

const REFERENCE_HEADING_RE =
    /^(#{1,6})\s+(?:references|reference list|bibliography|works cited|sources|kaynakça|kaynaklar|kaynakca|annotated bibliography)\b/i
const HEADING_RE = /^(#{1,6})\s+\S/
const FOOTNOTE_DEF_RE = /^\[\^([^\]\s]+)\]:\s*(.*)$/
const DOI_RE = /\b(10\.\d{4,9}\/[^\s"<>]+)/i
const URL_RE = /\bhttps?:\/\/[^\s<>"')\]]+/i
const YEAR_RE = /\b(1[5-9]\d\d|20\d\d)\b/

const squash = (text: string): string => text.replace(/\s+/g, ' ').trim()

/** Markdown inline formatting → plain text ("*Title*" → "Title", "[x](url)" → "x url"). */
function plainText(text: string): string {
    return squash(
        text
            .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
            .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, (_m, label: string, url: string) => (label.includes(url) ? label : `${label} ${url}`))
            .replace(/(\*\*|__)(.+?)\1/g, '$2')
            .replace(/(^|[\s(])[*_]([^*_]+)[*_](?=[\s).,;:!?]|$)/g, '$1$2')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/<[^>]+>/g, '')
            .replace(/\\([\\`*_{}[\]()#+\-.!])/g, '$1')
    )
}

const stripListMarker = (line: string): string => line.replace(/^\s*(?:[-*+]|\d+[.)])\s+/, '')

/** Raw reference strings from footnotes and reference sections, in document order, de-duplicated. */
export function extractNotebookReferenceTexts(markdown: string): string[] {
    const lines = String(markdown || '').replace(/\r\n?/g, '\n').split('\n')
    const out: string[] = []
    let inFence = false
    let sectionLevel = 0
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (/^\s*(```|~~~)/.test(line)) {
            inFence = !inFence
            continue
        }
        if (inFence) continue
        const footnote = FOOTNOTE_DEF_RE.exec(line)
        if (footnote) {
            let text = footnote[2]
            while (i + 1 < lines.length && /^( {2,}|\t)\S/.test(lines[i + 1])) text += ` ${lines[++i].trim()}`
            out.push(text)
            continue
        }
        const heading = HEADING_RE.exec(line)
        if (heading) {
            const level = heading[1].length
            if (REFERENCE_HEADING_RE.test(line)) sectionLevel = level
            else if (sectionLevel && level <= sectionLevel) sectionLevel = 0
            continue
        }
        if (!sectionLevel || !line.trim()) continue
        // Annotated bibliography: "Reference.  " + hard break + annotation line — skip the annotation.
        const previous = lines[i - 1] || ''
        if (/ {2}$|\\$/.test(previous) && previous.trim() && !HEADING_RE.test(previous)) continue
        out.push(stripListMarker(line))
    }
    const seen = new Set<string>()
    return out
        .map((text) => plainText(text))
        .filter((text) => {
            const key = text.toLowerCase()
            if (!text || seen.has(key)) return false
            seen.add(key)
            return true
        })
}

function cleanDoi(value: string): string {
    return value.replace(/[.,;:)\]]+$/, '')
}

/** "Heidegger, M., & Lovitt, W." → ["Heidegger, M.", "Lovitt, W."] (APA). */
function splitApaAuthors(text: string): string[] {
    const clean = text.replace(/\s*(?:,\s*)?&\s*/g, ', ').replace(/\s*\.\.\.\s*/g, ', ')
    const tokens = clean.split(/,\s*/).filter(Boolean)
    const names: string[] = []
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i]
        const next = tokens[i + 1]
        // "Family, I. I." pairs; organisations / single tokens stand alone.
        if (next && /^(?:[A-ZÀ-ÞÇĞİÖŞÜ][a-zà-ÿçğıöşü]?\.(?:\s*-?\s*)?)+$/.test(next)) {
            names.push(`${token}, ${next}`)
            i++
        } else if (!/^(?:Jr|Sr|II|III|IV)\.?$/.test(token)) {
            names.push(token)
        }
    }
    return names
}

/** "Heidegger, Martin, and William Lovitt" / "…, et al." (MLA / Chicago). */
function splitNaturalAuthors(text: string): string[] {
    const clean = text.replace(/,?\s+et al\.?$/i, '')
    const parts = clean.split(/,?\s+and\s+|;\s*/)
    const names: string[] = []
    parts.forEach((part, index) => {
        const trimmed = part.trim()
        if (!trimmed) return
        if (index === 0) {
            // First author is inverted ("Family, Given"); later "Given Family" separated by commas.
            const [family, given, ...rest] = trimmed.split(/,\s*/)
            names.push(given ? `${family}, ${given}` : family)
            rest.forEach((r) => r && names.push(r))
        } else {
            trimmed.split(/,\s*/).forEach((r) => r && names.push(r))
        }
    })
    return names
}

const stripTrailing = (text: string): string => text.replace(/[\s.,;:]+$/, '').trim()

/** Title text without quotes / trailing period. */
const cleanTitle = (text: string): string => stripTrailing(text.replace(/^[“"‘']+|[”"’']+$/g, '').replace(/[.,]?[”"’]$/, ''))

function venueFromRest(rest: string): { venue?: string; chapter: boolean; journal: boolean } {
    const withoutLinks = rest.replace(URL_RE, '').replace(DOI_RE, '').trim()
    const chapter = /^In\s/.test(withoutLinks)
    const journal = /\d+\s*\(\d+\)|\b\d+\s*,\s*\d+\s*[–-]\s*\d+|\bvol\.|\bno\.|\bpp?\.\s*\d/i.test(withoutLinks)
    const head = withoutLinks.replace(/^In\s+/, '').split(/,\s*\d|\.\s|,\s*(?:vol|no|pp?)\.|\(Eds?\.\)/i)[0]
    const venue = stripTrailing(head.replace(/^[^,]*\(Eds?\.\),\s*/i, ''))
    return { venue: venue && venue.length <= 200 ? venue : undefined, chapter, journal }
}

/**
 * One reference string → citation metadata (null when it is not a reference).
 * Recognizes APA "Authors (Year). Title. Venue.", MLA "Authors. “Title.” Venue, Year."
 * and Chicago "Authors. Year. “Title.” Venue." — plus any line carrying a DOI.
 */
/** "In Stanford Encyclopedia of Philosophy" / "İslâm Ansiklopedisi": exported as encyclopedia entries (BibTeX misc, RIS ENCYC). */
function isEncyclopediaVenue(venue: string | undefined): boolean {
    return /encyclop|ansiklopedi|dictionary|lexikon|lexicon|sözlü/i.test(venue || '')
}

export function parseReferenceText(raw: string): NotebookReference | null {
    const text = squash(raw)
    if (text.length < 8 || text.length > 1200) return null
    const doiMatch = DOI_RE.exec(text)
    const doi = doiMatch ? cleanDoi(doiMatch[1]) : undefined
    const urlMatch = URL_RE.exec(text.replace(/https?:\/\/(?:dx\.)?doi\.org\/\S+/gi, ''))
    const url = doi ? `https://doi.org/${doi}` : urlMatch ? urlMatch[0].replace(/[.,;:]+$/, '') : ''
    const base: NotebookReference = { raw: text, title: '', url, ...(doi ? { doi } : {}) }

    // APA: Authors (2020[, Month]). Title. Rest
    const apa = /^(.+?)\s\((\d{4}[a-z]?|n\.d\.)(?:,[^)]*)?\)\.\s+(.+)$/.exec(text)
    if (apa) {
        const [, authorText, yearText, after] = apa
        const titleMatch = /^(.+?[.?!])(?:\s+(.*))?$/.exec(after)
        const title = cleanTitle(titleMatch ? titleMatch[1] : after)
        const rest = titleMatch?.[2] || ''
        const { venue, chapter, journal } = venueFromRest(rest)
        const year = /^\d{4}/.test(yearText) ? Number(yearText.slice(0, 4)) : undefined
        return {
            ...base,
            title,
            authors: splitApaAuthors(authorText),
            year,
            venue: venue && !/^https?:/i.test(venue) ? venue : undefined,
            ...(chapter && isEncyclopediaVenue(venue)
                ? { kind: 'encyclopedia' as const }
                : { kind: 'paper' as const, workType: chapter ? 'book-chapter' : journal || doi ? 'article' : venue ? 'book' : undefined }),
        }
    }

    // Chicago author-date: Authors. 2020. “Title.” Rest  |  Authors. 2020. Title. Publisher.
    const chicago = /^(.+?)\.\s(\d{4}[a-z]?(?=\.)|n\.d(?=\.))\.\s+(.+)$/.exec(text)
    // MLA: Authors. “Title.” Rest (year near the end)
    const mla = /^(.+?)\.\s+[“"](.+?)[”"]\s*(.*)$/.exec(text)
    const quotedFirst = /^[“"](.+?)[”"]\s*(.*)$/.exec(text)
    if (chicago || mla) {
        const authorText = chicago ? chicago[1] : (mla as RegExpExecArray)[1]
        let title: string
        let rest: string
        let quoted: boolean
        if (chicago) {
            const after = chicago[3]
            const q = /^[“"](.+?)[”"]\s*(.*)$/.exec(after)
            quoted = Boolean(q)
            const plain = /^(.+?[.?!])(?:\s+(.*))?$/.exec(after)
            title = cleanTitle(q ? q[1] : plain ? plain[1] : after)
            rest = q ? q[2] : plain?.[2] || ''
        } else {
            quoted = true
            title = cleanTitle((mla as RegExpExecArray)[2])
            rest = (mla as RegExpExecArray)[3]
        }
        const yearText = chicago ? chicago[2] : (YEAR_RE.exec(rest) || [])[1]
        // A quoted phrase in prose is not a reference: require a year, DOI or link.
        if (!yearText && !doi && !url) return null
        const { venue, chapter, journal } = venueFromRest(rest)
        return {
            ...base,
            title,
            authors: splitNaturalAuthors(authorText),
            year: yearText && /^\d{4}/.test(yearText) ? Number(yearText.slice(0, 4)) : undefined,
            venue: venue && venue !== String(yearText) && !/^https?:/i.test(venue) ? venue : undefined,
            ...((chapter || quoted) && !journal && isEncyclopediaVenue(venue)
                ? { kind: 'encyclopedia' as const }
                : { kind: 'paper' as const, workType: chapter ? 'book-chapter' : quoted ? (journal || venue || doi ? 'article' : undefined) : 'book' }),
        }
    }
    // MLA book: Family, Given. Title. Publisher, Year[, link].
    const mlaBook = /^([^.,“"]+,\s.+?(?<!\b[A-Z]))\.\s+([^“"]+?[.?!])\s+(.*)$/.exec(text)
    if (mlaBook && YEAR_RE.test(mlaBook[3])) {
        const rest = mlaBook[3]
        const year = Number((YEAR_RE.exec(rest) as RegExpExecArray)[1])
        const publisher = stripTrailing(rest.replace(URL_RE, '').split(',')[0])
        return {
            ...base,
            title: cleanTitle(mlaBook[2]),
            authors: splitNaturalAuthors(mlaBook[1]),
            year,
            venue: publisher && !YEAR_RE.test(publisher) ? publisher : undefined,
            kind: 'paper',
            workType: 'book',
        }
    }
    if (quotedFirst) {
        const year = (YEAR_RE.exec(quotedFirst[2]) || [])[1]
        const { venue } = venueFromRest(quotedFirst[2])
        if (!doi && !url && !year) return null
        return { ...base, title: cleanTitle(quotedFirst[1]), year: year ? Number(year) : undefined, venue, kind: doi ? 'paper' : 'web' }
    }
    // Anything else counts only with a DOI (metadata comes from Crossref) or a bare URL.
    if (doi || url) {
        const title = stripTrailing(text.replace(DOI_RE, '').replace(URL_RE, '').replace(/https?:\/\/(?:dx\.)?doi\.org\/?/gi, '').replace(/\bdoi:\s*/i, ''))
        if (!title && !doi) return null
        return { ...base, title: title || doi || url, kind: doi ? 'paper' : 'web' }
    }
    return null
}

type CrossrefMessage = {
    title?: string[]
    subtitle?: string[]
    author?: Array<{ given?: string; family?: string; name?: string; suffix?: string }>
    issued?: { 'date-parts'?: number[][] }
    published?: { 'date-parts'?: number[][] }
    'container-title'?: string[]
    publisher?: string
    type?: string
    DOI?: string
    URL?: string
    'update-to'?: unknown[]
}

/** Crossref work → citation fields (types mapped to the app's work types). */
export function crossrefToCitation(message: CrossrefMessage, fallback: NotebookReference): NotebookReference {
    const title = squash([message.title?.[0], message.subtitle?.[0]].filter(Boolean).join(': ')) || fallback.title
    const authors = (message.author || [])
        .map((a) => (a.family ? [a.family, a.given].filter(Boolean).join(', ') + (a.suffix ? `, ${a.suffix}` : '') : a.name || ''))
        .filter(Boolean)
    const year = message.issued?.['date-parts']?.[0]?.[0] || message.published?.['date-parts']?.[0]?.[0] || fallback.year
    const type = String(message.type || '')
    const workType =
        type === 'book-chapter' || type === 'book-part' || type === 'book-section' || type === 'reference-entry'
            ? 'book-chapter'
            : type === 'book' || type === 'monograph' || type === 'edited-book' || type === 'reference-book'
              ? 'book'
              : type === 'dissertation'
                ? 'dissertation'
                : type === 'posted-content'
                  ? 'preprint'
                  : 'article'
    const venue = workType === 'book' ? message.publisher || fallback.venue : message['container-title']?.[0] || fallback.venue
    return {
        ...fallback,
        title,
        authors: authors.length ? authors : fallback.authors,
        year: typeof year === 'number' ? year : fallback.year,
        venue: venue ? squash(venue) : undefined,
        workType,
        kind: 'paper',
    }
}

export const CROSSREF_ENRICH_MAX = 40

/**
 * Fills DOI references from Crossref (≤ 40 lookups, 4 at a time, ~6 s each).
 * Any failure keeps the parsed text — export never blocks on the network.
 */
export async function enrichReferencesFromCrossref(
    refs: NotebookReference[],
    options: { fetchImpl?: typeof fetch; timeoutMs?: number; concurrency?: number; max?: number; signal?: AbortSignal } = {}
): Promise<NotebookReference[]> {
    const fetchImpl = options.fetchImpl || (typeof fetch === 'function' ? fetch.bind(globalThis) : undefined)
    if (!fetchImpl) return refs
    const max = options.max ?? CROSSREF_ENRICH_MAX
    const timeoutMs = options.timeoutMs ?? 6000
    const out = refs.slice()
    const targets = out.map((ref, index) => ({ ref, index })).filter((t) => t.ref.doi).slice(0, max)
    let cursor = 0
    const worker = async () => {
        while (cursor < targets.length) {
            const { ref, index } = targets[cursor++]
            if (options.signal?.aborted) return
            const controller = new AbortController()
            const timer = setTimeout(() => controller.abort(), timeoutMs)
            try {
                const res = await fetchImpl(`https://api.crossref.org/works/${encodeURIComponent(ref.doi as string)}`, {
                    signal: controller.signal,
                    headers: { Accept: 'application/json' },
                })
                if (!res.ok) continue
                const body = (await res.json()) as { message?: CrossrefMessage }
                if (body?.message) out[index] = crossrefToCitation(body.message, ref)
            } catch {
                /* keep parsed metadata */
            } finally {
                clearTimeout(timer)
            }
        }
    }
    await Promise.all(Array.from({ length: Math.max(1, Math.min(options.concurrency ?? 4, targets.length)) }, worker))
    return out
}

/** Exportable references of a notebook (parsed; Crossref-enriched unless `enrich: false`). */
export async function notebookReferencesForExport(
    markdown: string,
    options: { enrich?: boolean; fetchImpl?: typeof fetch; timeoutMs?: number; signal?: AbortSignal } = {}
): Promise<NotebookReference[]> {
    const seen = new Set<string>()
    const parsed: NotebookReference[] = []
    for (const text of extractNotebookReferenceTexts(markdown)) {
        const ref = parseReferenceText(text)
        if (!ref || !ref.title) continue
        const key = ref.doi ? `doi:${ref.doi.toLowerCase()}` : `t:${ref.title.toLowerCase()}|${ref.year || ''}`
        if (seen.has(key)) continue
        seen.add(key)
        parsed.push(ref)
    }
    if (options.enrich === false) return parsed
    return enrichReferencesFromCrossref(parsed, options)
}
