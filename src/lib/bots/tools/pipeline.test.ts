import { describe, expect, it } from 'vitest'
import { geminiToolGenerationConfig } from './gemini'
import {
    extractFallbackAnswerFromThinking,
    runAgentNodePipeline,
    THINK_MAX_TOKENS,
    THINK_PLAN_INSTRUCTION,
    THINK_REFLECT_INSTRUCTION,
    type AgentPipelineParams,
    type CompletionRound,
} from './pipeline'
import type { AgentActivity } from '../agent/activity'

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

describe('Think-phase absorb demux (Thought UI vs content)', () => {
    const DRAFT_ANSWER = 'FULL DRAFT PUBLIC ANSWER that must not paint ThinkingBlock'
    const NATIVE_PLAN = 'Plan: outline thesis then answer.'
    const PUBLIC_ANSWER = 'Final public answer for the user.'

    function longUserPrompt() {
        // Triggers shouldRunThinkPhase via length (>160) even in ask mode.
        return (
            'Please explain in careful analytical detail why comparative research methods ' +
            'matter for philosophy, including sources, structure, and counter-arguments.'
        )
    }

    it('does not live-stream think-phase onToken content into Thought UI', async () => {
        let round = 0
        const thoughtUi: string[] = []
        const publicTokens: string[] = []
        const thoughtActivityDeltas: string[] = []

        const complete: AgentPipelineParams['complete'] = async (input) => {
            round += 1
            if (input.omitTools) {
                // Host THINK: native reasoning + content draft (the leak case).
                input.onThinking?.(NATIVE_PLAN)
                input.onToken?.(DRAFT_ANSWER)
                return {
                    ok: true,
                    content: DRAFT_ANSWER,
                    toolCalls: [],
                    reasoning: NATIVE_PLAN,
                }
            }
            // Decision round: public stream only.
            input.onToken?.(PUBLIC_ANSWER)
            return { ok: true, content: PUBLIC_ANSWER, toolCalls: [] }
        }

        const result = await runAgentNodePipeline({
            complete,
            baseMessages: [
                { role: 'system', content: 'You are a careful philosopher.' },
                { role: 'user', content: longUserPrompt() },
            ],
            provider: 'test',
            agentMode: 'ask',
            onThinking: (piece) => thoughtUi.push(piece),
            onToken: (piece) => publicTokens.push(piece),
            onActivity: (activity: AgentActivity) => {
                if (activity.kind === 'thought' && activity.delta) {
                    thoughtActivityDeltas.push(activity.delta)
                }
            },
        })

        expect(round).toBeGreaterThanOrEqual(2)
        expect(result.ok).toBe(true)
        expect(result.text).toContain(PUBLIC_ANSWER)

        const thoughtJoined = thoughtUi.join('')
        const activityJoined = thoughtActivityDeltas.join('')
        expect(thoughtJoined).toContain(NATIVE_PLAN)
        expect(thoughtJoined).not.toContain(DRAFT_ANSWER)
        expect(activityJoined).toContain(NATIVE_PLAN)
        expect(activityJoined).not.toContain(DRAFT_ANSWER)

        expect(publicTokens.join('')).toContain(PUBLIC_ANSWER)
        expect(publicTokens.join('')).not.toContain(DRAFT_ANSWER)
    })

    it('keeps think-phase content for empty-public fallback without Thought UI paint', async () => {
        let round = 0
        const thoughtUi: string[] = []

        const complete: AgentPipelineParams['complete'] = async (input) => {
            round += 1
            if (input.omitTools) {
                // Content-only think (Gemini THINK with thinkingBudget:0).
                input.onToken?.(DRAFT_ANSWER)
                return { ok: true, content: DRAFT_ANSWER, toolCalls: [] }
            }
            // Decision emits no public text — synthesis should recover from thinkingText.
            return { ok: true, content: '', toolCalls: [] }
        }

        const result = await runAgentNodePipeline({
            complete,
            baseMessages: [
                { role: 'system', content: 'You are a careful philosopher.' },
                { role: 'user', content: longUserPrompt() },
            ],
            provider: 'test',
            agentMode: 'plan',
            onThinking: (piece) => thoughtUi.push(piece),
        })

        expect(round).toBeGreaterThanOrEqual(2)
        expect(result.ok).toBe(true)
        expect(thoughtUi.join('')).not.toContain(DRAFT_ANSWER)
        // Fallback recovery still works from buffered think content.
        expect(result.text).toContain(DRAFT_ANSWER)
        expect(extractFallbackAnswerFromThinking(DRAFT_ANSWER)).toContain(DRAFT_ANSWER)
    })

    it('still paints decision-round native onThinking when think phase is skipped', async () => {
        const thoughtUi: string[] = []
        const publicTokens: string[] = []

        const complete: AgentPipelineParams['complete'] = async (input) => {
            expect(input.omitTools).toBeFalsy()
            input.onThinking?.('quick native thought')
            input.onToken?.('Hi!')
            return { ok: true, content: 'Hi!', toolCalls: [], reasoning: 'quick native thought' }
        }

        const result = await runAgentNodePipeline({
            complete,
            baseMessages: [
                { role: 'system', content: 'You are helpful.' },
                { role: 'user', content: 'hi' },
            ],
            provider: 'test',
            agentMode: 'ask',
            onThinking: (piece) => thoughtUi.push(piece),
            onToken: (piece) => publicTokens.push(piece),
        })

        expect(result.ok).toBe(true)
        expect(thoughtUi.join('')).toContain('quick native thought')
        expect(publicTokens.join('')).toContain('Hi!')
    })
})
