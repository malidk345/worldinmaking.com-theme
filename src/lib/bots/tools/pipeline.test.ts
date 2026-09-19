import { describe, expect, it } from 'vitest'
import { geminiToolGenerationConfig } from './gemini'
import {
    runAgentNodePipeline,
    THINK_MAX_TOKENS,
    THINK_PLAN_INSTRUCTION,
    THINK_REFLECT_INSTRUCTION,
    type AgentPipelineParams,
    type CompletionRound,
} from './pipeline'

describe('Pipeline Abort Handling', () => {
    it('aborts execution when signal is triggered', async () => {
        const controller = new AbortController()

        const mockComplete = async (): Promise<CompletionRound> => {
            return {
                ok: true,
                content: 'Executing tool',
                toolCalls: [{ id: '1', name: 'search_site', argumentsJson: '{}' }]
            }
        }

        const params: AgentPipelineParams = {
            complete: mockComplete,
            baseMessages: [],
            provider: 'test',
            signal: controller.signal,
        }

        // Abort before it even starts running the tool or loop
        controller.abort()
        const result = await runAgentNodePipeline(params)

        expect(result.ok).toBe(false)
        expect(result.error).toBe('client request aborted')
    })
})

describe('Think token budget', () => {
    it('keeps host THINK as a short routing note, not an essay', () => {
        expect(THINK_MAX_TOKENS).toBe(256)
        expect(THINK_PLAN_INSTRUCTION.toLowerCase()).toContain('few short sentences')
        expect(THINK_PLAN_INSTRUCTION.toLowerCase()).not.toContain('exhaustive')
        expect(THINK_REFLECT_INSTRUCTION.toLowerCase()).toContain('few short sentences')
        expect(THINK_REFLECT_INSTRUCTION.toLowerCase()).not.toContain('exhaustive')
    })

    it('does not spend Gemini native thinking on the host THINK round', () => {
        const think = geminiToolGenerationConfig({ omitTools: true, maxTokens: THINK_MAX_TOKENS })
        expect(think.maxOutputTokens).toBe(256)
        expect(think.thinkingConfig.thinkingBudget).toBe(0)
        expect(think.thinkingConfig.includeThoughts).toBe(false)

        const act = geminiToolGenerationConfig({ omitTools: false })
        expect(act.maxOutputTokens).toBe(8192)
        expect(act.thinkingConfig.thinkingBudget).toBe(512)
        expect(act.thinkingConfig.includeThoughts).toBe(true)
    })
})
