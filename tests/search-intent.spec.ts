import { test, expect } from '@playwright/test'
import {
    expandSearchQuery,
    extractSearchQuery,
    inferSearchIntent,
    isNewsQuery,
    looksLikeFollowUp,
    needsLiveWeb,
} from '../src/lib/bots/search-intent'

test.describe('search intent heuristic', () => {
    test('extracts the core query from search prefixes', () => {
        expect(extractSearchQuery('search the web for latest tesla stock')).toBe('latest tesla stock')
        expect(extractSearchQuery('internette araştır Türkiye seçim sonuçları')).toBe('Türkiye seçim sonuçları')
        expect(extractSearchQuery('please look up bitcoin price')).toBe('bitcoin price')
    })

    test('searches factual and news-like questions without the globe', () => {
        expect(inferSearchIntent('Bitcoin nedir?').needsSearch).toBe(true)
        expect(inferSearchIntent('who is the president of Turkey').needsSearch).toBe(true)
        expect(inferSearchIntent('güncel dolar kuru').needsSearch).toBe(true)
        expect(inferSearchIntent('latest news about OpenAI').searchQuery).toContain('OpenAI')
    })

    test('does not search greetings, self questions, or creative asks', () => {
        expect(inferSearchIntent('merhaba').needsSearch).toBe(false)
        expect(inferSearchIntent('who are you').needsSearch).toBe(false)
        expect(inferSearchIntent('write a poem about the sea').needsSearch).toBe(false)
        expect(inferSearchIntent('what do you think about justice').needsSearch).toBe(false)
    })

    test('expands short follow-ups with the previous user turn', () => {
        expect(looksLikeFollowUp('ya ethereum?')).toBe(true)
        expect(looksLikeFollowUp('what about 2024?')).toBe(true)
        expect(looksLikeFollowUp('write a longer version')).toBe(false)
        expect(expandSearchQuery('ya ethereum?', 'bitcoin nedir')).toContain('bitcoin')
        expect(expandSearchQuery('ya ethereum?', 'bitcoin nedir')).toContain('ethereum')
        expect(expandSearchQuery('latest tesla stock price today', 'ignore this')).toBe('latest tesla stock price today')
        expect(isNewsQuery('güncel dolar kuru')).toBe(true)
        expect(isNewsQuery('who is Spinoza')).toBe(false)
        expect(needsLiveWeb('Bugün yapay zeka haberlerinde öne çıkan 3 gelişmeyi kaynaklarıyla yaz.')).toBe(true)
        expect(needsLiveWeb('Sen kimsin?')).toBe(false)
    })
})
