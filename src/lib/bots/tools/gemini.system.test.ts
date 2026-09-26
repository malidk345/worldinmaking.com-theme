// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { geminiToolCompletion } from './gemini'

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('gemini system channel', () => {
    it('sends the host-extended system message instead of the frozen base prompt', async () => {
        let body: { systemInstruction?: { parts?: Array<{ text?: string }> } } = {}
        vi.stubGlobal(
            'fetch',
            vi.fn(async (_url: string, init: RequestInit) => {
                body = JSON.parse(String(init.body))
                return { ok: true, status: 200, body: null, text: async () => '' }
            })
        )

        const result = await geminiToolCompletion({
            apiKey: 'test-key',
            model: 'gemini-test',
            systemPrompt: 'BASE',
            messages: [
                { role: 'system', content: 'BASE\n\n<plan_board>\nWrite the next section.\n</plan_board>' },
                { role: 'user', content: 'continue' },
            ],
            toolChoice: 'none',
            omitTools: true,
            timeoutMs: 5_000,
        })

        expect(result.ok).toBe(false)
        const text = body.systemInstruction?.parts?.[0]?.text || ''
        expect(text).toContain('<plan_board>')
        expect(text).toContain('Write the next section.')
        expect(text.split('BASE').length - 1).toBe(1)
    })
})
