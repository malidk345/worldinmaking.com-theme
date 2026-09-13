import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { executeToolCall } from './execute'

describe('generate_image tool execution', () => {
    const originalFetch = globalThis.fetch

    beforeEach(() => {
        vi.restoreAllMocks()
    })

    afterEach(() => {
        globalThis.fetch = originalFetch
    })

    it('rejects empty or missing prompt', async () => {
        const result = await executeToolCall({
            id: 'call-1',
            name: 'generate_image',
            argumentsJson: JSON.stringify({}),
        })

        expect(result.ok).toBe(false)
        const parsed = JSON.parse(result.result)
        expect(parsed.ok).toBe(false)
        expect(parsed.error).toContain('prompt is required')
    })

    it('resolves tool name aliases to generate_image', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                storage_key: 'users/test-user/generated/img-123.png',
                url: '/users/test-user/generated/img-123.png',
            }),
        })
        globalThis.fetch = fetchMock

        const result = await executeToolCall(
            {
                id: 'call-2',
                name: 'create_image',
                argumentsJson: JSON.stringify({ description: 'A mountain peak at dawn' }),
            },
            {
                SUPABASE_SERVICE_ROLE_KEY: 'mock-key',
                NEXT_PUBLIC_STORAGE_WORKER_URL: 'https://test-storage.workers.dev',
            }
        )

        expect(result.name).toBe('generate_image')
        expect(result.ok).toBe(true)
        const parsed = JSON.parse(result.result)
        expect(parsed.ok).toBe(true)
        expect(parsed.url).toBe('https://test-storage.workers.dev/users/test-user/generated/img-123.png')
        expect(parsed.markdown).toContain('https://test-storage.workers.dev/users/test-user/generated/img-123.png')
    })

    it('handles worker errors gracefully without crashing', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: false,
            status: 500,
            json: async () => ({ error: 'Workers AI model rate limit' }),
        })
        globalThis.fetch = fetchMock

        const result = await executeToolCall(
            {
                id: 'call-3',
                name: 'generate_image',
                argumentsJson: JSON.stringify({ prompt: 'Cyberpunk city' }),
            },
            {
                SUPABASE_SERVICE_ROLE_KEY: 'mock-key',
                NEXT_PUBLIC_STORAGE_WORKER_URL: 'https://test-storage.workers.dev',
            }
        )

        expect(result.ok).toBe(false)
        const parsed = JSON.parse(result.result)
        expect(parsed.ok).toBe(false)
        expect(parsed.error).toContain('Workers AI model rate limit')
    })
})
