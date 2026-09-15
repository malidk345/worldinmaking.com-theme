import { afterEach, describe, expect, it, vi } from 'vitest'
import { executeToolCall } from './execute'
import { executeSearchSite } from './host'

const env = {
    SUPABASE_SERVICE_ROLE_KEY: 'mock-key',
}

function hangUntilAbort(): typeof fetch {
    return vi.fn((_url: string, init?: RequestInit) => {
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
    }) as unknown as typeof fetch
}

describe('search_site client abort', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
    })

    it('fail-closes immediately when Stop already aborted before site search', async () => {
        const client = new AbortController()
        client.abort()
        const fetchMock = vi.fn()
        vi.stubGlobal('fetch', fetchMock)

        const direct = await executeSearchSite('notebooks', client.signal)
        expect(direct.ok).toBe(false)
        expect(direct.result).toContain('client request aborted')
        expect(fetchMock).not.toHaveBeenCalled()

        const executed = await executeToolCall(
            {
                id: 'ss-pre',
                name: 'search_site',
                argumentsJson: JSON.stringify({ query: 'notebooks' }),
            },
            env,
            undefined,
            'ask',
            client.signal
        )
        expect(executed.ok).toBe(false)
        expect(executed.result).toContain('client request aborted')
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it('cancels in-flight posts/community fetches on Stop and fail-closes', async () => {
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
                    const fail = () => {
                        sawAbort = true
                        reject(new DOMException('The operation was aborted.', 'AbortError'))
                    }
                    if (signal.aborted) {
                        fail()
                        return
                    }
                    signal.addEventListener('abort', fail, { once: true })
                })
            })
        )

        const pending = executeToolCall(
            {
                id: 'ss-mid',
                name: 'search_site',
                argumentsJson: JSON.stringify({ query: 'worldinmaking' }),
            },
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
        expect(executed.result).not.toContain('No posts matched')
        expect(sawAbort).toBe(true)
        expect(client.signal.aborted).toBe(true)
    })

    it('executeSearchSite links client signal so hanging fetch aborts', async () => {
        const client = new AbortController()
        vi.stubGlobal('fetch', hangUntilAbort())

        const pending = executeSearchSite('hang-query', client.signal)
        await Promise.resolve()
        await Promise.resolve()
        client.abort()

        const result = await pending
        expect(result.ok).toBe(false)
        expect(result.result).toContain('client request aborted')
        expect(result.result).not.toContain('No posts matched')
    })
})
