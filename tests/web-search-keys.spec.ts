import { test, expect } from '@playwright/test'
import { collectApiKeys, rotateKeys } from '../src/lib/bots/search-keys'

test.describe('search API key collection', () => {
    test('splits comma-separated Tavily keys and drops duplicates', () => {
        expect(collectApiKeys('tvly-a, tvly-b', 'tvly-b', ' tvly-c ')).toEqual(['tvly-a', 'tvly-b', 'tvly-c'])
        expect(collectApiKeys(undefined, '', 'tvly-only')).toEqual(['tvly-only'])
        expect(collectApiKeys()).toEqual([])
    })

    test('rotates the starting key so two accounts share load', () => {
        expect(rotateKeys(['a', 'b'], 0)).toEqual(['a', 'b'])
        expect(rotateKeys(['a', 'b'], 1)).toEqual(['b', 'a'])
        expect(rotateKeys(['a', 'b'], 2)).toEqual(['a', 'b'])
    })
})
