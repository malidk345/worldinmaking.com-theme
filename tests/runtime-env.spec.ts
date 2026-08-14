import { test, expect } from '@playwright/test'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
    envFrom,
    getProviderKeyFlags,
    getRuntimeEnv,
    hasCloudflareContext,
} from '../src/lib/bots/runtime-env'
import { nextGroqKeyStart, resetGroqKeyCursor } from '../src/lib/bots/groq-key-cursor'

const CF_REQUEST_CONTEXT = Symbol.for('__cloudflare-request-context__')

function readBotSource(name: string): string {
    return readFileSync(join(__dirname, '..', 'src', 'lib', 'bots', name), 'utf8')
}

test.describe('edge-safe runtime env', () => {
    test('does not use Function/eval (Next.js Edge webpack forbids it)', () => {
        for (const file of ['runtime-env.ts', 'groq-key-cursor.ts']) {
            const src = readBotSource(file)
            // Match real constructors (`Function('…')`), not the word in comments.
            expect(src, file).not.toMatch(/\bFunction\s*\(\s*['"`]/)
            expect(src, file).not.toMatch(/\beval\s*\(\s*['"`]/)
            expect(src, file).not.toMatch(/\bnew Function\s*\(/)
        }
    })

    test('falls back to process.env when CF context is absent', () => {
        expect(hasCloudflareContext()).toBe(false)
        const env = getRuntimeEnv()
        expect(env).toEqual(expect.any(Object))
        expect(getProviderKeyFlags(env).envSource).toBe('process-only')
    })

    test('merges CF request-context secrets over process.env', () => {
        const host = globalThis as typeof globalThis & { [CF_REQUEST_CONTEXT]?: { env?: Record<string, unknown> } }
        const prev = host[CF_REQUEST_CONTEXT]
        host[CF_REQUEST_CONTEXT] = { env: { WIM_TEST_CF_SECRET: 'from-cf' } }
        try {
            expect(hasCloudflareContext()).toBe(true)
            const env = getRuntimeEnv()
            expect(env.WIM_TEST_CF_SECRET).toBe('from-cf')
            expect(envFrom(env, 'WIM_TEST_CF_SECRET')).toBe('from-cf')
            expect(getProviderKeyFlags(env).envSource).toBe('cloudflare+process')
        } finally {
            if (prev === undefined) delete host[CF_REQUEST_CONTEXT]
            else host[CF_REQUEST_CONTEXT] = prev
        }
    })

    test('groq key cursor still round-robins', () => {
        resetGroqKeyCursor()
        expect(nextGroqKeyStart(3)).toBe(0)
        expect(nextGroqKeyStart(3)).toBe(1)
        expect(nextGroqKeyStart(3)).toBe(2)
        expect(nextGroqKeyStart(3)).toBe(0)
        resetGroqKeyCursor()
    })
})
