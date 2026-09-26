/**
 * Client-safe formatting helpers for academic citations (Sources panel cards,
 * "Copy APA", "Add to notebook"). Pure functions — no server imports.
 */

import type { AiCitation } from './contracts'

type CitationLike = Pick<AiCitation, 'title' | 'url'> &
    Partial<Pick<AiCitation, 'authors' | 'authorCount' | 'year' | 'venue' | 'doi' | 'kind' | 'source' | 'pdfUrl' | 'oaUrl'>>

const ENCYCLOPEDIA_NAMES: Record<string, string> = {
    SEP: 'Stanford Encyclopedia of Philosophy',
    IEP: 'Internet Encyclopedia of Philosophy',
}

/** APA 7 lists up to 20 authors; with 21+ it gives the first 19, an ellipsis, then the last. */
export const APA_MAX_AUTHORS = 20

/** Lower-case name particles that stay with the family name ("van Beethoven, L."). */
const NAME_PARTICLES = new Set([
    'van', 'von', 'der', 'den', 'de', 'del', 'della', 'degli', 'dei', 'di', 'da', 'das', 'dos', 'do', 'du',
    'la', 'le', 'lo', 'ter', 'ten', 'te', 'zu', 'zur', 'bin', 'ibn', 'bint', 'al', 'el', 'st.', 'st',
])
const NAME_SUFFIX_RE = /^(?:jr|sr|ii|iii|iv|v)\.?$/i

/** Words that mark an organisation / group author (kept verbatim, never inverted). */
const CORPORATE_RE = new RegExp(
    // Unicode-aware word edges without lookbehind (older Safari): "(^|non-letter)word(?=non-letter|$)".
    '(?:^|[^\\p{L}])(?:' +
        [
            'organi[sz]ation', 'association', 'institute', 'institut', 'institution', 'university', 'universit[yä]t', 'college',
            'school', 'academy', 'academies', 'society', 'council', 'committee', 'commission', 'group', 'consortium',
            'collaboration', 'foundation', 'agency', 'department', 'ministry', 'bureau', 'office', 'cent(?:er|re)s?',
            'network', 'board', 'federation', 'laborator(?:y|ies)', 'programme', 'program', 'project',
            'initiative', 'alliance', 'partnership', 'authority', 'service', 'services', 'nations',
            'hospital', 'corporation', 'company', 'inc', 'ltd', 'llc', 'gmbh', 'working party',
            'taskforce', 'task force', 'secretariat', 'parliament', 'government', 'republic', 'museum', 'library',
            'bakanlığı', 'kurumu', 'derneği', 'üniversitesi', 'enstitüsü', 'başkanlığı', 'vakfı', 'birliği', 'müdürlüğü',
        ].join('|') +
        ')(?=[^\\p{L}]|$)',
    'iu'
)

/** Organisation / group names ("World Health Organization", "Centers for Disease Control and Prevention"). */
export function isCorporateAuthor(name: string): boolean {
    const clean = String(name || '').replace(/\s+/g, ' ').trim()
    if (!clean) return false
    // "National Academies of Sciences, Engineering, and Medicine" — organisations may contain commas.
    if (CORPORATE_RE.test(clean)) return true
    if (clean.includes(',')) return false
    // Function words never occur in personal names ("of", "for", "and", "the", "&").
    return /(?:^|\s)(?:of|for|and|the|on|&)(?:\s|$)/i.test(clean) && clean.split(' ').length >= 3
}

const TURKISH_CHARS_RE = /[çğışöüÇĞİŞÖÜ]/

function upperInitial(word: string, turkish: boolean): string {
    const ch = word.charAt(0)
    // Turkish dotted İ only for Turkish-looking names ("ilber Ortaylı" → "İ."), plain I otherwise.
    return turkish ? ch.toLocaleUpperCase('tr') : ch.toUpperCase()
}

/** "Jean-Paul" → "J.-P."; "J.R.R." → "J. R. R."; "Martin" → "M." */
function givenInitials(given: string[], turkish: boolean): string {
    return given
        .flatMap((token) => token.split(/\.(?=\S)/).filter(Boolean))
        .map((token) => token.replace(/\./g, ''))
        .filter((token) => token && LETTER_RE.test(token))
        .map((token) =>
            token
                .split('-')
                .filter(Boolean)
                .map((part) => `${upperInitial(part, turkish)}.`)
                .join('-')
        )
        .join(' ')
}

const LETTER_RE = new RegExp('\\p{L}', 'u')

function isParticle(token: string): boolean {
    return NAME_PARTICLES.has(token.toLowerCase())
}

/** A person's name split for reference styles; organisations are kept whole. */
export interface ParsedPersonName {
    /** Organisation / group author, or a single-field name ("Plato"): use `full` verbatim. */
    corporate: boolean
    full: string
    /** Family name incl. particles ("van Beethoven"). */
    family: string
    /** Given names as written ("Jean-Paul", "M."). */
    given: string[]
    suffix: string
    /** Turkish-looking name (dotted İ for initials). */
    turkish: boolean
}

/**
 * "Martin Heidegger" / "Heidegger, Martin" → family "Heidegger", given ["Martin"];
 * "Ludwig van Beethoven" → family "van Beethoven"; "Martin Luther King Jr." → suffix "Jr.";
 * organisations ("World Health Organization") and single names ("Plato") → corporate.
 * Shared by APA, MLA, Chicago, BibTeX and RIS so every style splits names the same way.
 */
export function parsePersonName(name: string): ParsedPersonName | null {
    const clean = String(name || '').replace(/\s+/g, ' ').trim()
    if (!clean) return null
    const turkish = TURKISH_CHARS_RE.test(clean)
    const whole = (full: string): ParsedPersonName => ({ corporate: true, full, family: full, given: [], suffix: '', turkish })
    if (isCorporateAuthor(clean)) return whole(clean)
    let family: string[]
    let given: string[]
    let suffix = ''
    if (clean.includes(',')) {
        const parts = clean.split(',').map((part) => part.trim()).filter(Boolean)
        if (parts.length > 2 && NAME_SUFFIX_RE.test(parts[parts.length - 1])) suffix = parts.pop() as string
        family = (parts[0] || '').split(' ').filter(Boolean)
        given = (parts.slice(1).join(' ') || '').split(' ').filter(Boolean)
        if (given.length === 1 && NAME_SUFFIX_RE.test(given[0]) && !suffix) {
            suffix = given[0]
            given = []
        }
        // "Beethoven, Ludwig van" → particles trailing the given names belong to the family name.
        while (given.length > 1 && isParticle(given[given.length - 1])) family.unshift(given.pop() as string)
    } else {
        const parts = clean.split(' ')
        if (parts.length > 1 && NAME_SUFFIX_RE.test(parts[parts.length - 1])) suffix = parts.pop() as string
        if (parts.length === 1) {
            return { corporate: true, full: suffix ? `${parts[0]}, ${suffix}` : parts[0], family: parts[0], given: [], suffix, turkish }
        }
        family = [parts.pop() as string]
        while (parts.length > 1 && isParticle(parts[parts.length - 1])) family.unshift(parts.pop() as string)
        given = parts
    }
    const familyText = family.join(' ')
    if (!familyText) return whole(clean)
    return { corporate: false, full: clean, family: familyText, given, suffix, turkish }
}

/** "Jr" → "Jr."; roman numerals stay bare. */
export function nameSuffixText(suffix: string): string {
    if (!suffix) return ''
    return /\.$/.test(suffix) || /^[ivx]+$/i.test(suffix) ? suffix : `${suffix}.`
}

/** Initials of the given names ("Jean-Paul" → "J.-P."). */
export function givenNameInitials(parsed: ParsedPersonName): string {
    return givenInitials(parsed.given, parsed.turkish)
}

/**
 * "Martin Heidegger" → "Heidegger, M."; "Heidegger, Martin" → "Heidegger, M.";
 * "Ludwig van Beethoven" → "van Beethoven, L."; "Jean-Paul Sartre" → "Sartre, J.-P.";
 * "Martin Luther King Jr." → "King, M. L., Jr."; organisations and single-field
 * names ("World Health Organization", "Plato") are kept as-is.
 */
export function apaAuthorName(name: string): string {
    const parsed = parsePersonName(name)
    if (!parsed) return ''
    if (parsed.corporate) return parsed.full
    const initials = givenNameInitials(parsed)
    const suffixText = parsed.suffix ? `, ${nameSuffixText(parsed.suffix)}` : ''
    return initials ? `${parsed.family}, ${initials}${suffixText}` : `${parsed.family}${suffixText}`
}

/**
 * APA 7 author list: "A, & B"; "A, B, & C" … up to 20 names; 21+ → first 19,
 * "…", last (no ampersand). `total` = real author count when `authors` was
 * already capped to first 19 + last upstream.
 */
export function apaAuthorList(authors: string[] | undefined, total?: number): string {
    const names = (authors || []).map(apaAuthorName).filter(Boolean)
    if (names.length === 0) return ''
    const count = Math.max(names.length, total || 0)
    if (count > APA_MAX_AUTHORS && names.length >= APA_MAX_AUTHORS) {
        return `${names.slice(0, APA_MAX_AUTHORS - 1).join(', ')}, … ${names[names.length - 1]}`
    }
    if (names.length === 1) return names[0]
    return `${names.slice(0, -1).join(', ')}, & ${names[names.length - 1]}`
}

/** Ends a title / venue with a period unless it already ends in ? or ! ("Why?" never becomes "Why?."). */
export function apaSentence(text: string): string {
    const clean = String(text || '').replace(/\s+/g, ' ').trim().replace(/[.\s]+$/, '')
    if (!clean) return ''
    return /[?!]$/.test(clean) ? clean : `${clean}.`
}

/** "Heidegger, M. (1977)." — the year always follows the author list after one space. */
function apaAuthorsWithYear(authors: string, year: string): string {
    return `${authors} ${year}.`
}

export function bareDoi(value?: string): string {
    const raw = String(value || '').trim()
    const stripped = raw.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '')
    return /^10\.\d{4,9}\/\S+$/.test(stripped) ? stripped : ''
}

export function citationDoiUrl(c: Pick<AiCitation, 'doi' | 'url'>): string | undefined {
    const doi = bareDoi(c.doi) || bareDoi(c.url)
    return doi ? `https://doi.org/${doi}` : undefined
}

export function isAcademicCitation(c: Partial<Pick<AiCitation, 'kind'>> | undefined | null): boolean {
    return c?.kind === 'paper' || c?.kind === 'encyclopedia'
}

/** APA 7-style reference string (plain text; no italics markup). */
export function formatApaReference(c: CitationLike): string {
    const title = apaSentence(String(c.title || ''))
    const year = c.year ? `(${c.year})` : '(n.d.)'
    const authors = apaAuthorList(c.authors, c.authorCount)
    if (c.kind === 'encyclopedia') {
        const work = ENCYCLOPEDIA_NAMES[String(c.source || '')] || c.venue || c.source || 'Encyclopedia'
        return `${authors ? `${authors} ` : ''}${year}. ${title} In ${apaSentence(work)} ${c.url}`.replace(/\s+/g, ' ').trim()
    }
    const doiUrl = citationDoiUrl(c)
    const parts = [authors ? apaAuthorsWithYear(authors, year) : `${title} ${year}.`]
    if (authors) parts.push(title)
    if (c.venue) parts.push(apaSentence(c.venue))
    parts.push(doiUrl || c.oaUrl || c.pdfUrl || c.url || '')
    return parts.join(' ').replace(/\s+/g, ' ').trim()
}

/** "Heidegger, M., & Lovitt, W. · 1977 · Harper & Row" style meta line for cards. */
export function citationMetaLine(c: Pick<AiCitation, 'authors' | 'year' | 'venue'>): string {
    const authors = c.authors || []
    const authorText = authors.length === 0 ? '' : authors.length > 3 ? `${authors.slice(0, 3).join(', ')} et al.` : authors.join(', ')
    return [authorText, c.year ? String(c.year) : '', c.venue || ''].filter(Boolean).join(' · ')
}
