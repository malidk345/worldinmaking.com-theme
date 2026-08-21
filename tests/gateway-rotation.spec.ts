import { test, expect } from '@playwright/test'
import { tmpdir } from 'os'
import { join } from 'path'
import {
    generateWithGateway,
    resetProviderCooldowns,
} from '../src/lib/bots/ai-gateway'

function groqOk(text: string) {
    return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ choices: [{ message: { content: text } }] }),
    } as Response
}

function groqFail(status: number, body: string) {
    return {
        ok: false,
        status,
        text: async () => body,
    } as Response
}

function geminiOk(text: string) {
    return {
        ok: true,
        status: 200,
        text: async () =>
            JSON.stringify({
                candidates: [{ content: { parts: [{ text }] } }],
            }),
    } as Response
}

function authHeader(init?: RequestInit): string {
    const headers = init?.headers as Record<string, string> | undefined
    return headers?.Authorization || ''
}

function isolateCursors(label: string) {
    const stamp = `${Date.now()}-${Math.random()}`
    process.env.WIM_GROQ_CURSOR_FILE = join(tmpdir(), `wim-groq-${label}-${stamp}`)
    process.env.WIM_GEMINI_CURSOR_FILE = join(tmpdir(), `wim-gemini-${label}-${stamp}`)
    process.env.WIM_PRIMARY_CURSOR_FILE = join(tmpdir(), `wim-primary-${label}-${stamp}`)
    resetProviderCooldowns()
}

test.describe('Groq / Gemini rotation end to end', () => {
    test.afterEach(() => {
        resetProviderCooldowns()
        delete process.env.WIM_GROQ_CURSOR_FILE
        delete process.env.WIM_GEMINI_CURSOR_FILE
        delete process.env.WIM_PRIMARY_CURSOR_FILE
    })

    test('a Groq 429 on key 1 fails over to key 2 in the same request', async () => {
        isolateCursors('failover')
        const seen: string[] = []
        const original = globalThis.fetch
        globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
            const url = String(_url)
            if (url.includes('api.groq.com')) {
                const key = authHeader(init)
                seen.push(key)
                if (key.includes('gsk_aaa')) {
                    return groqFail(429, 'Rate limit reached for model on tokens per minute (TPM): Limit 8000')
                }
                return groqOk('from-second-groq')
            }
            throw new Error(`unexpected url ${url}`)
        }) as typeof fetch

        try {
            const result = await generateWithGateway({
                systemPrompt: 'sys',
                userPrompt: 'hello',
                env: {
                    GROQ_API_KEYS: 'gsk_aaa,gsk_bbb',
                    GEMINI_API_KEYS: '',
                },
                thinkingDepth: 'brief',
            })
            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.text).toBe('from-second-groq')
                expect(result.provider).toContain('groq')
            }
            expect(seen.some((h) => h.includes('gsk_aaa'))).toBe(true)
            expect(seen.some((h) => h.includes('gsk_bbb'))).toBe(true)
        } finally {
            globalThis.fetch = original
        }
    })

    test('the next request starts on the next Groq account', async () => {
        isolateCursors('roundrobin')
        const firstKeys: string[] = []
        const original = globalThis.fetch
        globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
            const url = String(_url)
            if (url.includes('api.groq.com')) {
                firstKeys.push(authHeader(init))
                return groqOk('ok')
            }
            throw new Error(`unexpected url ${url}`)
        }) as typeof fetch

        try {
            const env = { GROQ_API_KEYS: 'gsk_one,gsk_two,gsk_three' }
            await generateWithGateway({ systemPrompt: 's', userPrompt: 'u1', env, thinkingDepth: 'brief' })
            await generateWithGateway({ systemPrompt: 's', userPrompt: 'u2', env, thinkingDepth: 'brief' })
            await generateWithGateway({ systemPrompt: 's', userPrompt: 'u3', env, thinkingDepth: 'brief' })
            const used = firstKeys.map((h) => h.replace('Bearer ', ''))
            expect(used).toEqual(['gsk_one', 'gsk_two', 'gsk_three'])
        } finally {
            globalThis.fetch = original
        }
    })

    test('all Groq keys 429 then Gemini answers', async () => {
        isolateCursors('family')
        const seen: string[] = []
        const original = globalThis.fetch
        globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
            const url = String(_url)
            if (url.includes('api.groq.com')) {
                seen.push('groq')
                return groqFail(429, '429 rate_limit')
            }
            if (url.includes('generativelanguage.googleapis.com')) {
                seen.push('gemini')
                return geminiOk('from-gemini')
            }
            throw new Error(`unexpected url ${url}`)
        }) as typeof fetch

        try {
            const result = await generateWithGateway({
                systemPrompt: 'sys',
                userPrompt: 'hello',
                env: {
                    GROQ_API_KEYS: 'gsk_aaa,gsk_bbb',
                    GEMINI_API_KEYS: 'AIza_g1',
                },
                thinkingDepth: 'brief',
            })
            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.text).toBe('from-gemini')
                expect(String(result.provider)).toContain('gemini')
            }
            expect(seen.filter((s) => s === 'groq').length).toBeGreaterThanOrEqual(2)
            expect(seen).toContain('gemini')
        } finally {
            globalThis.fetch = original
        }
    })

    test('Groq 429s walk every account before Gemini', async () => {
        isolateCursors('two-strikes')
        const groqHits: string[] = []
        const original = globalThis.fetch
        globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
            const url = String(_url)
            if (url.includes('api.groq.com')) {
                groqHits.push(authHeader(init))
                return groqFail(429, '429 rate_limit')
            }
            if (url.includes('generativelanguage.googleapis.com')) {
                return geminiOk('switched-to-gemini')
            }
            throw new Error(`unexpected url ${url}`)
        }) as typeof fetch

        try {
            const result = await generateWithGateway({
                systemPrompt: 'sys',
                userPrompt: 'hello',
                env: {
                    GROQ_API_KEYS: 'gsk_a,gsk_b,gsk_c,gsk_d',
                    GEMINI_API_KEYS: 'AIza_g1',
                },
                thinkingDepth: 'brief',
            })
            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.text).toBe('switched-to-gemini')
                expect(String(result.provider)).toContain('gemini')
            }
            expect(groqHits.length).toBe(4)
        } finally {
            globalThis.fetch = original
        }
    })

    test('after Groq fails, the next user query starts on Gemini', async () => {
        isolateCursors('sticky-fail')
        const hosts: string[] = []
        let turn = 0
        const original = globalThis.fetch
        globalThis.fetch = (async (_url: RequestInfo | URL) => {
            const url = String(_url)
            const host = url.includes('api.groq.com') ? 'groq' : url.includes('generativelanguage.googleapis.com') ? 'gemini' : 'other'
            hosts.push(`${turn}:${host}`)
            if (turn === 0 && host === 'groq') return groqFail(429, '429 rate_limit')
            if (host === 'gemini') return geminiOk('gemini-now')
            return groqOk('should-not-win-turn-2')
        }) as typeof fetch

        try {
            const env = { GROQ_API_KEYS: 'gsk_a,gsk_b,gsk_c', GEMINI_API_KEYS: 'AIza_g1' }
            const first = await generateWithGateway({
                systemPrompt: 's',
                userPrompt: 'u1',
                env,
                thinkingDepth: 'brief',
            })
            expect(first.ok).toBe(true)
            if (first.ok) expect(String(first.provider)).toContain('gemini')

            turn = 1
            const second = await generateWithGateway({
                systemPrompt: 's',
                userPrompt: 'u2',
                env,
                thinkingDepth: 'brief',
            })
            expect(second.ok).toBe(true)
            if (second.ok) expect(second.text).toBe('gemini-now')
            const secondHosts = hosts.filter((h) => h.startsWith('1:')).map((h) => h.slice(2))
            expect(secondHosts[0]).toBe('gemini')
        } finally {
            globalThis.fetch = original
        }
    })

    test('Gemini 429 on key 1 fails over to Gemini key 2', async () => {
        isolateCursors('gemini-key')
        const seen: string[] = []
        const original = globalThis.fetch
        globalThis.fetch = (async (input: RequestInfo | URL) => {
            const url = String(input)
            if (url.includes('api.groq.com')) {
                return groqFail(401, 'invalid_api_key')
            }
            if (url.includes('generativelanguage.googleapis.com')) {
                seen.push(url)
                if (url.includes('AIza_hot')) {
                    return groqFail(429, 'RESOURCE_EXHAUSTED')
                }
                return geminiOk('from-cool-gemini')
            }
            throw new Error(`unexpected url ${url}`)
        }) as typeof fetch

        try {
            const result = await generateWithGateway({
                systemPrompt: 'sys',
                userPrompt: 'hello',
                env: {
                    GROQ_API_KEY: 'gsk_dead',
                    GEMINI_API_KEYS: 'AIza_hot,AIza_ok',
                },
                skipFamilies: ['groq'],
                thinkingDepth: 'brief',
            })
            expect(result.ok).toBe(true)
            if (result.ok) expect(result.text).toBe('from-cool-gemini')
            expect(seen.some((u) => u.includes('AIza_hot'))).toBe(true)
            expect(seen.some((u) => u.includes('AIza_ok'))).toBe(true)
        } finally {
            globalThis.fetch = original
        }
    })
})
