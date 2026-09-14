import { describe, expect, it, vi } from 'vitest'
import { fetchWithTransientRetry } from './provider-retry'

describe('provider-retry layer', () => {
    it('returns immediately on successful 200 response without retry', async () => {
        const mockFetch = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 200 }))
        vi.stubGlobal('fetch', mockFetch)

        const res = await fetchWithTransientRetry('https://api.groq.com/chat', { method: 'POST' })
        expect(res.status).toBe(200)
        expect(mockFetch).toHaveBeenCalledTimes(1)

        vi.unstubAllGlobals()
    })

    it('retries on 429 rate limit and succeeds on subsequent attempt', async () => {
        let calls = 0
        const mockFetch = vi.fn().mockImplementation(async () => {
            calls += 1
            if (calls === 1) {
                return new Response('Rate limit exceeded', { status: 429 })
            }
            return new Response('{"ok":true}', { status: 200 })
        })
        vi.stubGlobal('fetch', mockFetch)

        const res = await fetchWithTransientRetry('https://api.groq.com/chat', { method: 'POST' }, {
            baseDelayMs: 10,
            maxDelayMs: 50,
        })
        expect(res.status).toBe(200)
        expect(mockFetch).toHaveBeenCalledTimes(2)

        vi.unstubAllGlobals()
    })

    it('does not retry on 401 Unauthorized or 400 Bad Request', async () => {
        const mockFetch = vi.fn().mockResolvedValue(new Response('Invalid key', { status: 401 }))
        vi.stubGlobal('fetch', mockFetch)

        const res = await fetchWithTransientRetry('https://api.groq.com/chat', { method: 'POST' })
        expect(res.status).toBe(401)
        expect(mockFetch).toHaveBeenCalledTimes(1)

        vi.unstubAllGlobals()
    })

    it('aborts immediately when signal is aborted', async () => {
        const controller = new AbortController()
        controller.abort()

        await expect(
            fetchWithTransientRetry('https://api.groq.com/chat', { method: 'POST' }, { signal: controller.signal })
        ).rejects.toThrow('client request aborted')
    })
})
