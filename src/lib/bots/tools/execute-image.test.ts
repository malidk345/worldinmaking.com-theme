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

    it('forwards aspect_ratio and style options to worker and returns enriched metadata', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                storage_key: 'users/test-user/generated/img-art.png',
                url: '/users/test-user/generated/img-art.png',
                aspect_ratio: '16:9',
                style: 'oil_painting',
                width: 1024,
                height: 576,
            }),
        })
        globalThis.fetch = fetchMock

        const result = await executeToolCall(
            {
                id: 'call-art',
                name: 'generate_image',
                argumentsJson: JSON.stringify({
                    prompt: 'Ancient library in Alexandria',
                    aspect_ratio: '16:9',
                    style: 'oil_painting',
                }),
            },
            {
                SUPABASE_SERVICE_ROLE_KEY: 'mock-key',
                NEXT_PUBLIC_STORAGE_WORKER_URL: 'https://test-storage.workers.dev',
            }
        )

        expect(result.ok).toBe(true)
        expect(fetchMock).toHaveBeenCalled()
        const callArgs = fetchMock.mock.calls[0]
        const sentBody = JSON.parse(callArgs[1].body)
        expect(sentBody.aspect_ratio).toBe('16:9')
        expect(sentBody.style).toBe('oil_painting')
        expect(sentBody.prompt).toBe('Ancient library in Alexandria')

        const parsed = JSON.parse(result.result)
        expect(parsed.aspect_ratio).toBe('16:9')
        expect(parsed.style).toBe('oil_painting')
        expect(parsed.dimensions).toBe('1024x576')
    })

    it('connects to live Cloudflare worker and receives valid generated image URL with aspect ratio', async () => {
        const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5ZHlwaXNnZmFrc3FramRyYWl1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg0NDAyMSwiZXhwIjoyMDgyNDIwMDIxfQ.YV4wfUArW2rgExeNxNbaH6BnuekfNAnE4_1vnS7oqCs'
        const result = await executeToolCall(
            {
                id: 'call-live',
                name: 'generate_image',
                argumentsJson: JSON.stringify({
                    prompt: 'A single red rose on black velvet',
                    aspect_ratio: '16:9',
                    style: 'oil_painting',
                }),
            },
            {
                SUPABASE_SERVICE_ROLE_KEY: token,
                NEXT_PUBLIC_STORAGE_WORKER_URL: 'https://worldinmaking-storage.dursunkayamustafa.workers.dev',
            }
        )

        expect(result.ok).toBe(true)
        const parsed = JSON.parse(result.result)
        expect(parsed.ok).toBe(true)
        expect(parsed.url).toContain('https://worldinmaking-storage.dursunkayamustafa.workers.dev/')
        expect(parsed.markdown).toContain('![A single red rose on black velvet](')
        expect(parsed.aspect_ratio).toBe('16:9')
        expect(parsed.dimensions).toBe('1024x576')

        // Verify the image URL is publicly accessible without auth
        const imgRes = await fetch(parsed.url)
        expect(imgRes.ok).toBe(true)
        expect(imgRes.headers.get('content-type')).toBe('image/png')
    }, 30000)
})
