import { test, expect } from '@playwright/test'
import { collectApiKeys, rotateKeys } from '../src/lib/bots/search-keys'
import { readFamilyBindingValues } from '../src/lib/bots/runtime-env'
import { isNewsQuery } from '../src/lib/bots/search-intent'

test.describe('search API key collection', () => {
    test('splits comma-separated Tavily keys and drops duplicates', () => {
        expect(collectApiKeys('tvly-a, tvly-b', 'tvly-b', ' tvly-c ')).toEqual(['tvly-a', 'tvly-b', 'tvly-c'])
        expect(collectApiKeys(undefined, '', 'tvly-only')).toEqual(['tvly-only'])
        expect(collectApiKeys()).toEqual([])
        expect(collectApiKeys('gsk_one\ngsk_two;gsk_three')).toEqual(['gsk_one', 'gsk_two', 'gsk_three'])
    })

    test('rotates the starting key so two accounts share load', () => {
        expect(rotateKeys(['a', 'b'], 0)).toEqual(['a', 'b'])
        expect(rotateKeys(['a', 'b'], 1)).toEqual(['b', 'a'])
        expect(rotateKeys(['a', 'b'], 2)).toEqual(['a', 'b'])
    })

    test('reads TAVILY_API_KEYS plural from the env store', () => {
        const values = readFamilyBindingValues({ TAVILY_API_KEYS: 'tvly-a,tvly-b' }, ['TAVILY_API_KEY', 'TAVILY_KEY'])
        expect(collectApiKeys(...values)).toEqual(['tvly-a', 'tvly-b'])
    })

    test('Turkish news prompts are news queries for Tavily topic=news', () => {
        expect(isNewsQuery('Bugün yapay zeka haberlerinde öne çıkan 3 gelişmeyi kaynaklarıyla yaz.')).toBe(true)
    })
})
