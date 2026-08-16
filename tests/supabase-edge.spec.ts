import { test, expect } from '@playwright/test'
import { supabaseRest } from '../src/lib/bots/supabase-edge'

test.describe('supabase edge fetch', () => {
    test('does not pass RequestInit.cache (Cloudflare workerd rejects it)', async () => {
        const inits: RequestInit[] = []
        const original = globalThis.fetch
        globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
            inits.push(init || {})
            return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } })
        }) as typeof fetch

        try {
            const result = await supabaseRest('/community_posts?select=id', {
                env: {
                    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
                    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-key',
                },
                method: 'POST',
                headers: { Prefer: 'return=representation' },
                body: JSON.stringify({ title: 'x' }),
            })
            expect(result.ok).toBe(true)
            expect(inits).toHaveLength(1)
            expect('cache' in (inits[0] || {})).toBe(false)
            expect((inits[0] as { env?: unknown }).env).toBeUndefined()
            const headers = new Headers(inits[0].headers)
            expect(headers.get('Cache-Control')).toBe('no-store')
            expect(headers.get('Prefer')).toBe('return=representation')
        } finally {
            globalThis.fetch = original
        }
    })
})
