import { test, expect } from '@playwright/test'
import { parseThinkingAndReply, usesNativeQwenReasoning, shouldPromptThinkingTags, buildThinkingInstruction } from '../src/lib/bots/thinking'
import { extractProviderReasoning, getFamilyOrder, markFamilyCooling, resetProviderCooldowns } from '../src/lib/bots/ai-gateway'
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

        demux.push('Public </thi', (value) => publicText.push(value), (value) => thinkingText.push(value))
        demux.push('nking> next', (value) => publicText.push(value), (value) => thinkingText.push(value))
        demux.finish((value) => publicText.push(value), (value) => thinkingText.push(value))

        expect(publicText.join('')).toBe('Public  next')
        expect(thinkingText).toEqual([])
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

    test('native Qwen reasoning is on for balanced and off for brief', () => {
        expect(usesNativeQwenReasoning('brief')).toBe(false)
        expect(usesNativeQwenReasoning('standard')).toBe(true)
        expect(usesNativeQwenReasoning('deep')).toBe(true)
        expect(shouldPromptThinkingTags('brief')).toBe(true)
        expect(shouldPromptThinkingTags('standard')).toBe(false)
        expect(buildThinkingInstruction('autonomous_assistant', 'standard')).not.toMatch(/1–3 sentences/)
        expect(buildThinkingInstruction('autonomous_assistant', 'brief')).toContain('<thinking>')
    })

    test('every philosopher uses Groq first unless Groq is cooling', () => {
        resetProviderCooldowns()
        expect(getFamilyOrder()).toEqual(['groq', 'gemini', 'huggingface', 'openrouter'])
        markFamilyCooling('groq')
        expect(getFamilyOrder()[0]).not.toBe('groq')
        expect(getFamilyOrder()[getFamilyOrder().length - 1]).toBe('groq')
        resetProviderCooldowns()
        expect(getFamilyOrder()[0]).toBe('groq')
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
})
