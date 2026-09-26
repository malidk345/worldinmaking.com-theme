import { describe, expect, it } from 'vitest'
import { detectAcademicRouteIntents, formatAcademicRoutingHint } from './academic-routing'

describe('academic routing hints', () => {
    const cases: Array<[string, string[]]> = [
        ['Which papers cite P3?', ['citations']],
        ['Find papers citing Heidegger’s “The Question Concerning Technology”', ['citations']],
        ['who has cited 10.1234/qct', ['citations']],
        ['Bu makaleye atıf yapan çalışmaları bul', ['citations']],
        ['What does P2 cite?', ['references']],
        ['Show me the paper’s references', ['references']],
        ['P1’in kaynakçasında neler var?', ['references']],
        ['Bu makalenin kaynakçası nedir?', ['references']],
        ['P2 kaynakçası', ['references']],
        ['Give me similar papers to P4', ['similar']],
        ['more like this one please', ['similar']],
        ['Buna benzer makaleler öner', ['similar']],
        ['Give me exact quotes from P1 about enframing', ['quotes']],
        ['Can you quote the paper directly, with page numbers?', ['quotes']],
        ['Makaleden birebir alıntı ver', ['quotes']],
        ['Find related papers and give me verbatim passages', ['quotes', 'similar']],
    ]
    for (const [message, expected] of cases) {
        it(`"${message}" → ${expected.join(', ')}`, () => {
            expect(detectAcademicRouteIntents(message)).toEqual(expected)
        })
    }

    it('stays silent for ordinary questions (no extra prompt tokens)', () => {
        for (const message of [
            'What is Heidegger’s view of technology?',
            'Search for recent papers on AI ethics',
            'Summarize this article',
            'Heidegger teknoloji hakkında ne düşünür?',
            'Cite your sources please',
            'Write an essay with references',
        ]) {
            expect(formatAcademicRoutingHint(message)).toBe('')
        }
    })

    it('names the tool and direction, and stays short', () => {
        const hint = formatAcademicRoutingHint('Which papers cite P3, and what does it cite?')
        expect(hint).toContain('related_papers')
        expect(hint).toContain('direction "references" / "citations"')
        expect(formatAcademicRoutingHint('exact quotes please')).toContain('find_quotes')
        expect(hint.length).toBeLessThan(320)
    })
})
