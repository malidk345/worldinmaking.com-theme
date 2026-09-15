import { afterEach, describe, expect, it, vi } from 'vitest'
import { executeToolCall } from './execute'
import { executeReadDocument } from './read-document'

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

describe('read_document client abort', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
    })

    it('fail-closes immediately when Stop already aborted before document fetch', async () => {
        const client = new AbortController()
        client.abort()
        const fetchMock = vi.fn()
        vi.stubGlobal('fetch', fetchMock)

        const direct = await executeReadDocument(
            { url: 'https://1.1.1.1/abort-probe.pdf' },
            undefined,
            client.signal
        )
        expect(direct).toEqual({ ok: false, error: 'client request aborted' })
        expect(fetchMock).not.toHaveBeenCalled()

        const executed = await executeToolCall(
            {
                id: 'rd-pre',
                name: 'read_document',
                argumentsJson: JSON.stringify({ url: 'https://1.1.1.1/abort-probe.pdf' }),
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

    it('cancels in-flight document fetch on Stop and fail-closes', async () => {
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
                id: 'rd-mid',
                name: 'read_document',
                argumentsJson: JSON.stringify({ url: 'https://1.1.1.1/abort-probe.pdf' }),
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
        expect(sawAbort).toBe(true)
        expect(client.signal.aborted).toBe(true)
    })

    it('executeReadDocument links client signal so hanging fetch aborts', async () => {
        const client = new AbortController()
        vi.stubGlobal('fetch', hangUntilAbort())

        const pending = executeReadDocument(
            { url: 'https://1.1.1.1/hang.pdf' },
            undefined,
            client.signal
        )
        await Promise.resolve()
        await Promise.resolve()
        client.abort()

        const result = await pending
        expect(result).toEqual({ ok: false, error: 'client request aborted' })
    })
})
