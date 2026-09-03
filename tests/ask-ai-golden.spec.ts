import { test, expect } from '@playwright/test'
import { ASK_AI_GOLDEN, ASK_AI_INJECTION_GOLDEN, ASK_AI_REPLAY, evaluateGoldenCase } from '../src/lib/bots/tools/golden'
import { getAskAiSystemPrompt } from '../src/lib/bots/ask-ai'
import { runtimeLabel } from '../src/lib/bots/provider-errors'
import { processArtifactRevision } from '../src/components/ClaudeWorkspaceChat/utils/toolCalling'

test.describe('Ask AI golden tours', () => {
    test('protocol flags match the eight tours', () => {
        expect(ASK_AI_GOLDEN).toHaveLength(8)
        for (const item of ASK_AI_GOLDEN) {
            const got = evaluateGoldenCase(item)
            expect(got.liveWeb, item.id).toBe(item.needsLiveWeb)
            expect(got.notebook, item.id).toBe(item.notebookTask)
        }
    })

    test('identity tour is Ask AI, not the underlying model', () => {
        const prompt = getAskAiSystemPrompt({ voiceName: 'Nietzsche' })
        expect(prompt).toContain('WorldInMaking Ask AI')
        expect(prompt).not.toContain('You ARE the assigned philosopher')
        expect(runtimeLabel('groq')).toBe('Groq')
        expect(runtimeLabel('gemini-fetch:tools')).toBe('Gemini')
        expect(runtimeLabel('none')).toBe('')
    })

    test('open canvas artifact is preferred for revision', () => {
        const existing = [
            {
                id: 'art-open',
                title: 'Checkout flow',
                type: 'mermaid' as const,
                content: 'flowchart TD\n A-->B',
                version: 1,
                createdAt: '2026-01-01',
            },
        ]
        const { activeArtifact } = processArtifactRevision(
            existing,
            { title: 'Navy checkout', type: 'mermaid', content: 'flowchart TD\n A-->C' },
            { preferId: 'art-open' }
        )
        expect(activeArtifact.id).toBe('art-open')
        expect(activeArtifact.version).toBe(2)
        expect(activeArtifact.content).toContain('A-->C')
    })

    test('injection and replay goldens stay fixed', () => {
        expect(ASK_AI_INJECTION_GOLDEN.map((item) => item.id)).toEqual([
            'ignore_system',
            'identity_swap',
            'tool_from_page',
            'ask_user_leak',
            'disable_gate',
            'private_fetch',
        ])
        expect(ASK_AI_REPLAY.map((item) => item.id)).toEqual([
            'lock_mutate',
            'finalize',
            'execute_create',
            'unknown_ask_user',
            'open_passwd',
            'fetch_localhost',
        ])
    })

})
