import { afterEach, describe, expect, it, vi } from 'vitest'
import { executeCodeSandbox } from './run-code-sandbox'

const env = {
    SUPABASE_SERVICE_ROLE_KEY: 'mock-key',
    NEXT_PUBLIC_STORAGE_WORKER_URL: 'https://test-storage.workers.dev',
}

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

describe('executeCodeSandbox', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
    })

    it('evaluates basic math via worker /eval', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async (url: string, init?: RequestInit) => {
                expect(String(url)).toBe('https://test-storage.workers.dev/eval')
                expect(init?.method).toBe('POST')
                const payload = JSON.parse(String(init?.body || '{}')) as { code?: string; language?: string }
                expect(payload.code).toBe('1 + 1')
                expect(payload.language).toBe('math')
                return jsonResponse({ ok: true, result: '2', ms: 1.5 })
            })
        )

        const res = await executeCodeSandbox({ code: '1 + 1', language: 'math' }, env)
        expect(res.ok).toBe(true)
        expect(res.result).toContain('2')
        expect(res.result).toContain('1.50ms')
    })

    it('maps worker process ReferenceError to a failed tool result', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => jsonResponse({ ok: false, error: 'process is not defined', ms: 2 }))
        )

        const res = await executeCodeSandbox({ code: 'process.env', language: 'javascript' }, env)
        expect(res.ok).toBe(false)
        expect(res.result).toContain('process is not defined')
    })

    it('maps worker interrupt to timed out', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => jsonResponse({ ok: false, error: 'timed out', ms: 200 }))
        )

        const res = await executeCodeSandbox({ code: 'while(true){}', language: 'javascript' }, env)
        expect(res.ok).toBe(false)
        expect(res.result).toContain('timed out')
    })

    it('fail-closes when auth is missing', async () => {
        const res = await executeCodeSandbox({ code: '1 + 1', language: 'math' }, {
            NEXT_PUBLIC_STORAGE_WORKER_URL: 'https://test-storage.workers.dev',
        })
        expect(res.ok).toBe(false)
        expect(res.result).toContain('Authentication key is not configured')
    })

    it('fail-closes on client Stop without mapping to a successful result', async () => {
        const client = new AbortController()
        vi.stubGlobal(
            'fetch',
            vi.fn((_url: string, init?: RequestInit) => {
                return new Promise<Response>((_resolve, reject) => {
                    const signal = init?.signal
                    if (!signal) {
                        reject(new Error('expected abort signal'))
                        return
                    }
                    const fail = () => reject(new DOMException('The operation was aborted.', 'AbortError'))
                    if (signal.aborted) {
                        fail()
                        return
                    }
                    signal.addEventListener('abort', fail, { once: true })
                })
            })
        )

        const pending = executeCodeSandbox({ code: '1 + 1', language: 'math' }, env, client.signal)
        await Promise.resolve()
        await Promise.resolve()
        client.abort()

        const res = await pending
        expect(res.ok).toBe(false)
        expect(res.result).toContain('client request aborted')
    })
})
