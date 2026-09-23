// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { formatSearchResults, type SearchResultItem } from './web-search'

describe('formatSearchResults page excerpts', () => {
    it('puts the page text after the snippet so the model can cite the article', () => {
        const hits: SearchResultItem[] = [
            {
                title: 'Note',
                url: 'https://example.com/note',
                snippet: 'lead',
                source: 'Tavily',
                excerpt: 'The article says the price is 12.',
            },
        ]
        const text = formatSearchResults(hits)
        expect(text).toContain('Summary: lead')
        expect(text).toContain('Page: The article says the price is 12.')
        expect(text.indexOf('Summary:')).toBeLessThan(text.indexOf('Page:'))
    })
})
