import { test, expect } from '@playwright/test'
import { ASK_AI_GOLDEN, evaluateGoldenCase } from '../src/lib/bots/tools/golden'
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
})
