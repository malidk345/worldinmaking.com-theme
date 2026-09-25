import { describe, expect, it } from 'vitest'
import {
    headlineCase,
    chicagoAuthorList,
    citationStyleLabel,
    formatChicagoReference,
    formatMlaReference,
    formatReference,
    mlaAuthorList,
    parseCitationStyle,
    type StyledCitation,
} from './citation-styles'
import { formatApaReference } from './citation-format'

const CHAPTER: StyledCitation = {
    kind: 'paper', title: 'Die Frage nach der Technik', url: 'https://doi.org/10.1234/frage.1954',
    authors: ['Martin Heidegger'], year: 1954, venue: 'Vorträge und Aufsätze', doi: '10.1234/frage.1954', workType: 'book-chapter',
}
const TR: StyledCitation = {
    kind: 'paper', title: 'Heidegger’de teknik sorusu ve Gestell kavramı.', url: 'https://doi.org/10.5555/fd.2019.12',
    authors: ['Ayşe Yılmaz', 'İsmail Öztürk'], year: 2019, venue: 'Felsefe Dünyası', doi: '10.5555/fd.2019.12', workType: 'article',
}
const THREE: StyledCitation = { ...TR, authors: ['Ayşe Yılmaz', 'İsmail Öztürk', 'Can Demir'] }
const BOOK: StyledCitation = { kind: 'paper', title: 'Being and Time', url: 'https://example.org/bt', authors: ['Heidegger, Martin'], year: 1927, workType: 'book' }
const SEP: StyledCitation = { kind: 'encyclopedia', title: 'Martin Heidegger', url: 'https://plato.stanford.edu/entries/heidegger/', source: 'SEP', authors: ['Michael Wheeler'] }
const WEB: StyledCitation = { kind: 'web', title: 'Heidegger on technology – overview', url: 'https://example.org/heidegger' }
const ORG: StyledCitation = { kind: 'paper', title: 'Why technology?', url: 'https://doi.org/10.1/who', authors: ['World Health Organization'], year: 2020, venue: 'Bulletin', doi: '10.1/who' }
const NAMES: StyledCitation = { ...TR, authors: ['Ludwig van Beethoven', 'Martin Luther King Jr.'] }

describe('style preference parsing', () => {
    it('defaults to APA', () => {
        expect(parseCitationStyle(undefined)).toBe('apa')
        expect(parseCitationStyle('MLA')).toBe('mla')
        expect(parseCitationStyle('chicago-author-date')).toBe('chicago')
        expect(parseCitationStyle('harvard')).toBe('apa')
        expect(citationStyleLabel('chicago')).toBe('Chicago')
    })
})

describe('APA 7 stays the default and unchanged', () => {
    it('formatReference(apa) is the existing APA output', () => {
        for (const c of [CHAPTER, TR, BOOK, SEP, WEB, ORG]) expect(formatReference(c)).toBe(formatApaReference(c))
        expect(formatReference(TR, 'apa')).toBe('Yılmaz, A., & Öztürk, İ. (2019). Heidegger’de teknik sorusu ve Gestell kavramı. Felsefe Dünyası. https://doi.org/10.5555/fd.2019.12')
    })
})

describe('MLA 9', () => {
    it('author lists: one, two, three or more (et al.)', () => {
        expect(mlaAuthorList(['Martin Heidegger'])).toBe('Heidegger, Martin')
        expect(mlaAuthorList(TR.authors)).toBe('Yılmaz, Ayşe, and İsmail Öztürk')
        expect(mlaAuthorList(THREE.authors)).toBe('Yılmaz, Ayşe, et al.')
        expect(mlaAuthorList(NAMES.authors)).toBe('van Beethoven, Ludwig, and Martin Luther King, Jr.')
        expect(mlaAuthorList(['World Health Organization'])).toBe('World Health Organization')
    })
    it('article / chapter: quoted title, container, year, DOI', () => {
        expect(formatMlaReference(CHAPTER)).toBe('Heidegger, Martin. “Die Frage nach der Technik.” Vorträge und Aufsätze, 1954, https://doi.org/10.1234/frage.1954.')
        expect(formatMlaReference(TR)).toBe('Yılmaz, Ayşe, and İsmail Öztürk. “Heidegger’de teknik sorusu ve Gestell kavramı.” Felsefe Dünyası, 2019, https://doi.org/10.5555/fd.2019.12.')
        expect(formatMlaReference(THREE)).toMatch(/^Yılmaz, Ayşe, et al\. “Heidegger’de/)
    })
    it('book: unquoted title', () => {
        expect(formatMlaReference(BOOK)).toBe('Heidegger, Martin. Being and Time. 1927, https://example.org/bt.')
        expect(formatMlaReference({ ...BOOK, venue: 'Max Niemeyer' })).toBe('Heidegger, Martin. Being and Time. Max Niemeyer, 1927, https://example.org/bt.')
    })
    it('encyclopedia entry, web page without author, organisation, question-mark title', () => {
        expect(formatMlaReference(SEP)).toBe('Wheeler, Michael. “Martin Heidegger.” Stanford Encyclopedia of Philosophy, https://plato.stanford.edu/entries/heidegger/.')
        expect(formatMlaReference(WEB)).toBe('“Heidegger on Technology – Overview.” https://example.org/heidegger.')
        expect(formatMlaReference(ORG)).toBe('World Health Organization. “Why Technology?” Bulletin, 2020, https://doi.org/10.1/who.')
    })
    it('suffixes end the author block with a single period', () => {
        expect(formatMlaReference({ ...BOOK, authors: ['Martin Luther King Jr.'] })).toBe('King, Martin Luther, Jr. Being and Time. 1927, https://example.org/bt.')
    })
})

describe('Chicago 17 author-date', () => {
    it('author lists: first inverted, "and" before the last, 11+ → seven et al.', () => {
        expect(chicagoAuthorList(['Martin Heidegger'])).toBe('Heidegger, Martin')
        expect(chicagoAuthorList(TR.authors)).toBe('Yılmaz, Ayşe, and İsmail Öztürk')
        expect(chicagoAuthorList(THREE.authors)).toBe('Yılmaz, Ayşe, İsmail Öztürk, and Can Demir')
        const eleven = Array.from({ length: 11 }, (_, i) => `Given${i} Family${i}`)
        expect(chicagoAuthorList(eleven)).toBe('Family0, Given0, Given1 Family1, Given2 Family2, Given3 Family3, Given4 Family4, Given5 Family5, Given6 Family6, et al.')
        expect(chicagoAuthorList(eleven.slice(0, 10)).endsWith(', and Given9 Family9')).toBe(true)
        expect(chicagoAuthorList(eleven.slice(0, 10), 25)).toMatch(/Given6 Family6, et al\.$/)
    })
    it('chapter: In + book title; article: journal; year after authors', () => {
        expect(formatChicagoReference(CHAPTER)).toBe('Heidegger, Martin. 1954. “Die Frage nach der Technik.” In Vorträge und Aufsätze. https://doi.org/10.1234/frage.1954.')
        expect(formatChicagoReference(TR)).toBe('Yılmaz, Ayşe, and İsmail Öztürk. 2019. “Heidegger’de teknik sorusu ve Gestell kavramı.” Felsefe Dünyası. https://doi.org/10.5555/fd.2019.12.')
    })
    it('book, encyclopedia (n.d.), untitled author web page, organisation', () => {
        expect(formatChicagoReference(BOOK)).toBe('Heidegger, Martin. 1927. Being and Time. https://example.org/bt.')
        expect(formatChicagoReference({ ...BOOK, venue: 'Max Niemeyer' })).toBe('Heidegger, Martin. 1927. Being and Time. Max Niemeyer. https://example.org/bt.')
        expect(formatChicagoReference(SEP)).toBe('Wheeler, Michael. n.d. “Martin Heidegger.” In Stanford Encyclopedia of Philosophy. https://plato.stanford.edu/entries/heidegger/.')
        expect(formatChicagoReference(WEB)).toBe('“Heidegger on Technology – Overview.” n.d. https://example.org/heidegger.')
        expect(formatChicagoReference(ORG)).toBe('World Health Organization. 2020. “Why Technology?” Bulletin. https://doi.org/10.1/who.')
    })
    it('formatReference routes by style', () => {
        expect(formatReference(TR, 'mla')).toBe(formatMlaReference(TR))
        expect(formatReference(TR, 'chicago')).toBe(formatChicagoReference(TR))
    })
})

describe('headlineCase (MLA / Chicago titles)', () => {
    it('capitalizes major words, keeps minor words, acronyms and non-English titles', () => {
        expect(headlineCase('The question concerning technology')).toBe('The Question Concerning Technology')
        expect(headlineCase('COVID-19 and the self-driving car: a review of the evidence')).toBe('COVID-19 and the Self-Driving Car: A Review of the Evidence')
        expect(headlineCase('what is it like to be a bat?')).toBe('What Is It Like to Be a Bat?')
        expect(headlineCase('iPhone use in the classroom')).toBe('iPhone Use in the Classroom')
        expect(headlineCase('Yapay zekâ ve etik')).toBe('Yapay zekâ ve etik')
        expect(headlineCase('Le temps et l’être dans la philosophie')).toBe('Le temps et l’être dans la philosophie')
    })
})
