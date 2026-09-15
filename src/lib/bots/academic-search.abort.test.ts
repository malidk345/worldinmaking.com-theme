import { afterEach, describe, expect, it, vi } from 'vitest'
import { searchAcademicCorpus } from './academic-search'
import { executeToolCall } from './tools/execute'

describe('academic corpus client abort', () => {
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

        const pending = searchAcademicCorpus('client abort probe query', { limit: 3 }, client.signal)
        // Let hanging OpenAlex/Crossref/arXiv fetches attach abort listeners.
        await Promise.resolve()
        await Promise.resolve()
        client.abort()

        await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
        expect(sawAbort).toBe(true)
        expect(client.signal.aborted).toBe(true)
    })

    it('executeToolCall search_academic_corpus fail-closes with client request aborted', async () => {
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

        const pending = executeToolCall(
            {
                id: 't1',
                name: 'search_academic_corpus',
                argumentsJson: JSON.stringify({ query: 'abort while searching papers' }),
            },
            {},
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
