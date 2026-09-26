/**
 * Client-side BibTeX (.bib) and RIS (.ris) export for Zotero / Mendeley / EndNote.
 * UTF-8 throughout (Turkish letters stay as-is); BibTeX special characters are escaped,
 * capitalized words in titles are brace-protected, citekeys are author+year+word and
 * deduplicated (a, b, c…). Names are split with the shared `parsePersonName`.
 */
import { bareDoi, parsePersonName, type ParsedPersonName } from './citation-format'
import { citationWorkShape, type StyledCitation } from './citation-styles'

export type ExportableCitation = StyledCitation & { retracted?: boolean }

const squash = (text: unknown): string => String(text || '').replace(/\s+/g, ' ').trim()

const ENCYCLOPEDIA_NAMES: Record<string, string> = {
    SEP: 'Stanford Encyclopedia of Philosophy',
    IEP: 'Internet Encyclopedia of Philosophy',
}

function containerOf(c: ExportableCitation): string {
    if (c.kind === 'encyclopedia') return ENCYCLOPEDIA_NAMES[String(c.source || '')] || squash(c.venue) || squash(c.source)
    return squash(c.venue)
}

// ---------------------------------------------------------------- citekeys

const TURKISH_FOLD: Record<string, string> = { ı: 'i', İ: 'I', ş: 's', Ş: 'S', ğ: 'g', Ğ: 'G', ç: 'c', Ç: 'C', ö: 'o', Ö: 'O', ü: 'u', Ü: 'U' }

/** "Öztürk" → "ozturk", "Şahin" → "sahin", "Müller" → "muller" (ASCII, lower case, letters/digits only). */
export function asciiFold(text: string): string {
    return String(text || '')
        .replace(/[ıİşŞğĞçÇöÖüÜ]/g, (ch) => TURKISH_FOLD[ch] || ch)
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/ß/g, 'ss')
        .replace(/[æÆ]/g, 'ae')
        .replace(/[øØ]/g, 'o')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '')
}

const KEY_STOPWORDS = new Set([
    'a', 'an', 'the', 'on', 'of', 'in', 'and', 'for', 'to', 'at', 'by', 'with', 'from', 'is', 'as',
    'der', 'die', 'das', 'des', 'den', 'dem', 'ein', 'eine', 'und', 'zur', 'zum', 'uber',
    'le', 'la', 'les', 'un', 'une', 'du', 'de', 'et', 'el', 'los', 'las', 'y', 'il', 'lo', 'di',
    'bir', 've', 'ile', 'bu', 'icin', 'uzerine', 'uzerinden',
])

function keyAuthor(c: ExportableCitation): string {
    const first = parsePersonName(c.authors?.[0] || '')
    if (first) {
        const base = first.corporate ? first.full.split(/\s+/)[0] : first.family.split(/\s+/).pop() || first.family
        const folded = asciiFold(base)
        if (folded) return folded
    }
    return 'anon'
}

function keyWord(c: ExportableCitation): string {
    for (const word of squash(c.title).split(/[\s\-–—:/]+/)) {
        const folded = asciiFold(word)
        if (folded.length >= 3 && !KEY_STOPWORDS.has(folded)) return folded
    }
    return ''
}

/** Stable citekeys in input order: heidegger1954frage, heidegger1954fragea … on collisions. */
export function buildCitekeys(citations: ExportableCitation[]): string[] {
    const used = new Map<string, number>()
    return citations.map((c) => {
        const base = `${keyAuthor(c)}${c.year || 'nd'}${keyWord(c)}`
        const seen = used.get(base) || 0
        used.set(base, seen + 1)
        if (seen === 0) return base
        // a, b, …, z, aa, ab … (second occurrence gets "a").
        let n = seen - 1
        let suffix = ''
        do {
            suffix = String.fromCharCode(97 + (n % 26)) + suffix
            n = Math.floor(n / 26) - 1
        } while (n >= 0)
        return `${base}${suffix}`
    })
}

// ---------------------------------------------------------------- BibTeX

/** Escapes BibTeX/LaTeX specials in a braced field value; UTF-8 letters pass through. */
export function escapeBibtex(value: string): string {
    return squash(value)
        .split('\\')
        .map((part) =>
            part
                .replace(/([{}&%$#_])/g, '\\$1')
                .replace(/~/g, '\\textasciitilde{}')
                .replace(/\^/g, '\\textasciicircum{}'),
        )
        .join('\\textbackslash{}')
}

// Unicode classes via the RegExp constructor (repo convention: the root tsconfig targets ES5,
// where `/…/u` literals are TS1501 errors under a full `tsc`).
const NON_LETTER_RE = new RegExp('[^\\p{L}]', 'gu')
const UPPER_RE = new RegExp('\\p{Lu}', 'u')
const NON_ALNUM_RE = new RegExp('[^\\p{L}\\p{N}]+', 'u')

/** Keeps capitals where styles would lowercase them: {DNA}, {iPhone}, {Heidegger}'s proper nouns are left to the style. */
function protectTitle(value: string): string {
    return escapeBibtex(value)
        .split(' ')
        .map((word) => {
            const letters = word.replace(NON_LETTER_RE, '')
            // Acronyms / mixed case (DNA, COVID-19, iPhone, McDowell) keep their capitals.
            const mixed = UPPER_RE.test(letters.slice(1)) && !/^\\/.test(word)
            if (!mixed) return word
            // Brace the word itself, not trailing punctuation: "{DNA}:" rather than "{DNA:}".
            const m = /^(.*?)([.,:;!?)\]]*)$/.exec(word) as RegExpExecArray
            return `{${m[1]}}${m[2]}`
        })
        .join(' ')
}

/** URLs / DOIs are verbatim in BibTeX; only braces would unbalance the entry. */
const verbatim = (value: string): string => squash(value).replace(/\{/g, '%7B').replace(/\}/g, '%7D')

function bibtexName(n: ParsedPersonName): string {
    if (n.corporate) return `{${escapeBibtex(n.full)}}`
    const given = escapeBibtex(n.given.join(' '))
    const family = escapeBibtex(n.family)
    // BibTeX "von Last, Jr, First" form.
    if (n.suffix) return `${family}, ${escapeBibtex(n.suffix)}, ${given}`
    return given ? `${family}, ${given}` : family
}

function bibtexAuthors(c: ExportableCitation): string {
    const names = (c.authors || []).map(parsePersonName).filter((n): n is ParsedPersonName => Boolean(n))
    if (names.length === 0) return ''
    const out = names.map(bibtexName)
    if ((c.authorCount || 0) > names.length) out.push('others')
    return out.join(' and ')
}

function bibtexType(c: ExportableCitation): { type: string; container?: string } {
    const shape = citationWorkShape(c)
    const container = containerOf(c)
    if (shape === 'book') return { type: 'book', container: container ? 'publisher' : undefined }
    if (shape === 'chapter') return container ? { type: 'incollection', container: 'booktitle' } : { type: 'misc' }
    if (shape === 'thesis') return { type: 'phdthesis', container: container ? 'school' : undefined }
    if (shape === 'article' && container && c.workType !== 'preprint') return { type: 'article', container: 'journal' }
    return { type: 'misc', container: container ? 'howpublished' : undefined }
}

export function citationToBibtex(c: ExportableCitation, key: string): string {
    const { type, container } = bibtexType(c)
    const doi = bareDoi(c.doi) || bareDoi(c.url)
    const url = doi ? `https://doi.org/${doi}` : c.url || c.oaUrl || c.pdfUrl || ''
    const fields: Array<[string, string]> = []
    const authors = bibtexAuthors(c)
    if (authors) fields.push(['author', authors])
    fields.push(['title', protectTitle(c.title || 'Untitled')])
    if (container) fields.push([container, escapeBibtex(containerOf(c))])
    if (c.year) fields.push(['year', String(c.year)])
    if (doi) fields.push(['doi', verbatim(doi)])
    if (url) fields.push(['url', verbatim(url)])
    if (c.kind === 'encyclopedia' || c.kind === 'web') fields.push(['note', c.kind === 'encyclopedia' ? 'Encyclopedia entry' : 'Web page'])
    if (c.retracted) fields.push(['note', 'Retracted'])
    // Two notes → merge (BibTeX keeps only one field per name).
    const merged: Array<[string, string]> = []
    for (const [name, value] of fields) {
        const prior = merged.find(([n]) => n === name)
        if (prior && name === 'note') prior[1] = `${prior[1]}; ${value}`
        else merged.push([name, value])
    }
    return `@${type}{${key},\n${merged.map(([name, value]) => `  ${name} = {${value}},`).join('\n')}\n}`
}

export function citationsToBibtex(citations: ExportableCitation[]): string {
    const keys = buildCitekeys(citations)
    return citations.map((c, i) => citationToBibtex(c, keys[i])).join('\n\n') + (citations.length ? '\n' : '')
}

// ---------------------------------------------------------------- RIS

function risType(c: ExportableCitation): string {
    const shape = citationWorkShape(c)
    if (shape === 'encyclopedia') return 'ENCYC'
    if (shape === 'web') return 'ELEC'
    if (shape === 'book') return 'BOOK'
    if (shape === 'chapter') return 'CHAP'
    if (shape === 'thesis') return 'THES'
    if (c.workType === 'preprint') return 'UNPB'
    return containerOf(c) ? 'JOUR' : 'GEN'
}

const risValue = (value: string): string => squash(value)

function risName(n: ParsedPersonName): string {
    if (n.corporate) return n.full
    return [n.family, n.given.join(' '), n.suffix].filter(Boolean).join(', ')
}

export function citationToRis(c: ExportableCitation): string {
    const lines: string[] = []
    const add = (tag: string, value: string | number | undefined) => {
        const text = risValue(String(value ?? ''))
        if (text) lines.push(`${tag}  - ${text}`)
    }
    add('TY', risType(c))
    for (const n of (c.authors || []).map(parsePersonName)) if (n) add('AU', risName(n))
    add('TI', c.title || 'Untitled')
    const container = containerOf(c)
    const shape = citationWorkShape(c)
    // Books / theses: the venue is the publisher / institution, not a secondary title.
    if (container) add(shape === 'book' || shape === 'thesis' ? 'PB' : 'T2', container)
    if (c.year) add('PY', c.year)
    const doi = bareDoi(c.doi) || bareDoi(c.url)
    if (doi) add('DO', doi)
    add('UR', doi ? `https://doi.org/${doi}` : c.url || c.oaUrl || '')
    if (c.pdfUrl) add('L1', c.pdfUrl)
    if (c.retracted) add('N1', 'Retracted')
    lines.push('ER  - ')
    return lines.join('\r\n')
}

export function citationsToRis(citations: ExportableCitation[]): string {
    return citations.map(citationToRis).join('\r\n\r\n') + (citations.length ? '\r\n' : '')
}

// ---------------------------------------------------------------- download

export type CitationExportFormat = 'bibtex' | 'ris'

export function citationExportFile(
    citations: ExportableCitation[],
    format: CitationExportFormat,
    baseName = 'references'
): { filename: string; mime: string; text: string } {
    const safe =
        baseName
            .split(NON_ALNUM_RE)
            .map(asciiFold)
            .filter(Boolean)
            .join('-')
            .slice(0, 60) || 'references'
    if (format === 'ris') {
        // BOM: EndNote reads UTF-8 RIS correctly only with it; Zotero / Mendeley ignore it.
        return { filename: `${safe}.ris`, mime: 'application/x-research-info-systems;charset=utf-8', text: `\ufeff${citationsToRis(citations)}` }
    }
    return { filename: `${safe}.bib`, mime: 'application/x-bibtex;charset=utf-8', text: citationsToBibtex(citations) }
}

/** Browser download of an export (no server round trip). */
export function downloadCitationFile(file: { filename: string; mime: string; text: string }): boolean {
    if (typeof document === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) return false
    const blob = new Blob([file.text], { type: file.mime })
    const href = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = href
    link.download = file.filename
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(href), 1000)
    return true
}
