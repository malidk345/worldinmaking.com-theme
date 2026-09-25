import { describe, expect, it } from 'vitest'
import {
    asciiFold,
    buildCitekeys,
    citationExportFile,
    citationsToBibtex,
    citationsToRis,
    escapeBibtex,
    type ExportableCitation,
} from './citation-export'

// ---- Minimal BibTeX reader (brace-balanced values) used to validate what we write.
type BibEntry = { type: string; key: string; fields: Record<string, string> }
function parseBibtex(text: string): BibEntry[] {
    const out: BibEntry[] = []
    let i = 0
    while ((i = text.indexOf('@', i)) >= 0) {
        const open = text.indexOf('{', i)
        const type = text.slice(i + 1, open).trim().toLowerCase()
        const comma = text.indexOf(',', open)
        const key = text.slice(open + 1, comma).trim()
        const fields: Record<string, string> = {}
        let j = comma + 1
        for (;;) {
            while (/[\s,]/.test(text[j])) j++
            if (text[j] === '}') break
            const eq = text.indexOf('=', j)
            const name = text.slice(j, eq).trim().toLowerCase()
            j = text.indexOf('{', eq)
            let depth = 0
            const start = j + 1
            for (; j < text.length; j++) {
                if (text[j] === '\\') { j++; continue }
                if (text[j] === '{') depth++
                else if (text[j] === '}') { depth--; if (depth === 0) break }
            }
            if (depth !== 0) throw new Error(`unbalanced braces in ${key}.${name}`)
            fields[name] = text.slice(start, j)
            j++
        }
        out.push({ type, key, fields })
        i = j + 1
    }
    return out
}

// ---- Minimal RIS reader.
function parseRis(text: string): Array<Record<string, string[]>> {
    const records: Array<Record<string, string[]>> = []
    let cur: Record<string, string[]> | null = null
    for (const line of text.replace(/^\ufeff/, '').split(/\r\n/)) {
        if (!line.trim()) continue
        const m = line.match(/^([A-Z][A-Z0-9]) {2}- ?(.*)$/)
        if (!m) throw new Error(`bad RIS line: ${JSON.stringify(line)}`)
        const [, tag, value] = m
        if (tag === 'TY') cur = {}
        if (!cur) throw new Error('tag before TY')
        ;(cur[tag] ||= []).push(value)
        if (tag === 'ER') { records.push(cur); cur = null }
    }
    if (cur) throw new Error('missing ER')
    return records
}

const HEIDEGGER: ExportableCitation = {
    kind: 'paper', title: 'Die Frage nach der Technik', url: 'https://doi.org/10.1234/frage.1954',
    authors: ['Martin Heidegger'], year: 1954, venue: 'Vorträge und Aufsätze', doi: '10.1234/frage.1954', workType: 'book-chapter',
}
const TURKISH: ExportableCitation = {
    kind: 'paper', title: 'Heidegger’de teknik sorusu ve Gestell kavramı', url: 'https://doi.org/10.5555/fd.2019.12',
    authors: ['Ayşe Yılmaz', 'İsmail Öztürk'], year: 2019, venue: 'Felsefe Dünyası', doi: '10.5555/fd.2019.12', workType: 'article',
    pdfUrl: 'https://dergipark.org.tr/tr/download/article-file/123',
}
const SPECIALS: ExportableCitation = {
    kind: 'paper', title: 'Profits & losses: 50% of $ for C# {braces} and a_b ~ x^2 \\ back', url: 'https://example.org/a%20b?x={1}',
    authors: ['World Health Organization', 'Ludwig van Beethoven', 'Martin Luther King Jr.'], year: 2020, venue: 'Journal of R&D',
}
const SEP: ExportableCitation = {
    kind: 'encyclopedia', title: 'Martin Heidegger', url: 'https://plato.stanford.edu/entries/heidegger/', source: 'SEP', authors: ['Michael Wheeler'],
}
const WEB: ExportableCitation = { kind: 'web', title: 'Heidegger on technology – overview', url: 'https://example.org/heidegger' }
const BOOK: ExportableCitation = { kind: 'paper', title: 'Being and Time', url: 'https://example.org/bt', authors: ['Heidegger, Martin'], year: 1927, workType: 'book' }

describe('citekeys', () => {
    it('author + year + first significant word, ASCII-folded (Turkish letters)', () => {
        expect(asciiFold('Öztürk Şahin Çağrı Işık İnci Müller')).toBe('ozturksahincagriisikincimuller')
        expect(buildCitekeys([HEIDEGGER, TURKISH, SEP, WEB])).toEqual(['heidegger1954frage', 'yilmaz2019heideggerde', 'wheelerndmartin', 'anonndheidegger'])
    })
    it('deduplicates collisions with a, b, …', () => {
        expect(buildCitekeys([HEIDEGGER, HEIDEGGER, HEIDEGGER])).toEqual(['heidegger1954frage', 'heidegger1954fragea', 'heidegger1954frageb'])
    })
    it('organisations use their first word', () => {
        expect(buildCitekeys([SPECIALS])).toEqual(['world2020profits'])
    })
})

describe('BibTeX', () => {
    const bib = citationsToBibtex([HEIDEGGER, TURKISH, SPECIALS, SEP, WEB, BOOK])
    const entries = parseBibtex(bib)

    it('parses back with balanced braces, one entry per source', () => {
        expect(entries.map((e) => [e.type, e.key])).toEqual([
            ['incollection', 'heidegger1954frage'],
            ['article', 'yilmaz2019heideggerde'],
            ['article', 'world2020profits'],
            ['misc', 'wheelerndmartin'],
            ['misc', 'anonndheidegger'],
            ['book', 'heidegger1927being'],
        ])
    })
    it('chapter → incollection with booktitle; article → journal; book without publisher → no container', () => {
        expect(entries[0].fields).toMatchObject({ author: 'Heidegger, Martin', booktitle: 'Vorträge und Aufsätze', year: '1954', doi: '10.1234/frage.1954' })
        expect(entries[1].fields.journal).toBe('Felsefe Dünyası')
        expect(entries[5].fields.author).toBe('Heidegger, Martin')
        expect(entries[5].fields.journal).toBeUndefined()
    })
    it('keeps Turkish characters as UTF-8', () => {
        expect(entries[1].fields.author).toBe('Yılmaz, Ayşe and Öztürk, İsmail')
        expect(entries[1].fields.title).toBe('Heidegger’de teknik sorusu ve Gestell kavramı')
    })
    it('escapes BibTeX specials, protects organisations, particles and suffixes', () => {
        expect(escapeBibtex('50% & $5 #1 a_b {x} ~ ^ \\')).toBe('50\\% \\& \\$5 \\#1 a\\_b \\{x\\} \\textasciitilde{} \\textasciicircum{} \\textbackslash{}')
        expect(entries[2].fields.title).toBe('Profits \\& losses: 50\\% of \\$ for C\\# \\{braces\\} and a\\_b \\textasciitilde{} x\\textasciicircum{}2 \\textbackslash{} back')
        expect(entries[2].fields.journal).toBe('Journal of R\\&D')
        expect(entries[2].fields.author).toBe('{World Health Organization} and van Beethoven, Ludwig and King, Jr., Martin Luther')
        expect(entries[2].fields.url).toBe('https://example.org/a%20b?x=%7B1%7D')
    })
    it('encyclopedia and web pages are misc with howpublished / url', () => {
        expect(entries[3].fields).toMatchObject({ howpublished: 'Stanford Encyclopedia of Philosophy', url: 'https://plato.stanford.edu/entries/heidegger/', note: 'Encyclopedia entry' })
        expect(entries[4].fields).toMatchObject({ url: 'https://example.org/heidegger', note: 'Web page' })
    })
    it('marks 21+ author works with "and others" and retracted works in note', () => {
        const many = { ...HEIDEGGER, authors: Array.from({ length: 20 }, (_, i) => `Given${i} Family${i}`), authorCount: 25, retracted: true }
        const e = parseBibtex(citationsToBibtex([many]))[0]
        expect(e.fields.author.endsWith(' and others')).toBe(true)
        expect(e.fields.author.split(' and ')).toHaveLength(21)
        expect(e.fields.note).toBe('Retracted')
    })
    it('protects acronyms and mixed-case words in titles', () => {
        const e = parseBibtex(citationsToBibtex([{ ...BOOK, title: 'COVID-19 and the iPhone in DNA research' }]))[0]
        expect(e.fields.title).toBe('{COVID-19} and the {iPhone} in {DNA} research')
        const colon = parseBibtex(citationsToBibtex([{ ...BOOK, title: 'DNA: a CRISPR-era reading' }]))[0]
        expect(colon.fields.title).toBe('{DNA}: a {CRISPR-era} reading')
    })
    it('books carry their publisher, theses their school (RIS: PB)', () => {
        const e = parseBibtex(citationsToBibtex([{ ...BOOK, venue: 'Max Niemeyer' }, { ...BOOK, title: 'Tez', workType: 'dissertation', venue: 'Ankara Üniversitesi' }]))
        expect(e[0]).toMatchObject({ type: 'book', fields: { publisher: 'Max Niemeyer' } })
        expect(e[1]).toMatchObject({ type: 'phdthesis', fields: { school: 'Ankara Üniversitesi' } })
        const ris = citationsToRis([{ ...BOOK, venue: 'Max Niemeyer' }])
        expect(ris).toContain('PB  - Max Niemeyer')
        expect(ris).not.toContain('T2  - ')
    })
})

describe('RIS', () => {
    const ris = citationsToRis([HEIDEGGER, TURKISH, SPECIALS, SEP, WEB, BOOK])
    const records = parseRis(ris)

    it('uses CRLF lines, TY first and ER last for every record', () => {
        expect(ris).toContain('\r\n')
        expect(ris.split('\r\n').every((l) => l === '' || /^[A-Z][A-Z0-9] {2}- /.test(l))).toBe(true)
        expect(records).toHaveLength(6)
    })
    it('maps types: CHAP, JOUR, ENCYC, ELEC, BOOK', () => {
        expect(records.map((r) => r.TY[0])).toEqual(['CHAP', 'JOUR', 'JOUR', 'ENCYC', 'ELEC', 'BOOK'])
    })
    it('one AU per author (Family, Given[, Suffix]); organisations whole; Turkish kept', () => {
        expect(records[1].AU).toEqual(['Yılmaz, Ayşe', 'Öztürk, İsmail'])
        expect(records[2].AU).toEqual(['World Health Organization', 'van Beethoven, Ludwig', 'King, Martin Luther, Jr.'])
    })
    it('DOI, URL, year, container and PDF link', () => {
        expect(records[1]).toMatchObject({ TI: ['Heidegger’de teknik sorusu ve Gestell kavramı'], T2: ['Felsefe Dünyası'], PY: ['2019'], DO: ['10.5555/fd.2019.12'], UR: ['https://doi.org/10.5555/fd.2019.12'], L1: ['https://dergipark.org.tr/tr/download/article-file/123'] })
        expect(records[3].T2).toEqual(['Stanford Encyclopedia of Philosophy'])
    })
    it('never emits a multi-line value', () => {
        const r = parseRis(citationsToRis([{ ...WEB, title: 'Line one\nline two' }]))
        expect(r[0].TI).toEqual(['Line one line two'])
    })
})

describe('export file', () => {
    it('names files and adds a UTF-8 BOM for RIS only', () => {
        const bib = citationExportFile([HEIDEGGER], 'bibtex', 'Heidegger Gestell — kaynaklar')
        expect(bib.filename).toBe('heidegger-gestell-kaynaklar.bib')
        expect(bib.text.startsWith('@incollection{')).toBe(true)
        const ris = citationExportFile([HEIDEGGER], 'ris')
        expect(ris.filename).toBe('references.ris')
        expect(ris.text.charCodeAt(0)).toBe(0xfeff)
    })
})
