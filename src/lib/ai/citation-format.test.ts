import { describe, expect, it } from 'vitest'
import { apaAuthorList, apaAuthorName, apaSentence, formatApaReference, isCorporateAuthor } from './citation-format'
import { capAuthors, crossrefItemToPaper, formatApaBibliography } from '../bots/academic-search'
import { academicResultsToCitations } from '../bots/academic-citations'

const names = (n: number) => Array.from({ length: n }, (_, i) => `Given Family${i + 1}`)

describe('APA 7 author names', () => {
    it.each([
        ['Martin Heidegger', 'Heidegger, M.'],
        ['Heidegger, Martin', 'Heidegger, M.'],
        ['Jean-Paul Sartre', 'Sartre, J.-P.'],
        ['J.R.R. Tolkien', 'Tolkien, J. R. R.'],
        ['Willard Van Orman Quine', 'Quine, W. V. O.'],
        ['Ludwig van Beethoven', 'van Beethoven, L.'],
        ['Beethoven, Ludwig van', 'van Beethoven, L.'],
        ['Johannes van der Waals', 'van der Waals, J.'],
        ['Leonardo da Vinci', 'da Vinci, L.'],
        ['Simone de Beauvoir', 'de Beauvoir, S.'],
        ['Alexander von Humboldt', 'von Humboldt, A.'],
        ['Abu Nasr al-Farabi', 'al-Farabi, A. N.'],
        ['Martin Luther King Jr.', 'King, M. L., Jr.'],
        ['King, Martin Luther, Jr.', 'King, M. L., Jr.'],
        ['İlber Ortaylı', 'Ortaylı, İ.'],
        ['ilber Ortaylı', 'Ortaylı, İ.'],
        ['ian hacking', 'hacking, I.'],
        ['Plato', 'Plato'],
    ])('%s → %s', (input, expected) => {
        expect(apaAuthorName(input)).toBe(expected)
    })

    it.each([
        'World Health Organization',
        'Centers for Disease Control and Prevention',
        'Open Science Collaboration',
        'American Psychological Association',
        'T.C. Sağlık Bakanlığı',
        'Türk Tarih Kurumu',
        'National Academies of Sciences, Engineering, and Medicine',
    ])('keeps the organisation "%s" verbatim', (org) => {
        expect(isCorporateAuthor(org)).toBe(true)
        expect(apaAuthorName(org)).toBe(org)
    })

    it('does not mistake people for organisations', () => {
        for (const person of ['Heidegger, Martin', 'Martin Heidegger', 'Ludwig van Beethoven', 'Kenji Sakamoto']) expect(isCorporateAuthor(person)).toBe(false)
    })
})

describe('APA 7 author lists', () => {
    it('places "&" before the last author (with the serial comma, also for two authors)', () => {
        expect(apaAuthorList(['Martin Heidegger'])).toBe('Heidegger, M.')
        expect(apaAuthorList(['Martin Heidegger', 'William Lovitt'])).toBe('Heidegger, M., & Lovitt, W.')
        expect(apaAuthorList(['A Alpha', 'B Beta', 'C Gamma'])).toBe('Alpha, A., Beta, B., & Gamma, C.')
        expect(apaAuthorList(['World Health Organization', 'Martin Heidegger'])).toBe('World Health Organization, & Heidegger, M.')
    })

    it('lists all 20 authors, and first 19 … last for 21+', () => {
        const twenty = apaAuthorList(names(20))
        expect(twenty.split('., ').length).toBe(20)
        expect(twenty).toContain('Family19, G., & Family20, G.')
        const many = apaAuthorList(names(25))
        expect(many).toContain('Family19, G., … Family25, G.')
        expect(many).not.toContain('Family20,')
        expect(many).not.toContain('&')
        // Upstream-capped list (first 19 + last) with the real count.
        const capped = capAuthors(names(300))
        expect(capped.authors).toHaveLength(20)
        expect(capped.authorCount).toBe(300)
        expect(apaAuthorList(capped.authors, capped.authorCount)).toContain('Family19, G., … Family300, G.')
    })
})

describe('APA 7 reference punctuation', () => {
    it('adds no extra period after titles ending in ? or !', () => {
        expect(apaSentence('What is it like to be a bat?')).toBe('What is it like to be a bat?')
        expect(apaSentence('Stop!')).toBe('Stop!')
        expect(apaSentence('Being and Time.')).toBe('Being and Time.')
        expect(apaSentence('Being and Time')).toBe('Being and Time.')
        const ref = formatApaReference({
            title: 'What Is It Like to Be a Bat?',
            url: 'https://doi.org/10.2307/2183914',
            doi: '10.2307/2183914',
            authors: ['Thomas Nagel'],
            year: 1974,
            venue: 'The Philosophical Review',
            kind: 'paper',
        })
        expect(ref).toBe('Nagel, T. (1974). What Is It Like to Be a Bat? The Philosophical Review. https://doi.org/10.2307/2183914')
        expect(formatApaReference({ title: 'Why?', url: 'https://x.example', year: 2020 })).toBe('Why? (2020). https://x.example')
    })

    it('Crossref records keep up to 20 authors, organisations and the real count end to end', () => {
        const item = {
            DOI: '10.5555/big',
            title: ['A large collaboration: does it replicate?'],
            author: [{ name: 'Open Science Collaboration' }, ...Array.from({ length: 24 }, (_, i) => ({ given: 'Ann', family: `Author${i + 1}` }))],
            issued: { 'date-parts': [[2015]] },
            'container-title': ['Science'],
        }
        const paper = crossrefItemToPaper(item)
        expect(paper.authors).toHaveLength(20)
        expect(paper.authorCount).toBe(25)
        const [card] = academicResultsToCitations([paper])
        expect(card.authors).toHaveLength(20)
        expect(card.authorCount).toBe(25)
        const ref = formatApaReference(card)
        expect(ref.startsWith('Open Science Collaboration, Author1, A., ')).toBe(true)
        expect(ref).toContain('Author18, A., … Author24, A. (2015). A large collaboration: does it replicate? Science. https://doi.org/10.5555/big')
        const bib = formatApaBibliography([paper])
        expect(bib).toContain('… Author24, A. (2015). A large collaboration: does it replicate? *Science*. https://doi.org/10.5555/big')
        expect(bib).not.toContain('replicate?.')
    })
})
