import { test, expect } from '@playwright/test'
import { isPublicSearchType, sanitizeSearchNeedle } from '../src/lib/public-search'

test.describe('public search helpers', () => {
    test('sanitizes ilike metacharacters', () => {
        expect(sanitizeSearchNeedle('  foo%bar_baz  ')).toBe('foo bar baz')
        expect(sanitizeSearchNeedle(`a"b'c`)).toBe('a b c')
        expect(sanitizeSearchNeedle('ab')).toHaveLength(2)
    })

    test('only the four public facets are allowed', () => {
        expect(isPublicSearchType('post')).toBe(true)
        expect(isPublicSearchType('community')).toBe(true)
        expect(isPublicSearchType('person')).toBe(true)
        expect(isPublicSearchType('notebook')).toBe(true)
        expect(isPublicSearchType('docs')).toBe(false)
        expect(isPublicSearchType('handbook')).toBe(false)
        expect(isPublicSearchType('apps')).toBe(false)
    })
})
