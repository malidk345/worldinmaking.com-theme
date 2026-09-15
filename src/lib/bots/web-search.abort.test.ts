import { afterEach, describe, expect, it, vi } from 'vitest'
import { searchFetchSignal, searchWebSources } from './web-search'
import { executeToolCall } from './tools/execute'

describe('searchFetchSignal', () => {
    it('aborts when the client signal aborts before timeout', () => {
        const client = new AbortController()
        const combined = searchFetchSignal(60_000, client.signal)
        expect(combined.aborted).toBe(false)
        client.abort()
        expect(combined.aborted).toBe(true)
    })
})

describe('web_search client abort', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
    })

    it('cancels in-flight provider fetch when Stop aborts the client signal', async () => {
        const client = new AbortController()
        let sawAbort = false
        vi.stubGlobal(
            'fetch',
            vi.fn((_url: string, init?: RequestInit) => {
                return new Promise<Response>((_resolve, reject) => {
                    const signal = init?.signal
                    if (!signal) {
                        reject(new Error('expected abort signal'))
                        return
                    }
                    if (signal.aborted) {
                        sawAbort = true
                        reject(new DOMException('The operation was aborted.', 'AbortError'))
                        return
                    }
                    signal.addEventListener(
                        'abort',
                        () => {
                            sawAbort = true
                            reject(new DOMException('The operation was aborted.', 'AbortError'))
                        },
                        { once: true }
                    )
                })
            })
        )

        const env = { TAVILY_API_KEY: 'test-tavily-key' }
        const pending = searchWebSources('client abort probe query', env, client.signal)
        // Let the hanging Tavily fetch attach its abort listener.
        await Promise.resolve()
        await Promise.resolve()
        client.abort()

        await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
        expect(sawAbort).toBe(true)
        expect(client.signal.aborted).toBe(true)
    })

    it('executeToolCall web_search fail-closes with client request aborted', async () => {
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

        const env = { TAVILY_API_KEY: 'test-tavily-key' }
        const pending = executeToolCall(
            { id: 't1', name: 'web_search', argumentsJson: JSON.stringify({ query: 'abort while searching' }) },
            env,
            undefined,
            'ask',
            client.signal
        )
        await Promise.resolve()
        await Promise.resolve()
        client.abort()

        const executed = await pending
        expect(executed.ok).toBe(false)
        expect(executed.result).toContain('client request aborted')
    })
})
