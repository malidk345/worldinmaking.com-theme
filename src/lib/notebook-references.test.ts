import { describe, expect, it, vi } from 'vitest'
import {
    crossrefToCitation,
    enrichReferencesFromCrossref,
    extractNotebookReferenceTexts,
    notebookReferencesForExport,
    parseReferenceText,
} from './notebook-references'
import { formatReference, type CitationStyle, type StyledCitation } from './ai/citation-styles'
import { citationsToBibtex, citationsToRis } from './ai/citation-export'

const ARTICLE: StyledCitation = {
    title: 'Teknoloji felsefesinde Heidegger ve çerçeveleme',
    url: 'https://doi.org/10.1234/tf.2021.5',
    doi: '10.1234/tf.2021.5',
    authors: ['Ayşe Öztürk', 'Mehmet Şahin'],
    year: 2021,
    venue: 'Felsefe Dünyası',
    kind: 'paper',
    workType: 'article',
}
const BOOK: StyledCitation = {
    title: 'Being and Time',
    url: 'https://example.org/bt',
    authors: ['Martin Heidegger'],
    year: 1962,
    venue: 'Harper & Row',
    kind: 'paper',
    workType: 'book',
}

describe('extractNotebookReferenceTexts', () => {
    it('collects footnote definitions and reference-section lines, skipping annotations, code and other sections', () => {
        const md = [
            '# Thesis notes',
            'Heidegger argues this.[^1] Also see [^2].',
            '',
            '```',
            '[^9]: not a footnote (code)',
            '```',
            '## Kaynakça',
            '- Öztürk, A. (2021). Başlık. *Dergi*, 3(2), 1–10. https://doi.org/10.1/abc',
            '',
            '## Annotated bibliography: Heidegger',
            '',
            'Heidegger, M. (1977). The question concerning technology. Harper & Row.  ',
            'Classic essay on enframing.',
            '',
            '## Discussion',
            'Normal prose (2020). Not a reference section.',
            '',
            '[^1]: Heidegger, M. (1977). The question concerning technology. Harper & Row.',
            '[^2]: See chapter 2 for the argument.',
        ].join('\n')
        expect(extractNotebookReferenceTexts(md)).toEqual([
            'Öztürk, A. (2021). Başlık. Dergi, 3(2), 1–10. https://doi.org/10.1/abc',
            'Heidegger, M. (1977). The question concerning technology. Harper & Row.',
            'See chapter 2 for the argument.',
        ])
    })
})

describe('parseReferenceText', () => {
    const styles: CitationStyle[] = ['apa', 'mla', 'chicago']
    for (const style of styles) {
        it(`round-trips what the app writes in ${style.toUpperCase()} (article + book, Turkish names)`, () => {
            const art = parseReferenceText(formatReference(ARTICLE, style))
            expect(art).toMatchObject({ doi: '10.1234/tf.2021.5', year: 2021, workType: 'article' })
            expect(art?.title.toLowerCase()).toBe(ARTICLE.title.toLowerCase())
            expect(art?.authors?.[0]).toMatch(/^Öztürk, A/)
            expect(art?.authors?.length).toBe(style === 'mla' ? 2 : 2)
            expect(art?.venue).toBe('Felsefe Dünyası')
            const book = parseReferenceText(formatReference(BOOK, style))
            expect(book).toMatchObject({ year: 1962 })
            expect(book?.title).toBe('Being and Time')
            expect(book?.authors?.[0]).toMatch(/^Heidegger, M/)
        })
    }

    it('ignores prose and keeps DOI-only / URL-only lines', () => {
        expect(parseReferenceText('See chapter 2 for the argument.')).toBeNull()
        expect(parseReferenceText('He called it “enframing” and moved on.')).toBeNull()
        expect(parseReferenceText('doi:10.5555/xyz.1.')).toMatchObject({ doi: '10.5555/xyz.1', kind: 'paper' })
        expect(parseReferenceText('Blog post https://example.com/post')).toMatchObject({ kind: 'web', url: 'https://example.com/post' })
    })

    it('reads APA chapters with editors', () => {
        const ref = parseReferenceText('Dreyfus, H. L. (1993). Heidegger on the connection between nihilism, art, technology, and politics. In C. Guignon (Ed.), The Cambridge companion to Heidegger (pp. 289–316). Cambridge University Press.')
        expect(ref).toMatchObject({ year: 1993, workType: 'book-chapter', authors: ['Dreyfus, H. L.'] })
    })
})

describe('Crossref enrichment', () => {
    const message = {
        title: ['Sporda teknoloji'],
        author: [{ given: 'Kenji', family: 'Sakamoto' }, { name: 'WHO Working Group' }],
        issued: { 'date-parts': [[2019, 4]] },
        'container-title': ['Journal of the Philosophy of Sport'],
        type: 'journal-article',
    }

    it('maps Crossref fields and types', () => {
        const ref = crossrefToCitation({ ...message, type: 'book', publisher: 'Routledge' }, { raw: 'x', title: 'x', url: '' })
        expect(ref).toMatchObject({ title: 'Sporda teknoloji', authors: ['Sakamoto, Kenji', 'WHO Working Group'], year: 2019, workType: 'book', venue: 'Routledge' })
    })

    it('fills DOI references, caps lookups, and keeps parsed text when Crossref fails', async () => {
        const fetchImpl = vi.fn(async (url: string) => {
            if (url.includes('10.1%2Fbad')) return new Response('nope', { status: 404 })
            return new Response(JSON.stringify({ message }), { status: 200 })
        }) as unknown as typeof fetch
        const refs = [
            { raw: 'a', title: 'parsed a', url: 'https://doi.org/10.1/good', doi: '10.1/good' },
            { raw: 'b', title: 'parsed b', url: 'https://doi.org/10.1/bad', doi: '10.1/bad' },
            { raw: 'c', title: 'no doi', url: '' },
        ]
        const out = await enrichReferencesFromCrossref(refs, { fetchImpl })
        expect(out.map((r) => r.title)).toEqual(['Sporda teknoloji', 'parsed b', 'no doi'])
        expect(fetchImpl).toHaveBeenCalledTimes(2)
        const capped = vi.fn(async () => new Response(JSON.stringify({ message }))) as unknown as typeof fetch
        await enrichReferencesFromCrossref(
            Array.from({ length: 50 }, (_, i) => ({ raw: String(i), title: String(i), url: '', doi: `10.1/${i}` })),
            { fetchImpl: capped }
        )
        expect(capped).toHaveBeenCalledTimes(40)
    })

    it('a notebook with footnotes exports to parseable BibTeX / RIS (no network when enrich:false)', async () => {
        const md = [
            'Text.[^1][^2][^3]',
            '',
            `[^1]: ${formatReference(ARTICLE, 'apa')}`,
            `[^2]: ${formatReference(BOOK, 'mla')}`,
            `[^3]: ${formatReference(ARTICLE, 'chicago')}`,
        ].join('\n')
        const refs = await notebookReferencesForExport(md, { enrich: false })
        expect(refs).toHaveLength(2) // same DOI twice → one entry
        const bib = citationsToBibtex(refs)
        expect(bib).toContain('@article{ozturk2021teknoloji,')
        expect(bib).toContain('@book{heidegger1962being,')
        expect(bib).toContain('author = {Öztürk, A. and Şahin, M.}')
        const ris = citationsToRis(refs)
        expect((ris.match(/^TY {2}- /gm) || []).length).toBe(2)
    })

    it('encyclopedia entries parsed from any style export as misc / ENCYC', () => {
        const entry: StyledCitation = { id: 1, kind: 'encyclopedia', title: 'Martin Heidegger', url: 'https://plato.stanford.edu/entries/heidegger/', source: 'SEP', venue: 'Stanford Encyclopedia of Philosophy', authors: ['Michael Wheeler'] }
        for (const style of ['apa', 'mla', 'chicago'] as CitationStyle[]) {
            const text = formatReference(entry, style)
            const ref = parseReferenceText(text)
            expect(ref?.kind, `${style}: ${text}`).toBe('encyclopedia')
            expect(ref?.authors, text).toHaveLength(1)
            expect(ref?.authors?.[0], text).toMatch(/^(Wheeler, M(\.|ichael)|Michael Wheeler)$/)
            expect(citationsToBibtex([ref!])).toMatch(/^@misc\{/)
            expect(citationsToRis([ref!])).toContain('TY  - ENCYC')
        }
    })
})
