import { afterEach, describe, expect, it, vi } from 'vitest'
import { executeToolCall } from './execute'

const env = {
    SUPABASE_SERVICE_ROLE_KEY: 'mock-key',
    NEXT_PUBLIC_STORAGE_WORKER_URL: 'https://test-storage.workers.dev',
}

describe('run_code_sandbox worker client abort', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
    })

    it('cancels in-flight /eval fetch on Stop and fail-closes', async () => {
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
                id: 't-eval',
                name: 'run_code_sandbox',
                argumentsJson: JSON.stringify({ language: 'javascript', code: '1 + 1' }),
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
})
