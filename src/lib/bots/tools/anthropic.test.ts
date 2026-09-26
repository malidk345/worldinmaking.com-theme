// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { anthropicToolCompletion } from './anthropic'

afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
})

describe('anthropicToolCompletion', () => {
    it('stops the request when timeoutMs elapses and does not call it a client abort', async () => {
        vi.useFakeTimers()
        vi.stubGlobal(
            'fetch',
            vi.fn((_url: string, init: RequestInit) => {
                return new Promise((_resolve, reject) => {
                    const signal = init.signal
                    if (!signal) {
                        reject(new Error('expected abort signal'))
                        return
                    }
                    if (signal.aborted) {
                        const err = new Error('aborted')
                        err.name = 'AbortError'
                        reject(err)
                        return
                    }
                    signal.addEventListener(
                        'abort',
                        () => {
                            const err = new Error('aborted')
                            err.name = 'AbortError'
                            reject(err)
                        },
                        { once: true }
                    )
                })
            })
        )

        const pending = anthropicToolCompletion({
            apiKey: 'test-key',
            model: 'claude-test',
            messages: [{ role: 'user', content: 'hello' }],
            toolChoice: 'none',
            omitTools: true,
            timeoutMs: 25,
        })
        await vi.advanceTimersByTimeAsync(30)
        const result = await pending
        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.detail).toBe('request timed out')
    })

    it('reassembles a tool call split across SSE chunks', async () => {
        const encoder = new TextEncoder()
        const chunks = [
            'data: {"type":"content_block_start","content_block":{"type":"tool_use","id":"tu_1","name":"web_se',
            'arch"}}\n',
            'data: {"type":"content_block_delta","delta":{"type":"input_json_delta","partial_json":"{\\"q\\":\\"nietzsche\\"}"}}\n',
            'data: {"type":"content_block_stop"}\n',
        ]
        let i = 0
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({
                ok: true,
                status: 200,
                body: {
                    getReader: () => ({
                        read: async () => {
                            if (i >= chunks.length) return { done: true, value: undefined }
                            const value = encoder.encode(chunks[i])
                            i += 1
                            return { done: false, value }
                        },
                        releaseLock: () => undefined,
                    }),
                },
                text: async () => '',
            }))
        )

        const result = await anthropicToolCompletion({
            apiKey: 'test-key',
            model: 'claude-test',
            messages: [{ role: 'user', content: 'search' }],
            toolChoice: 'auto',
            timeoutMs: 5_000,
        })
        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.toolCalls).toEqual([
                { id: 'tu_1', name: 'web_search', argumentsJson: '{"q":"nietzsche"}' },
            ])
        }
    })

    it('sends host context on the system channel once, not the frozen prompt plus a copy', async () => {
        let body: { system?: string } = {}
        vi.stubGlobal(
            'fetch',
            vi.fn(async (_url: string, init: RequestInit) => {
                body = JSON.parse(String(init.body))
                return { ok: true, status: 200, body: null, text: async () => '' }
            })
        )

        const result = await anthropicToolCompletion({
            apiKey: 'test-key',
            model: 'claude-test',
            systemPrompt: 'BASE',
            messages: [
                { role: 'system', content: 'BASE\n\n<system_reminder>\nContinue the section.\n</system_reminder>' },
                { role: 'user', content: 'go on' },
            ],
            toolChoice: 'none',
            omitTools: true,
            timeoutMs: 5_000,
        })

        expect(result.ok).toBe(false)
        const system = body.system || ''
        expect(system).toContain('Continue the section.')
        expect(system.split('BASE').length - 1).toBe(1)
    })
})
