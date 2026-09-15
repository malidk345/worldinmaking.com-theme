import { afterEach, describe, expect, it, vi } from 'vitest'
import { executeToolCall } from './execute'

const env = {
    SUPABASE_SERVICE_ROLE_KEY: 'mock-key',
    NEXT_PUBLIC_STORAGE_WORKER_URL: 'https://test-storage.workers.dev',
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

describe('multimodal worker client abort', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
    })

    it('generate_image cancels in-flight worker fetch on Stop and fail-closes', async () => {
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
                id: 't1',
                name: 'generate_image',
                argumentsJson: JSON.stringify({ prompt: 'abort while generating' }),
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

    it('synthesize_speech cancels in-flight worker fetch on Stop and fail-closes', async () => {
        const client = new AbortController()
        vi.stubGlobal('fetch', hangUntilAbort())

        const pending = executeToolCall(
            {
                id: 't2',
                name: 'synthesize_speech',
                argumentsJson: JSON.stringify({ text: 'abort while speaking' }),
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
    })

    it('analyze_image cancels in-flight vision worker fetch on Stop and fail-closes', async () => {
        const client = new AbortController()
        vi.stubGlobal('fetch', hangUntilAbort())

        const pending = executeToolCall(
            {
                id: 't3',
                name: 'analyze_image',
                argumentsJson: JSON.stringify({
                    image_url: 'https://1.1.1.1/abort-probe.png',
                    question: 'abort while analyzing',
                }),
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
    })

    it('transcribe_audio cancels in-flight worker fetch on Stop and fail-closes', async () => {
        const client = new AbortController()
        vi.stubGlobal('fetch', hangUntilAbort())

        const pending = executeToolCall(
            {
                id: 't4',
                name: 'transcribe_audio',
                argumentsJson: JSON.stringify({
                    audio_url: 'https://1.1.1.1/abort-probe.mp3',
                }),
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
    })

    it('fail-closes immediately when Stop already aborted before multimodal fetch', async () => {
        const client = new AbortController()
        client.abort()
        const fetchMock = vi.fn()
        vi.stubGlobal('fetch', fetchMock)

        const executed = await executeToolCall(
            {
                id: 't5',
                name: 'generate_image',
                argumentsJson: JSON.stringify({ prompt: 'already aborted' }),
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
})
