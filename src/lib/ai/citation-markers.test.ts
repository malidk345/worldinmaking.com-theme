import { describe, expect, it } from 'vitest'
import { extractCitationIds, linkifyCitationMarkers, parseCitationHref } from './citation-markers'
import { apaAuthorName, citationMetaLine, formatApaReference } from './citation-format'

describe('citation markers', () => {
    it('extracts [P#], [n], lists and adjacent runs; skips code, links, footnotes and years', () => {
        const text = [
            'Claim [P2] and [3]. Both [P1, P4] and [5][6] and [Source 7].',
            'Not: `[8]`, [9](https://x), [^10], [2024], [11]: https://def',
            '```\n[12]\n```',
        ].join('\n')
        expect(extractCitationIds(text)).toEqual([2, 3, 1, 4, 5, 6, 7])
    })

    it('linkifies known ids to #cite-N and unknown ids to #cite-unknown-N; no-op without sources', () => {
        const out = linkifyCitationMarkers('A [P1] B [2, 9] `[1]`', [1, 2])
        expect(out).toBe('A [1](#cite-1) B [2](#cite-2)[9](#cite-unknown-9) `[1]`')
        expect(linkifyCitationMarkers('A [1]', [])).toBe('A [1]')
        expect(parseCitationHref('#cite-3')).toEqual({ id: 3, known: true })
        expect(parseCitationHref('#cite-unknown-9')).toEqual({ id: 9, known: false })
        expect(parseCitationHref('https://x')).toBeNull()
    })
})

describe('citation format', () => {
    it('formats APA author names (Turkish-safe initials)', () => {
        expect(apaAuthorName('Martin Heidegger')).toBe('Heidegger, M.')
        expect(apaAuthorName('Heidegger, Martin')).toBe('Heidegger, M.')
        expect(apaAuthorName('İlber Ortaylı')).toBe('Ortaylı, İ.')
        expect(apaAuthorName('Plato')).toBe('Plato')
    })

    it('builds APA references for papers, papers without authors and encyclopedia entries', () => {
        expect(
            formatApaReference({
                title: 'The question concerning technology',
                url: 'https://doi.org/10.1234/qct',
                authors: ['Martin Heidegger', 'William Lovitt'],
                year: 1977,
                venue: 'Harper & Row',
                doi: '10.1234/qct',
                kind: 'paper',
            })
        ).toBe('Heidegger, M., & Lovitt, W. (1977). The question concerning technology. Harper & Row. https://doi.org/10.1234/qct')
        expect(formatApaReference({ title: 'Untitled work', url: 'https://x.example/a', kind: 'paper' })).toBe(
            'Untitled work. (n.d.). https://x.example/a'
        )
        expect(
            formatApaReference({
                title: 'Virtue Ethics',
                url: 'https://plato.stanford.edu/entries/ethics-virtue/',
                authors: ['Rosalind Hursthouse', 'Glen Pettigrove'],
                kind: 'encyclopedia',
                source: 'SEP',
            })
        ).toBe('Hursthouse, R., & Pettigrove, G. (n.d.). Virtue Ethics. In Stanford Encyclopedia of Philosophy. https://plato.stanford.edu/entries/ethics-virtue/')
        expect(citationMetaLine({ authors: ['A', 'B', 'C', 'D'], year: 2020, venue: 'J' })).toBe('A, B, C et al. · 2020 · J')
    })
})
