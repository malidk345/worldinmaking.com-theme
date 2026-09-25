/**
 * Audit bug 1 — "empty answer after tools".
 * The post-tool answer round failed (or came back empty) and the host shipped
 * "Completed requested tool actions.", which the quality gate then rewrote into
 * persona prose. These tests pin the recovery: one tools-off retry on the next
 * key/model, honest localized copy when that fails, and no quality gate on it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runToolLoop } from './loop'
import { streamBotTurn } from '../orchestrate'
import { __resetAcademicSearchStateForTests } from '../academic-search'
import { __setAcademicCacheForTests } from '../academic-cache'
import {
    answerIncompleteMessage,
    buildNoToolSynthesisMessages,
    gatheredToolResults,
    LOOP_ACTIONS_PLACEHOLDER,
    redactProviderDetail,
} from './answer-recovery'
import type { ChatMessage } from './pipeline'

type Scenario = {
    /** Post-tool answer round (tools on, function results present). */
    answer: 'error503' | 'error400sig' | 'empty' | 'text'
    /** Tools-off synthesis retry. */
    synthesis: 'text' | 'error500' | 'empty'
    /** First-round tool the model picks. */
    tool?: { name: string; args: Record<string, unknown> }
}

type GeminiCall = { model: string; tools: boolean; kind: 'first' | 'answer' | 'think' | 'synthesis' | 'other'; body: any }

const sse = (chunks: unknown[]) =>
    new Response(chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join(''), {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
    })
const parts = (items: unknown[]) => ({ candidates: [{ content: { parts: items } }] })
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

function installFetch(scenario: Scenario) {
    const calls: GeminiCall[] = []
    const tool = scenario.tool || { name: 'search_academic_corpus', args: { query: 'Heidegger Gestell technology' } }
    globalThis.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const url = String(input)
        if (url.includes('generativelanguage.googleapis.com')) {
            const body = JSON.parse(String(init?.body || '{}'))
            const model = url.split('/models/')[1]?.split(':')[0] || ''
            const contents = JSON.stringify(body.contents || [])
            const hasToolResult = contents.includes('functionResponse')
            const isSynthesis = !body.tools && contents.includes('Tool results already gathered')
            const kind: GeminiCall['kind'] = isSynthesis
                ? 'synthesis'
                : body.tools && !hasToolResult
                  ? 'first'
                  : body.tools
                    ? 'answer'
                    : body.contents
                      ? 'think'
                      : 'other'
            calls.push({ model, tools: Boolean(body.tools), kind, body })
            if (kind === 'first') {
                return sse([parts([{ functionCall: { name: tool.name, args: tool.args }, thoughtSignature: 'sig-1' }])])
            }
            if (kind === 'answer') {
                if (scenario.answer === 'error503')
                    return json({ error: { code: 503, message: 'The model is overloaded. Please try again later.', status: 'UNAVAILABLE' } }, 503)
                if (scenario.answer === 'error400sig')
                    return json({ error: { code: 400, message: 'Function call is missing a thought_signature in functionCall parts.', status: 'INVALID_ARGUMENT' } }, 400)
                if (scenario.answer === 'empty') return sse([parts([])])
                return sse([parts([{ text: 'Direct answer citing [P1].' }])])
            }
            if (kind === 'synthesis') {
                if (scenario.synthesis === 'error500') return json({ error: { code: 500, message: 'Internal error encountered.' } }, 500)
                if (scenario.synthesis === 'empty') return sse([parts([])])
                return sse([parts([{ text: 'Heidegger reads technology as Gestell ' }]), parts([{ text: '[P1].' }])])
            }
            // Post-tool reflect (THINK) and anything else: short private note.
            // (Empty scenario: a silent reflect, so the pipeline cannot dump it as the answer.)
            if (scenario.answer === 'empty') return sse([parts([])])
            return sse([parts([{ text: 'Enough evidence; write the answer.' }])])
        }
        if (url.includes('api.crossref.org')) {
            return json({
                message: {
                    items: [
                        {
                            DOI: '10.1000/heidegger.1',
                            title: ['Heidegger, Gestell and the question concerning technology'],
                            author: [{ given: 'Ada', family: 'Keller' }],
                            issued: { 'date-parts': [[2019]] },
                            'container-title': ['Philosophy Today'],
                        },
                    ],
                },
            })
        }
        return new Response('not found', { status: 404 })
    }) as unknown as typeof fetch
    return calls
}

const GEMINI_ENV = { GEMINI_API_KEY: 'test-gemini-key' } as Record<string, string>

describe('answer recovery after tools (audit bug 1)', () => {
    const originalFetch = globalThis.fetch
    let warns: string[]
    let infos: string[]

    beforeEach(() => {
        warns = []
        infos = []
        vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
            warns.push(args.map(String).join(' '))
        })
        vi.spyOn(console, 'info').mockImplementation((...args: unknown[]) => {
            infos.push(args.map(String).join(' '))
        })
        __resetAcademicSearchStateForTests(0, 0)
        __setAcademicCacheForTests(null)
    })
    afterEach(() => {
        globalThis.fetch = originalFetch
        __setAcademicCacheForTests(undefined)
        vi.restoreAllMocks()
    })

    it('failed final round → tools-off retry on the next model writes the answer', async () => {
        const calls = installFetch({ answer: 'error503', synthesis: 'text' })
        const tokens: string[] = []
        const toolEvents: string[] = []
        const result = await runToolLoop({
            systemPrompt: 'SYS',
            userPrompt: 'Find academic sources on Heidegger and technology',
            env: GEMINI_ENV,
            onToken: (text) => tokens.push(text),
            onTool: (event) => toolEvents.push(`${event.name}:${event.status}`),
        })

        expect(result.ok).toBe(true)
        expect(result.text).toBe('Heidegger reads technology as Gestell [P1].')
        expect(result.text).not.toContain(LOOP_ACTIONS_PLACEHOLDER)
        expect(result.recoveredAnswer).toBe(true)
        expect(result.fallback).toBeUndefined()
        expect(result.citations.length).toBeGreaterThan(0)
        expect(tokens.join('')).toBe('Heidegger reads technology as Gestell [P1].')
        // Tools ran once; the retry re-used their results instead of re-running them.
        expect(toolEvents.filter((item) => item === 'search_academic_corpus:done')).toHaveLength(1)

        const answer = calls.find((call) => call.kind === 'answer')!
        const synthesis = calls.filter((call) => call.kind === 'synthesis')
        expect(synthesis).toHaveLength(1)
        // Next model in the existing chain, tools disabled, real answer budget.
        expect(synthesis[0].model).not.toBe(answer.model)
        expect(synthesis[0].tools).toBe(false)
        expect(synthesis[0].body.toolConfig).toBeUndefined()
        expect(synthesis[0].body.generationConfig.maxOutputTokens).toBe(8192)
        // Tool results travel as plain text — no functionCall/functionResponse/signatures.
        const synthContents = JSON.stringify(synthesis[0].body.contents)
        expect(synthContents).toContain('[search_academic_corpus]')
        expect(synthContents).toContain('[P1]')
        expect(synthContents).not.toContain('functionCall')
        expect(synthContents).not.toContain('functionResponse')
        expect(synthContents).not.toContain('sig-1')

        // Server-side failure detail is logged (status + provider message), key never.
        const failureLog = warns.find((line) => line.includes('[tools] answer round failed')) || ''
        expect(failureLog).toContain('"status":503')
        expect(failureLog).toContain('overloaded')
        expect(failureLog).toContain('"toolResults":1')
        expect(failureLog).not.toContain('test-gemini-key')
        expect(infos.some((line) => line.includes('[tools] answer synthesis retry') && line.includes('"ok":true'))).toBe(true)
    })

    it('recovers from a thought_signature 400 on the answer round (no longer terminal)', async () => {
        installFetch({ answer: 'error400sig', synthesis: 'text' })
        const result = await runToolLoop({ systemPrompt: 'SYS', userPrompt: 'Heidegger technology sources', env: GEMINI_ENV })
        expect(result.recoveredAnswer).toBe(true)
        expect(result.text).toContain('[P1]')
        expect(warns.some((line) => line.includes('thought_signature'))).toBe(true)
    })

    it('empty answer round after research → tools-off retry instead of the generic placeholder', async () => {
        const calls = installFetch({ answer: 'empty', synthesis: 'text' })
        const result = await runToolLoop({ systemPrompt: 'SYS', userPrompt: 'Heidegger technology sources', env: GEMINI_ENV })
        expect(result.text).toBe('Heidegger reads technology as Gestell [P1].')
        expect(result.text).not.toContain('Requested operations and tool actions completed successfully.')
        expect(result.recoveredAnswer).toBe(true)
        expect(calls.filter((call) => call.kind === 'synthesis')).toHaveLength(1)
        expect(warns.some((line) => line.includes('[tools] answer round failed') && line.includes('"stage":"empty"'))).toBe(true)
    })

    it('all retries fail → honest English message, sources kept, marked as fallback', async () => {
        const calls = installFetch({ answer: 'error503', synthesis: 'error500' })
        const tokens: string[] = []
        const result = await runToolLoop({
            systemPrompt: 'SYS',
            userPrompt: 'Find academic sources on Heidegger and technology',
            env: GEMINI_ENV,
            onToken: (text) => tokens.push(text),
        })
        expect(result.ok).toBe(true)
        expect(result.fallback).toBe('answer_incomplete')
        expect(result.text).toBe(answerIncompleteMessage('Find academic sources', true))
        expect(result.text).toMatch(/couldn't finish writing the answer\. Please try again\./)
        expect(result.text).not.toContain(LOOP_ACTIONS_PLACEHOLDER)
        expect(result.citations.length).toBeGreaterThan(0)
        expect(tokens.join('')).toBe(result.text)
        // Exactly one retry, not a walk over the whole chain.
        expect(calls.filter((call) => call.kind === 'synthesis')).toHaveLength(1)
        expect(result.error).toContain('503')
        expect(infos.some((line) => line.includes('[tools] answer synthesis retry') && line.includes('"status":500'))).toBe(true)
    })

    it('all retries fail → Turkish message when the user wrote Turkish', async () => {
        installFetch({ answer: 'error503', synthesis: 'empty' })
        const question = 'Heidegger teknoloji eleştirisi hakkında akademik kaynak bul'
        const result = await runToolLoop({
            systemPrompt: 'SYS',
            // userPrompt is host-wrapped in production; the raw question picks the language.
            userPrompt: `User request:\n${question}`,
            languageSample: question,
            env: GEMINI_ENV,
        })
        expect(result.fallback).toBe('answer_incomplete')
        expect(result.text).toBe('Kaynakları buldum ama cevabı yazmayı tamamlayamadım. Lütfen tekrar deneyin. Bulduğum kaynaklar aşağıda.')
    })

    it('action-only turn keeps the confirmation text but flags it (no persona rewrite)', async () => {
        installFetch({
            answer: 'error503',
            synthesis: 'error500',
            tool: { name: 'open_path', args: { path: '/notebooks' } },
        })
        const result = await runToolLoop({ systemPrompt: 'SYS', userPrompt: 'Open my notebooks', env: GEMINI_ENV })
        expect(result.text).toBe(LOOP_ACTIONS_PLACEHOLDER)
        expect(result.fallback).toBe('actions_placeholder')
    })

    describe('orchestrator quality gate', () => {
        const baseInput = {
            philosopher: 'Nietzsche',
            taskType: 'autonomous_assistant' as const,
            enableTools: true,
            env: GEMINI_ENV,
        }

        it('skips the quality gate / persona rewrite for fallback output', async () => {
            const calls = installFetch({ answer: 'error503', synthesis: 'error500' })
            const phases: string[] = []
            const result = await streamBotTurn(
                {
                    ...baseInput,
                    question: 'Find academic sources on Heidegger and technology',
                    onLifecycle: (event) => phases.push(`${event.phase}:${event.status}`),
                },
                () => undefined
            )
            expect(result.success).toBe(true)
            expect(result.reply).toBe(answerIncompleteMessage('Find academic sources', true))
            expect(result.qualityGate).toBeUndefined()
            expect(phases.some((phase) => phase.startsWith('quality_gate'))).toBe(false)
            // No critic/gateway round trip was spent rewriting the fallback.
            expect(calls.filter((call) => call.kind === 'other')).toHaveLength(0)
            expect(result.citations?.length).toBeGreaterThan(0)
        })

        it('still runs the quality gate on a recovered (model-written) answer', async () => {
            installFetch({ answer: 'error503', synthesis: 'text' })
            const phases: string[] = []
            const result = await streamBotTurn(
                {
                    ...baseInput,
                    question: 'Find academic sources on Heidegger and technology',
                    onLifecycle: (event) => phases.push(`${event.phase}:${event.status}`),
                },
                () => undefined
            )
            expect(result.success).toBe(true)
            expect(result.reply).toContain('Gestell')
            expect(phases).toContain('quality_gate:started')
        })
    })
})

describe('answer-recovery helpers', () => {
    it('flattens history to provider-agnostic text and folds tool results into the user turn', () => {
        const messages: ChatMessage[] = [
            { role: 'system', content: 'SYS' },
            { role: 'user', content: 'earlier question' },
            {
                role: 'assistant',
                content: null,
                tool_calls: [{ id: 'old', type: 'function', function: { name: 'web_search', arguments: '{}' }, thoughtSignature: 'old-sig' }],
                geminiModelParts: [{ functionCall: { name: 'web_search', args: {} }, thoughtSignature: 'old-sig' }],
            },
            { role: 'tool', tool_call_id: 'old', content: 'old result' },
            { role: 'assistant', content: 'earlier answer' },
            { role: 'user', content: 'current question' },
            {
                role: 'assistant',
                content: null,
                tool_calls: [{ id: 'c1', type: 'function', function: { name: 'search_academic_corpus', arguments: '{}' }, thoughtSignature: 'sig' }],
            },
            { role: 'tool', tool_call_id: 'c1', content: 'ACADEMIC SEARCH — [P1] Paper' },
        ]
        const turnStart = 6
        const results = gatheredToolResults(messages, turnStart)
        expect(results).toEqual([{ name: 'search_academic_corpus', content: 'ACADEMIC SEARCH — [P1] Paper' }])
        const out = buildNoToolSynthesisMessages({ messages, turnStart, results })
        expect(out.map((item) => item.role)).toEqual(['system', 'user', 'assistant', 'user'])
        expect(out.every((item) => !item.tool_calls && !item.geminiModelParts && !item.tool_call_id)).toBe(true)
        expect(out[3].content).toContain('current question')
        expect(out[3].content).toContain('[search_academic_corpus]')
        expect(out[3].content).toContain('Tools are unavailable for this reply')
        expect(JSON.stringify(out)).not.toContain('sig')
    })

    it('redacts key-shaped strings from provider details', () => {
        const detail = redactProviderDetail(
            'fetch https://x.googleapis.com/v1/models/m:gen?alt=sse&key=AIzaSyA1234567890abcdefghijk failed; Bearer gsk_abcdefghijklmnop123'
        )
        expect(detail).not.toContain('AIzaSyA1234567890abcdefghijk')
        expect(detail).not.toContain('gsk_abcdefghijklmnop123')
        expect(detail).toContain('key=[redacted]')
    })

    it('localizes the honest message', () => {
        expect(answerIncompleteMessage('What did Kant say about luck?', true)).toBe(
            "I found sources, but I couldn't finish writing the answer. Please try again. The sources I found are listed below."
        )
        expect(answerIncompleteMessage('Kant ahlaki şans hakkında ne dedi?', false)).toBe(
            'Araç adımları çalıştı ama cevabı yazmayı tamamlayamadım. Lütfen tekrar deneyin.'
        )
    })
})
