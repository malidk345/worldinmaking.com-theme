/**
 * Reference styles for the Sources panel, notebook adds, whole-reply footnotes and the
 * annotated_bibliography tool: APA 7 (default), MLA 9 and Chicago 17 author-date.
 * Plain text (no italics markup), like the existing APA output. Pure — client and server safe.
 * Names are split once by `parsePersonName` (organisations, particles, suffixes, Turkish
 * initials) so every style treats the same author the same way.
 */
import type { AiCitation } from './contracts'
import {
    APA_MAX_AUTHORS,
    citationDoiUrl,
    formatApaReference,
    nameSuffixText,
    parsePersonName,
    type ParsedPersonName,
} from './citation-format'

export type CitationStyle = 'apa' | 'mla' | 'chicago'

export const CITATION_STYLES: ReadonlyArray<{ value: CitationStyle; label: string; long: string }> = [
    { value: 'apa', label: 'APA', long: 'APA 7' },
    { value: 'mla', label: 'MLA', long: 'MLA 9' },
    { value: 'chicago', label: 'Chicago', long: 'Chicago (author-date)' },
]

export const DEFAULT_CITATION_STYLE: CitationStyle = 'apa'

export function parseCitationStyle(value: unknown): CitationStyle {
    const raw = String(value || '').trim().toLowerCase()
    if (raw.startsWith('mla')) return 'mla'
    if (raw === 'chicago' || raw.startsWith('chicago')) return 'chicago'
    return 'apa'
}

export function citationStyleLabel(style: CitationStyle): string {
    return CITATION_STYLES.find((s) => s.value === style)?.label || 'APA'
}

export function citationStyleLongLabel(style: CitationStyle): string {
    return CITATION_STYLES.find((s) => s.value === style)?.long || 'APA 7'
}

export type StyledCitation = Pick<AiCitation, 'title' | 'url'> &
    Partial<Pick<AiCitation, 'authors' | 'authorCount' | 'year' | 'venue' | 'doi' | 'kind' | 'source' | 'pdfUrl' | 'oaUrl' | 'workType'>>

const ENCYCLOPEDIA_NAMES: Record<string, string> = {
    SEP: 'Stanford Encyclopedia of Philosophy',
    IEP: 'Internet Encyclopedia of Philosophy',
}

const squash = (text: unknown): string => String(text || '').replace(/\s+/g, ' ').trim()

/** Drops a trailing period so the style can add its own punctuation. */
const bare = (text: unknown): string => squash(text).replace(/[.\s]+$/, '')

/** `Title.` unless it already ends in ? or !. */
function sentence(text: string): string {
    const clean = bare(text)
    if (!clean) return ''
    return /[?!]$/.test(clean) ? clean : `${clean}.`
}

/** `"Title."` with the period inside the quotes (US style); `"Why?"` stays. */
function quotedSentence(text: string): string {
    const clean = bare(text)
    if (!clean) return ''
    return /[?!]$/.test(clean) ? `“${clean}”` : `“${clean}.”`
}

const MINOR_WORDS = new Set(
    (
        'a an the and but or nor for so yet as at by in of off on per to up via vs vs. ' +
        'about above across after against along among around before behind below beneath beside between beyond ' +
        'during except from inside into onto over than through toward towards under until upon with within without'
    ).split(' ')
)
const ENGLISH_HINT_RE = /\b(the|of|and|in|on|for|to|with|from|an|a|is|are|toward|towards|between|into|how|what|why|its|their)\b/i

/**
 * MLA 9 / Chicago headline case for English titles: major words capitalized,
 * articles / prepositions / coordinating conjunctions lowercased except first,
 * last and after a colon. Words with inner capitals or digits (DNA, iPhone,
 * COVID-19) keep their casing. Non-English titles (e.g. Turkish) are returned
 * unchanged — both styles keep the source language's capitalization.
 */
export function headlineCase(title: string): string {
    const text = squash(title)
    if (!text || !/^[\x20-\x7E‘’“”–—]+$/.test(text)) return text
    const words = text.split(' ')
    if (words.length > 2 && !ENGLISH_HINT_RE.test(text)) return text
    const capitalize = (part: string): string => part.replace(/^([^A-Za-z]*)([a-z])/, (_m, lead: string, ch: string) => lead + ch.toUpperCase())
    return words
        .map((word, i) => {
            if (/[A-Z].*[A-Z]|[a-z][A-Z]|\d/.test(word.replace(/^[^A-Za-z]*[A-Z]/, ''))) return word
            if (/^[A-Za-z]*[A-Z][A-Za-z]*[A-Z]/.test(word)) return word
            const core = word.toLowerCase().replace(/^[^a-z]+|[^a-z.]+$/g, '')
            const first = i === 0 || /[:?!—–]$/.test(words[i - 1])
            const last = i === words.length - 1
            if (!first && !last && MINOR_WORDS.has(core)) return word.toLowerCase()
            return word
                .split('-')
                .map((part, j) => (j > 0 && MINOR_WORDS.has(part.toLowerCase()) ? part.toLowerCase() : capitalize(part)))
                .join('-')
        })
        .join(' ')
}

type WorkShape = 'article' | 'book' | 'chapter' | 'encyclopedia' | 'web' | 'thesis'

export function citationWorkShape(c: StyledCitation): WorkShape {
    if (c.kind === 'encyclopedia') return 'encyclopedia'
    if (c.kind === 'web') return 'web'
    const type = String(c.workType || '').toLowerCase()
    if (type === 'book' || type === 'monograph' || type === 'edited-book' || type === 'reference-book') return 'book'
    if (type === 'book-chapter' || type === 'chapter' || type === 'book-section' || type === 'reference-entry') return 'chapter'
    if (type === 'dissertation' || type === 'thesis') return 'thesis'
    if (!c.kind && !c.venue && !c.doi && !c.authors?.length) return 'web'
    return 'article'
}

function containerName(c: StyledCitation): string {
    if (c.kind === 'encyclopedia') return ENCYCLOPEDIA_NAMES[String(c.source || '')] || bare(c.venue) || bare(c.source) || ''
    return bare(c.venue)
}

function linkOf(c: StyledCitation): string {
    return citationDoiUrl(c) || c.oaUrl || c.pdfUrl || c.url || ''
}

/** "Heidegger, Martin" (inverted) or "Martin Heidegger" (natural order); organisations verbatim. */
function fullName(n: ParsedPersonName, inverted: boolean): string {
    if (n.corporate) return n.full
    const given = n.given.join(' ')
    const suffix = n.suffix ? nameSuffixText(n.suffix) : ''
    if (inverted) return [n.family, given, suffix].filter(Boolean).join(', ')
    return [given, n.family].filter(Boolean).join(' ') + (suffix ? `, ${suffix}` : '')
}

/** MLA 9: one author "Family, Given"; two "Family, Given, and Given Family"; three or more "Family, Given, et al." */
export function mlaAuthorList(authors: string[] | undefined): string {
    const names = (authors || []).map(parsePersonName).filter((n): n is ParsedPersonName => Boolean(n))
    if (names.length === 0) return ''
    if (names.length === 1) return fullName(names[0], true)
    if (names.length === 2) return `${fullName(names[0], true)}, and ${fullName(names[1], false)}`
    return `${fullName(names[0], true)}, et al.`
}

/** Chicago 17 (author-date reference list): first author inverted; up to 10 listed; 11+ → first seven, et al. */
export function chicagoAuthorList(authors: string[] | undefined, total?: number): string {
    const names = (authors || []).map(parsePersonName).filter((n): n is ParsedPersonName => Boolean(n))
    if (names.length === 0) return ''
    const count = Math.max(names.length, total || 0)
    const shown = count > 10 ? names.slice(0, 7) : names
    const parts = shown.map((n, i) => fullName(n, i === 0))
    if (count > 10) return `${parts.join(', ')}, et al.`
    if (parts.length === 1) return parts[0]
    if (parts.length === 2) return `${parts[0]}, and ${parts[1]}`
    return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`
}

/** Ends an author block with exactly one period ("et al." / "Jr." already end in one). */
const authorBlock = (text: string): string => (text ? (/\.$/.test(text) ? text : `${text}.`) : '')

const finish = (parts: string[]): string =>
    parts
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .replace(/\s+([,.])/g, '$1')
        .trim()

/** MLA 9 works-cited entry. */
export function formatMlaReference(c: StyledCitation): string {
    const shape = citationWorkShape(c)
    const authors = mlaAuthorList(c.authors)
    const container = containerName(c)
    const link = linkOf(c)
    const year = c.year ? String(c.year) : ''
    const title = headlineCase(c.title)
    if (shape === 'book' || shape === 'thesis') {
        // MLA 9 book: Author. Title. Publisher, Year. (publisher = the work's venue when known)
        const tail = [container, year, link].filter(Boolean).join(', ')
        return finish([authorBlock(authors), sentence(title), tail ? `${tail}.` : ''])
    }
    // Article, chapter, encyclopedia entry, web page: "Title." Container, Year, Link.
    const tail = [container, year, link].filter(Boolean).join(', ')
    return finish([authorBlock(authors), quotedSentence(title), tail ? `${tail}.` : ''])
}

/** Chicago 17 author-date reference-list entry. */
export function formatChicagoReference(c: StyledCitation): string {
    const shape = citationWorkShape(c)
    const authors = chicagoAuthorList(c.authors, c.authorCount)
    const container = containerName(c)
    const link = linkOf(c)
    const year = c.year ? String(c.year) : 'n.d.'
    const title = headlineCase(c.title)
    const linkPart = link ? `${link}.` : ''
    const yearPart = /\.$/.test(year) ? year : `${year}.`
    const lead = authors ? [authorBlock(authors), yearPart] : []
    const titlePart = shape === 'book' || shape === 'thesis' ? sentence(title) : quotedSentence(title)
    const noAuthorLead = authors ? [] : [titlePart, yearPart]
    const body = authors ? [titlePart] : []
    let containerPart = ''
    if (container) {
        if (shape === 'chapter' || shape === 'encyclopedia') containerPart = `In ${sentence(container)}`
        else containerPart = sentence(container) // article / web: journal or site; book / thesis: publisher
    }
    return finish([...lead, ...noAuthorLead, ...body, containerPart, linkPart])
}

/** One reference in the chosen style (APA 7 is the default and unchanged). */
export function formatReference(c: StyledCitation, style: CitationStyle = DEFAULT_CITATION_STYLE): string {
    if (style === 'mla') return formatMlaReference(c)
    if (style === 'chicago') return formatChicagoReference(c)
    return formatApaReference(c)
}

export { APA_MAX_AUTHORS }
