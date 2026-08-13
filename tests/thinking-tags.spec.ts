import { test, expect } from '@playwright/test'
import { parseThinkingAndReply } from '../src/lib/bots/thinking'
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
})
