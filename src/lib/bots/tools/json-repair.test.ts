import { describe, expect, it } from 'vitest'
import {
    extractFirstJsonSubstring,
    repairAndParseJsonObject,
    repairJsonString,
    stripJsonEnclosures,
} from './json-repair'

describe('json-repair engine', () => {
    describe('stripJsonEnclosures', () => {
        it('strips markdown json fence', () => {
            const raw = '```json\n{"query": "Nietzsche"}\n```'
            expect(stripJsonEnclosures(raw)).toBe('{"query": "Nietzsche"}')
        })

        it('strips xml tool_code tags', () => {
            const raw = '<tool_code>\n{"query": "Spinoza"}\n</tool_code>'
            expect(stripJsonEnclosures(raw)).toBe('{"query": "Spinoza"}')
        })
    })

    describe('repairJsonString & repairAndParseJsonObject', () => {
        it('parses valid json directly', () => {
            const input = '{"query": "existentialism", "limit": 10}'
            expect(repairAndParseJsonObject(input)).toEqual({
                query: 'existentialism',
                limit: 10,
            })
        })

        it('repairs single-quoted keys and values', () => {
            const input = "{'query': 'Marcus Aurelius', 'topic': 'stoicism'}"
            expect(repairAndParseJsonObject(input)).toEqual({
                query: 'Marcus Aurelius',
                topic: 'stoicism',
            })
        })

        it('repairs trailing commas in objects and arrays', () => {
            const input = '{"query": "Kant", "items": ["categorical", "imperative",], "active": true,}'
            expect(repairAndParseJsonObject(input)).toEqual({
                query: 'Kant',
                items: ['categorical', 'imperative'],
                active: true,
            })
        })

        it('normalizes python literals (True, False, None)', () => {
            const input = '{"save": True, "draft": False, "reference": None}'
            expect(repairAndParseJsonObject(input)).toEqual({
                save: true,
                draft: false,
                reference: null,
            })
        })

        it('handles unquoted keys', () => {
            const input = '{query: "Schopenhauer", count: 5}'
            expect(repairAndParseJsonObject(input)).toEqual({
                query: 'Schopenhauer',
                count: 5,
            })
        })

        it('handles comments inside json', () => {
            const input = `
            {
                // This is a search query
                "query": "Camus",
                /* multi-line comment
                   about absurdism */
                "limit": 3
            }
            `
            expect(repairAndParseJsonObject(input)).toEqual({
                query: 'Camus',
                limit: 3,
            })
        })

        it('balances truncated json brackets', () => {
            const input = '{"query": "Kierkegaard", "details": {"book": "Fear and Trembling"'
            const parsed = repairAndParseJsonObject(input)
            expect(parsed).toEqual({
                query: 'Kierkegaard',
                details: {
                    book: 'Fear and Trembling',
                },
            })
        })

        it('handles surrounding conversational text', () => {
            const input = 'Here is the tool call arguments you need: {"query": "Hegel dialectics", "depth": 2} Please execute it.'
            expect(repairAndParseJsonObject(input)).toEqual({
                query: 'Hegel dialectics',
                depth: 2,
            })
        })

        it('returns empty object for empty or null strings', () => {
            expect(repairAndParseJsonObject('')).toEqual({})
            expect(repairAndParseJsonObject('null')).toEqual({})
            expect(repairAndParseJsonObject('undefined')).toEqual({})
            expect(repairAndParseJsonObject('   ')).toEqual({})
        })

        it('returns null for unrepairable non-object garbage', () => {
            expect(repairAndParseJsonObject('totally random gibberish with no json')).toBeNull()
        })
    })
})
