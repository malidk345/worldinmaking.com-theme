import { test, expect } from '@playwright/test'
import { parseThinkingAndReply, usesNativeQwenReasoning, shouldPromptThinkingTags, buildThinkingInstruction } from '../src/lib/bots/thinking'
import {
    collectGeminiKeys,
    collectGroqKeys,
    closeReasoningWrap,
    extractGeminiThoughtAndText,
    extractProviderReasoning,
    mergeGeminiThoughtText,
    usesGeminiNativeThinking,
    fitGroqRequest,
    getFamilyOrder,
    nextPrimaryFamilyStart,
    GROQ_TPM_LIMIT,
    isRequestTooLarge,
    markFamilyCooling,
    markGroqKeyCooling,
    resetProviderCooldowns,
    takeGeminiKeyOrder,
    takeGroqKeyOrder,
    wrapReasoningContentChunk,
} from '../src/lib/bots/ai-gateway'
import { ThinkingStreamDemux, stripThinkingBlocks } from '../src/lib/bots/thinking-tags'

test.describe('thinking stream routing', () => {
    test('keeps split thinking tags out of public text without dropping thinking content', () => {
        const demux = new ThinkingStreamDemux()
        const publicChunks: string[] = []
        const thinkingChunks: string[] = []

        for (const chunk of ['Visible before <thi', 'nking>secret </thin', 'king>Visible after']) {
            demux.push(chunk, (value) => publicChunks.push(value), (value) => thinkingChunks.push(value))
        }
        demux.finish((value) => publicChunks.push(value), (value) => thinkingChunks.push(value))

        expect(publicChunks.join('')).toBe('Visible before Visible after')
        expect(thinkingChunks.join('')).toBe('secret ')
    })

    test('routes alternate casing, attributes, and summary wrappers consistently', () => {
        const demux = new ThinkingStreamDemux()
        const publicText: string[] = []
        const thinkingText: string[] = []

        demux.push(
            'A<THOUGHT source="provider">internal</THOUGHT>B<analysis_summary><goal>goal</goal></analysis_summary>C',
            (value) => publicText.push(value),
            (value) => thinkingText.push(value)
        )
        demux.finish((value) => publicText.push(value), (value) => thinkingText.push(value))

        expect(publicText.join('')).toBe('ABC')
        expect(thinkingText.join('')).toContain('internal')
        expect(thinkingText.join('')).toContain('<goal>goal</goal>')
    })

    test('does not flush a split stray closing tag into public output', () => {
        const demux = new ThinkingStreamDemux()
        const publicText: string[] = []
        const thinkingText: string[] = []

        demux.push('leftover CoT </thi', (value) => publicText.push(value), (value) => thinkingText.push(value))
        demux.push('nking> next', (value) => publicText.push(value), (value) => thinkingText.push(value))
        demux.finish((value) => publicText.push(value), (value) => thinkingText.push(value))

        expect(publicText.join('')).toBe(' next')
        expect(thinkingText.join('')).toContain('leftover CoT')
    })

    test('cleans final public replies while retaining parsed thinking content', () => {
        const parsed = parseThinkingAndReply('<thinking>Private detail</thinking>Public answer')

        expect(parsed.reply).toBe('Public answer')
        expect(parsed.thinking.summary).toContain('Private detail')
        expect(stripThinkingBlocks('Before<thought>hidden</thought>After')).toBe('BeforeAfter')
        expect(stripThinkingBlocks('Before<thought>hidden')).toBe('Before')
    })

    test('think-only Qwen output leaves an empty public reply', () => {
        const parsed = parseThinkingAndReply('<think>The price moved because the Fed hinted a cut.</think>')

        expect(parsed.reply).toBe('')
        expect(parsed.thinking.summary).toContain('Fed hinted')
        expect(stripThinkingBlocks(parsed.thinking.summary || '')).toContain('Fed hinted')
    })

    test('unclosed thinking stays private and does not leak the last paragraph', () => {
        const parsed = parseThinkingAndReply(
            '<thinking>Private scratch that never closes.\n\nThe will is a name we give to a pattern of drives.'
        )

        expect(parsed.reply).toBe('')
        expect(parsed.thinking.summary).toContain('Private scratch')
        expect(parsed.thinking.summary).toContain('will is a name')
    })

    test('stray close keeps leftover reasoning out of the public reply', () => {
        const parsed = parseThinkingAndReply('The user wants a table of rates.</think>\nHere is the table.')

        expect(parsed.reply).toContain('Here is the table')
        expect(parsed.reply).not.toContain('user wants')
        expect(parsed.thinking.summary).toContain('user wants')
    })

    test('native think blocks become multiple thinking stages', () => {
        const parsed = parseThinkingAndReply(
            '<think>First look at the claim.\n\nHowever the numbers contradict it.\n\nSo the move is to reject the premise.</think>Public answer'
        )

        expect(parsed.reply).toBe('Public answer')
        expect(parsed.thinking.stages.length).toBeGreaterThanOrEqual(2)
        expect(parsed.thinking.stages.map((stage) => stage.label)).toContain('Evaluating Tension')
    })

    test('demuxes Groq default Qwen chunks that start with a think tag', () => {
        const demux = new ThinkingStreamDemux()
        const publicText: string[] = []
        const thinkingText: string[] = []

        for (const chunk of ['\n<think>\n', 'Here', "'s", ' a', ' process', '</think>', 'Four']) {
            demux.push(chunk, (value) => publicText.push(value), (value) => thinkingText.push(value))
        }
        demux.finish((value) => publicText.push(value), (value) => thinkingText.push(value))

        expect(thinkingText.join('')).toContain("Here's a process")
        expect(publicText.join('').trim()).toBe('Four')
    })

    test('native Qwen reasoning is on for medium and extended', () => {
        expect(usesNativeQwenReasoning(undefined)).toBe(false)
        expect(usesNativeQwenReasoning('brief')).toBe(false)
        expect(usesNativeQwenReasoning('standard')).toBe(true)
        expect(usesNativeQwenReasoning('deep')).toBe(true)
        expect(shouldPromptThinkingTags('brief')).toBe(true)
        expect(shouldPromptThinkingTags('standard')).toBe(false)
        expect(shouldPromptThinkingTags('deep')).toBe(false)
        expect(buildThinkingInstruction('autonomous_assistant', 'standard')).toMatch(/40-80 words/)
        expect(buildThinkingInstruction('autonomous_assistant', 'brief')).toContain('<thinking>')
    })

    test('alternates Groq and Gemini as the lead family, then keeps failover', () => {
        resetProviderCooldowns()
        expect(getFamilyOrder([], 0)).toEqual(['groq', 'gemini'])
        expect(getFamilyOrder([], 1)).toEqual(['gemini', 'groq'])
        markFamilyCooling('groq')
        expect(getFamilyOrder([], 0)[0]).toBe('gemini')
        expect(getFamilyOrder([], 0)[getFamilyOrder([], 0).length - 1]).toBe('groq')
        resetProviderCooldowns()
        expect(getFamilyOrder(['groq'], 0)).not.toContain('groq')
        expect(getFamilyOrder(['groq'], 0)[0]).toBe('gemini')
        expect(getFamilyOrder(['groq'], 1)[0]).toBe('gemini')
    })

    test('each request flips the Groq/Gemini lead without touching key order helpers', () => {
        process.env.WIM_PRIMARY_CURSOR_FILE = `${process.env.TEMP || process.env.TMPDIR || '/tmp'}/wim-primary-cursor-test`
        resetProviderCooldowns()
        expect(nextPrimaryFamilyStart()).toBe(0)
        expect(nextPrimaryFamilyStart()).toBe(1)
        expect(nextPrimaryFamilyStart()).toBe(0)
        resetProviderCooldowns()
        delete process.env.WIM_PRIMARY_CURSOR_FILE
    })

    test('rotates Groq keys instead of always starting at the first one', () => {
        resetProviderCooldowns()
        expect(collectGroqKeys({
            GROQ_API_KEYS: 'gsk_aaa, gsk_bbb',
            GROQ_API_KEY: 'gsk_ccc',
        })).toEqual(['gsk_aaa', 'gsk_bbb', 'gsk_ccc'])
        expect(takeGroqKeyOrder(['a', 'b', 'c'], 0)).toEqual(['a', 'b', 'c'])
        expect(takeGroqKeyOrder(['a', 'b', 'c'], 1)).toEqual(['b', 'c', 'a'])
        expect(takeGroqKeyOrder(['a', 'b', 'c'], 2)).toEqual(['c', 'a', 'b'])
        markGroqKeyCooling('b')
        expect(takeGroqKeyOrder(['a', 'b', 'c'], 0)[0]).not.toBe('b')
        expect(takeGroqKeyOrder(['a', 'b', 'c'], 0)).toContain('b')
        resetProviderCooldowns()
    })

    test('each request advances to the next Groq key in order', () => {
        process.env.WIM_GROQ_CURSOR_FILE = `${process.env.TEMP || process.env.TMPDIR || '/tmp'}/wim-groq-cursor-test`
        resetProviderCooldowns()
        expect(takeGroqKeyOrder(['a', 'b', 'c'])[0]).toBe('a')
        expect(takeGroqKeyOrder(['a', 'b', 'c'])[0]).toBe('b')
        expect(takeGroqKeyOrder(['a', 'b', 'c'])[0]).toBe('c')
        expect(takeGroqKeyOrder(['a', 'b', 'c'])[0]).toBe('a')
        resetProviderCooldowns()
        delete process.env.WIM_GROQ_CURSOR_FILE
    })

    test('rotates Gemini keys independently of Groq and merges env aliases', () => {
        process.env.WIM_GEMINI_CURSOR_FILE = `${process.env.TEMP || process.env.TMPDIR || '/tmp'}/wim-gemini-cursor-test`
        process.env.WIM_GROQ_CURSOR_FILE = `${process.env.TEMP || process.env.TMPDIR || '/tmp'}/wim-groq-cursor-test-gemini`
        resetProviderCooldowns()
        expect(collectGeminiKeys({
            GEMINI_API_KEYS: 'AIza_aaa, AIza_bbb',
            GOOGLE_API_KEY: 'AIza_ccc',
        })).toEqual(['AIza_aaa', 'AIza_bbb', 'AIza_ccc'])
        expect(takeGeminiKeyOrder(['g1', 'g2', 'g3'])[0]).toBe('g1')
        expect(takeGeminiKeyOrder(['g1', 'g2', 'g3'])[0]).toBe('g2')
        expect(takeGeminiKeyOrder(['g1', 'g2', 'g3'])[0]).toBe('g3')
        expect(takeGroqKeyOrder(['a', 'b', 'c'])[0]).toBe('a')
        resetProviderCooldowns()
        delete process.env.WIM_GEMINI_CURSOR_FILE
        delete process.env.WIM_GROQ_CURSOR_FILE
    })

    test('fits thinking requests under Groq 8k TPM including max_tokens', () => {
        const hugeSystem = 'persona '.repeat(3000)
        const hugeUser = 'soru '.repeat(1500)
        const history = Array.from({ length: 8 }, (_, i) => ({
            role: i % 2 === 0 ? 'user' as const : 'assistant' as const,
            content: 'onceki tur '.repeat(400),
        }))

        const fitted = fitGroqRequest({
            model: 'qwen/qwen3.6-27b',
            systemPrompt: hugeSystem,
            userPrompt: hugeUser,
            history,
            thinkingDepth: 'standard',
        })

        expect(fitted.skip).toBe(false)
        expect(fitted.maxTokens).toBeGreaterThanOrEqual(256)
        expect(fitted.promptTokens + fitted.maxTokens).toBeLessThanOrEqual(GROQ_TPM_LIMIT)
        expect(isRequestTooLarge('413 Request too large for model minute (TPM): Limit 8000')).toBe(true)
        expect(isRequestTooLarge('429 Rate limit reached for model on tokens per minute (TPM): Limit 8000')).toBe(false)
    })

    test('compact Groq thinking budget is smaller than the default thinking budget', () => {
        const systemPrompt = 'You are Nietzsche. '.repeat(200)
        const userPrompt = 'What is will to power? '.repeat(80)
        const normal = fitGroqRequest({
            model: 'qwen/qwen3.6-27b',
            systemPrompt,
            userPrompt,
            thinkingDepth: 'deep',
        })
        const compact = fitGroqRequest({
            model: 'qwen/qwen3.6-27b',
            systemPrompt,
            userPrompt,
            thinkingDepth: 'deep',
            compact: true,
        })

        expect(compact.promptTokens + compact.maxTokens).toBeLessThanOrEqual(GROQ_TPM_LIMIT)
        expect(compact.promptTokens).toBeLessThanOrEqual(normal.promptTokens)
    })

    test('does not emit unwrapped reasoning when content already has think tags', () => {
        const state = { opened: false, closed: false }
        const pieces = wrapReasoningContentChunk(state, 'duplicate CoT', '<think>real CoT</think>Answer')
        expect(pieces.join('')).toBe('<think>real CoT</think>Answer')
        expect(pieces.join('')).not.toContain('duplicate CoT')
    })

    test('wraps provider reasoning so it cannot leak as public text', () => {
        const state = { opened: false, closed: false }
        const mixed = [
            ...wrapReasoningContentChunk(state, 'private chain', ''),
            ...wrapReasoningContentChunk(state, '', 'Visible answer'),
            ...closeReasoningWrap(state),
        ].join('')

        const demux = new ThinkingStreamDemux()
        const publicText: string[] = []
        const thinkingText: string[] = []
        demux.push(mixed, (value) => publicText.push(value), (value) => thinkingText.push(value))
        demux.finish((value) => publicText.push(value), (value) => thinkingText.push(value))

        expect(publicText.join('')).toBe('Visible answer')
        expect(thinkingText.join('')).toContain('private chain')
        expect(publicText.join('')).not.toContain('private chain')
    })

    test('reads Groq parsed and OpenAI-style reasoning fields', () => {
        expect(
            extractProviderReasoning({
                choices: [{ delta: { reasoning: 'The user wants a table.' } }],
            })
        ).toBe('The user wants a table.')
        expect(
            extractProviderReasoning({
                choices: [{ message: { reasoning_content: 'Check the numbers first.' } }],
            })
        ).toBe('Check the numbers first.')
        expect(
            extractProviderReasoning({
                choices: [{ delta: { reasoning: { content: 'Nested reasoning object.' } } }],
            })
        ).toBe('Nested reasoning object.')
    })

    test('Gemini thought parts become tagged thinking, not public text', () => {
        expect(usesGeminiNativeThinking('gemini-2.5-flash', 'deep')).toBe(true)
        expect(usesGeminiNativeThinking('gemini-flash-latest', 'deep')).toBe(true)
        expect(usesGeminiNativeThinking('gemini-2.0-flash', 'deep')).toBe(false)
        expect(usesGeminiNativeThinking('gemini-2.5-flash', 'brief')).toBe(false)

        const extracted = extractGeminiThoughtAndText({
            candidates: [
                {
                    content: {
                        parts: [
                            { thought: true, text: 'The user asked for a table.' },
                            { text: 'Here is the table.' },
                        ],
                    },
                },
            ],
        })
        expect(extracted.thought).toBe('The user asked for a table.')
        expect(extracted.text).toBe('Here is the table.')

        const merged = mergeGeminiThoughtText(extracted.thought, extracted.text)
        expect(merged).toBe('<think>The user asked for a table.</think>Here is the table.')

        const demux = new ThinkingStreamDemux()
        const publicText: string[] = []
        const thinkingText: string[] = []
        demux.push(merged, (value) => publicText.push(value), (value) => thinkingText.push(value))
        demux.finish((value) => publicText.push(value), (value) => thinkingText.push(value))
        expect(publicText.join('')).toBe('Here is the table.')
        expect(thinkingText.join('')).toContain('The user asked for a table.')
    })
})
