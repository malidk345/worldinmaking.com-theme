import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { executeToolCall } from './execute'

describe('Multimodal Tools: analyze_image, transcribe_audio, synthesize_speech', () => {
    const originalFetch = globalThis.fetch
    const liveToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5ZHlwaXNnZmFrc3FramRyYWl1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg0NDAyMSwiZXhwIjoyMDgyNDIwMDIxfQ.YV4wfUArW2rgExeNxNbaH6BnuekfNAnE4_1vnS7oqCs'
    const liveWorkerUrl = 'https://worldinmaking-storage.dursunkayamustafa.workers.dev'

    beforeEach(() => {
        vi.restoreAllMocks()
    })

    afterEach(() => {
        globalThis.fetch = originalFetch
    })

    describe('analyze_image (Vision / LLaVA)', () => {
        it('rejects missing image_url', async () => {
            const result = await executeToolCall({
                id: 'call-v1',
                name: 'analyze_image',
                argumentsJson: JSON.stringify({}),
            })
            expect(result.ok).toBe(false)
            const parsed = JSON.parse(result.result)
            expect(parsed.error).toContain('image_url is required')
        })

        it('resolves tool alias inspect_visual and forwards question', async () => {
            const fetchMock = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    ok: true,
                    analysis: 'A mathematical formula written in chalk on blackboard.',
                    model: '@cf/llava-hf/llava-1.5-7b-hf',
                }),
            })
            globalThis.fetch = fetchMock

            const result = await executeToolCall(
                {
                    id: 'call-v2',
                    name: 'inspect_visual',
                    argumentsJson: JSON.stringify({
                        image_url: 'https://example.com/blackboard.png',
                        question: 'What is written on the board?',
                    }),
                },
                {
                    SUPABASE_SERVICE_ROLE_KEY: 'mock-key',
                    NEXT_PUBLIC_STORAGE_WORKER_URL: 'https://test-storage.workers.dev',
                }
            )

            expect(result.name).toBe('analyze_image')
            expect(result.ok).toBe(true)
            const parsed = JSON.parse(result.result)
            expect(parsed.ok).toBe(true)
            expect(parsed.analysis).toContain('mathematical formula')
            expect(parsed.image_url).toBe('https://example.com/blackboard.png')

            const sentBody = JSON.parse(fetchMock.mock.calls[0][1].body)
            expect(sentBody.image_url).toBe('https://example.com/blackboard.png')
            expect(sentBody.prompt).toBe('What is written on the board?')
        })

        it('connects to live Cloudflare worker and recognizes real image', async () => {
            const result = await executeToolCall(
                {
                    id: 'call-v-live',
                    name: 'analyze_image',
                    argumentsJson: JSON.stringify({
                        image_url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
                        question: 'What character is this?',
                    }),
                },
                {
                    SUPABASE_SERVICE_ROLE_KEY: liveToken,
                    NEXT_PUBLIC_STORAGE_WORKER_URL: liveWorkerUrl,
                }
            )

            expect(result.ok).toBe(true)
            const parsed = JSON.parse(result.result)
            expect(parsed.ok).toBe(true)
            expect(parsed.analysis.toLowerCase()).toMatch(/pokemon|pikachu/)
        }, 30000)
    })

    describe('transcribe_audio (Whisper Large V3 Turbo)', () => {
        it('rejects missing audio_url', async () => {
            const result = await executeToolCall({
                id: 'call-t1',
                name: 'transcribe_audio',
                argumentsJson: JSON.stringify({}),
            })
            expect(result.ok).toBe(false)
            const parsed = JSON.parse(result.result)
            expect(parsed.error).toContain('audio_url is required')
        })

        it('resolves tool alias voice_to_text and normalizes arguments', async () => {
            const fetchMock = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    ok: true,
                    text: 'Varoluş özden önce gelir.',
                    vtt: 'WEBVTT\n00:00 -> 00:02 Varoluş özden önce gelir.',
                }),
            })
            globalThis.fetch = fetchMock

            const result = await executeToolCall(
                {
                    id: 'call-t2',
                    name: 'voice_to_text',
                    argumentsJson: JSON.stringify({
                        audio_url: 'https://example.com/voice.mp3',
                        language: 'tr',
                    }),
                },
                {
                    SUPABASE_SERVICE_ROLE_KEY: 'mock-key',
                    NEXT_PUBLIC_STORAGE_WORKER_URL: 'https://test-storage.workers.dev',
                }
            )

            expect(result.name).toBe('transcribe_audio')
            expect(result.ok).toBe(true)
            const parsed = JSON.parse(result.result)
            expect(parsed.ok).toBe(true)
            expect(parsed.transcription).toBe('Varoluş özden önce gelir.')
            expect(parsed.vtt).toBeDefined()
        })
    })

    describe('synthesize_speech (MeloTTS / Deepgram Aura)', () => {
        it('rejects empty text', async () => {
            const result = await executeToolCall({
                id: 'call-s1',
                name: 'synthesize_speech',
                argumentsJson: JSON.stringify({}),
            })
            expect(result.ok).toBe(false)
            const parsed = JSON.parse(result.result)
            expect(parsed.error).toContain('text is required')
        })

        it('resolves tool alias speak_text and formats audio player embed', async () => {
            const fetchMock = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    ok: true,
                    storage_key: 'users/test-user/generated/speech-1.mp3',
                    url: '/users/test-user/generated/speech-1.mp3',
                    content_type: 'audio/mpeg',
                }),
            })
            globalThis.fetch = fetchMock

            const result = await executeToolCall(
                {
                    id: 'call-s2',
                    name: 'speak_text',
                    argumentsJson: JSON.stringify({
                        text: 'Düşünüyorum, öyleyse varım.',
                        language: 'tr',
                    }),
                },
                {
                    SUPABASE_SERVICE_ROLE_KEY: 'mock-key',
                    NEXT_PUBLIC_STORAGE_WORKER_URL: 'https://test-storage.workers.dev',
                }
            )

            expect(result.name).toBe('synthesize_speech')
            expect(result.ok).toBe(true)
            const parsed = JSON.parse(result.result)
            expect(parsed.ok).toBe(true)
            expect(parsed.url).toBe('https://test-storage.workers.dev/users/test-user/generated/speech-1.mp3')
            expect(parsed.player_html).toContain('<audio controls')
            expect(parsed.markdown).toContain('[🔊 Dinle:')
        })

        it('connects to live Cloudflare worker and synthesizes real playable audio in R2', async () => {
            const result = await executeToolCall(
                {
                    id: 'call-s-live',
                    name: 'synthesize_speech',
                    argumentsJson: JSON.stringify({
                        text: 'Felsefe, şüphe ile başlar.',
                        language: 'tr',
                    }),
                },
                {
                    SUPABASE_SERVICE_ROLE_KEY: liveToken,
                    NEXT_PUBLIC_STORAGE_WORKER_URL: liveWorkerUrl,
                }
            )

            expect(result.ok).toBe(true)
            const parsed = JSON.parse(result.result)
            expect(parsed.ok).toBe(true)
            expect(parsed.url).toContain('https://worldinmaking-storage.dursunkayamustafa.workers.dev/')

            // Verify public accessibility
            const audioRes = await fetch(parsed.url)
            expect(audioRes.ok).toBe(true)
            expect(audioRes.headers.get('content-type')).toContain('audio')
        }, 30000)
    })
})
