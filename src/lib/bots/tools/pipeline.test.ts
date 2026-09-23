import { describe, expect, it } from 'vitest'
import { geminiToolGenerationConfig, THINK_NATIVE_BUDGET } from './gemini'
import {
    compactLoopMessages,
    isWeakerModel3dRevision,
    digestToolResultForLoop,
    extractFallbackAnswerFromThinking,
    LONG_JOB_CONTINUE_NUDGE,
    LOOP_OLD_TOOL_CHARS,
    LOOP_RECENT_TOOL_CHARS,
    LOOP_RECENT_TOOL_KEEP,
    PLAN_RESEARCH_CLUSTER_N,
    finalizePlanReadinessReminder,
    PUBLIC_CONTINUE_NUDGE,
    runAgentNodePipeline,
    normalizeFetchUrlCacheKey,
    researchToolCacheKey,
    shareInflight,
    thinkInstructionFor,
    THINK_MAX_TOKENS,
    THINK_TIMEOUT_MS,
    THINK_PLAN_INSTRUCTION,
    THINK_PLAN_MODE_INSTRUCTION,
    THINK_REFLECT_INSTRUCTION,
    THINK_REFLECT_PLAN_INSTRUCTION,
    type AgentPipelineParams,
    type ChatMessage,
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
        expect(THINK_TIMEOUT_MS).toBe(15_000)
        expect(THINK_PLAN_INSTRUCTION.toLowerCase()).toContain('few short sentences')
        expect(THINK_PLAN_INSTRUCTION.toLowerCase()).not.toContain('exhaustive')
        expect(THINK_REFLECT_INSTRUCTION.toLowerCase()).toContain('few short sentences')
        expect(THINK_REFLECT_INSTRUCTION.toLowerCase()).not.toContain('exhaustive')
        expect(thinkInstructionFor('plan', false)).toBe(THINK_PLAN_MODE_INSTRUCTION)
        expect(thinkInstructionFor('plan', true)).toBe(THINK_REFLECT_PLAN_INSTRUCTION)
        expect(THINK_PLAN_MODE_INSTRUCTION.toLowerCase()).toMatch(/this step only/)
        expect(PLAN_RESEARCH_CLUSTER_N).toBe(5)
    })

    it('spends modest Gemini native thinking on host THINK for early Thought paint', () => {
        const think = geminiToolGenerationConfig({ omitTools: true, maxTokens: THINK_MAX_TOKENS })
        expect(think.maxOutputTokens).toBe(256)
        expect(THINK_NATIVE_BUDGET).toBe(128)
        expect(think.thinkingConfig.thinkingBudget).toBe(THINK_NATIVE_BUDGET)
        expect(think.thinkingConfig.includeThoughts).toBe(true)
        // Keep native budget under content cap so routing notes can still land if shared.
        expect(think.thinkingConfig.thinkingBudget).toBeLessThan(think.maxOutputTokens)

        const act = geminiToolGenerationConfig({ omitTools: false })
        expect(act.maxOutputTokens).toBe(8192)
        expect(act.thinkingConfig.thinkingBudget).toBe(512)
        expect(act.thinkingConfig.includeThoughts).toBe(true)
    })
})

describe('Research breadth + speed pack', () => {
    it('encourages parallel research fan-out in plan think/reflect', () => {
        expect(THINK_PLAN_MODE_INSTRUCTION.toLowerCase()).toMatch(/parallel|fan-out|2–5|2-5|together/)
        expect(THINK_REFLECT_PLAN_INSTRUCTION.toLowerCase()).toMatch(/fan out|parallel|together/)
        expect(PLAN_RESEARCH_CLUSTER_N).toBeGreaterThanOrEqual(5)
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
                expect(input.timeoutMs).toBe(THINK_TIMEOUT_MS)
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
                // Content-only think (no native onThinking deltas — fallback path).
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

    it('streams decision native onThinking after content-only think (no Thought dump-at-end)', async () => {
        let round = 0
        const thoughtUi: string[] = []
        const thoughtActivityDeltas: string[] = []
        const DECISION_THOUGHT_A = 'First native reasoning piece. '
        const DECISION_THOUGHT_B = 'Second native reasoning piece.'

        const complete: AgentPipelineParams['complete'] = async (input) => {
            round += 1
            if (input.omitTools) {
                // Content-only THINK fallback: planning content only, no native thoughts.
                input.onToken?.(DRAFT_ANSWER)
                return { ok: true, content: DRAFT_ANSWER, toolCalls: [] }
            }
            // Decision: native reasoning streams token-by-token (must reach Thought UI).
            input.onThinking?.(DECISION_THOUGHT_A)
            input.onThinking?.(DECISION_THOUGHT_B)
            input.onToken?.(PUBLIC_ANSWER)
            return {
                ok: true,
                content: PUBLIC_ANSWER,
                toolCalls: [],
                reasoning: DECISION_THOUGHT_A + DECISION_THOUGHT_B,
            }
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
            onActivity: (activity: AgentActivity) => {
                if (activity.kind === 'thought' && activity.delta) {
                    thoughtActivityDeltas.push(activity.delta)
                }
            },
        })

        expect(round).toBeGreaterThanOrEqual(2)
        expect(result.ok).toBe(true)

        const thoughtJoined = thoughtUi.join('')
        const activityJoined = thoughtActivityDeltas.join('')
        // Live decision native pieces — not a single end-of-round dump of reasoning alone.
        expect(thoughtUi.length).toBeGreaterThanOrEqual(2)
        expect(thoughtJoined).toContain(DECISION_THOUGHT_A)
        expect(thoughtJoined).toContain(DECISION_THOUGHT_B)
        expect(activityJoined).toContain(DECISION_THOUGHT_A)
        // #775 guarantee: think-phase draft content still stays out of Thought.
        expect(thoughtJoined).not.toContain(DRAFT_ANSWER)
        expect(activityJoined).not.toContain(DRAFT_ANSWER)
    })

    it('does not re-paint decision native thought when think phase already streamed Thought', async () => {
        const thoughtUi: string[] = []
        const NATIVE_THINK = 'Host plan already visible in Thought.'
        const DECISION_THOUGHT = 'Decision round should stay quiet.'

        const complete: AgentPipelineParams['complete'] = async (input) => {
            if (input.omitTools) {
                input.onThinking?.(NATIVE_THINK)
                return { ok: true, content: '', toolCalls: [], reasoning: NATIVE_THINK }
            }
            input.onThinking?.(DECISION_THOUGHT)
            input.onToken?.(PUBLIC_ANSWER)
            return {
                ok: true,
                content: PUBLIC_ANSWER,
                toolCalls: [],
                reasoning: DECISION_THOUGHT,
            }
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
        })

        expect(result.ok).toBe(true)
        const thoughtJoined = thoughtUi.join('')
        expect(thoughtJoined).toContain(NATIVE_THINK)
        expect(thoughtJoined).not.toContain(DECISION_THOUGHT)
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

    it('paints post-tool reflect content as Thought but keeps planning content out', async () => {
        const thoughtUi: string[] = []
        const thoughtActivityDeltas: string[] = []
        const reflectInAct: string[] = []
        const PLAN_DRAFT = 'PLANNING DRAFT that must not paint ThinkingBlock'
        const REFLECT_NOTE = 'Reflect: tool results cover the ask; synthesize final answer next.'
        const FINAL_ANSWER = 'Synthesized final answer after tools.'
        let thinkRound = 0
        let decisionRound = 0

        const complete: AgentPipelineParams['complete'] = async (input) => {
            const system = input.messages.find((m) => m.role === 'system')
            const sys = typeof system?.content === 'string' ? system.content : ''

            if (input.omitTools) {
                thinkRound += 1
                if (sys.includes('REFLECTION STEP')) {
                    // Content-only post-tool THINK (no native onThinking deltas).
                    input.onToken?.(REFLECT_NOTE)
                    return { ok: true, content: REFLECT_NOTE, toolCalls: [] }
                }
                // Pre-tool planning: content-only draft must stay out of Thought (#775).
                input.onToken?.(PLAN_DRAFT)
                return { ok: true, content: PLAN_DRAFT, toolCalls: [] }
            }

            decisionRound += 1
            if (sys.includes('<private_thought>') && sys.includes(REFLECT_NOTE)) {
                reflectInAct.push(REFLECT_NOTE)
            }

            if (decisionRound === 1) {
                input.onToken?.('Working…')
                return {
                    ok: true,
                    content: 'Working…',
                    // Local tool — avoids network hang in unit tests (web_search).
                    toolCalls: [
                        {
                            id: 'call-reflect-1',
                            name: 'todo_write',
                            argumentsJson: JSON.stringify({
                                tasks: [{ id: 't1', content: 'digest results', status: 'completed' }],
                            }),
                        },
                    ],
                }
            }

            input.onToken?.(FINAL_ANSWER)
            return { ok: true, content: FINAL_ANSWER, toolCalls: [] }
        }

        const result = await runAgentNodePipeline({
            complete,
            baseMessages: [
                { role: 'system', content: 'You are a careful philosopher.' },
                { role: 'user', content: longUserPrompt() },
            ],
            provider: 'test',
            agentMode: 'ask',
            maxSteps: 6,
            onThinking: (piece) => thoughtUi.push(piece),
            onActivity: (activity: AgentActivity) => {
                if (activity.kind === 'thought' && activity.delta) {
                    thoughtActivityDeltas.push(activity.delta)
                }
            },
        })

        expect(result.ok).toBe(true)
        expect(thinkRound).toBeGreaterThanOrEqual(2)
        expect(decisionRound).toBeGreaterThanOrEqual(2)
        expect(result.text).toContain(FINAL_ANSWER)

        const thoughtJoined = thoughtUi.join('')
        const activityJoined = thoughtActivityDeltas.join('')
        // Post-tool reflect content visible in Thought UI.
        expect(thoughtJoined).toContain(REFLECT_NOTE)
        expect(activityJoined).toContain(REFLECT_NOTE)
        // #775: planning draft still must not paint Thought.
        expect(thoughtJoined).not.toContain(PLAN_DRAFT)
        expect(activityJoined).not.toContain(PLAN_DRAFT)
        // Quality path: reflect text still reaches next ACT via cycleThought / private_thought.
        expect(reflectInAct.length).toBeGreaterThan(0)
    })
})

describe('Soft public-continue nudge (autonomous, optional)', () => {
    it('injects prefer-continue reminder only after public text already exists', async () => {
        let decision = 0
        const reminders: string[] = []

        const complete: AgentPipelineParams['complete'] = async (input) => {
            if (input.omitTools) {
                return { ok: true, content: '', toolCalls: [], reasoning: 'plan' }
            }
            decision += 1
            const system = input.messages.find((m) => m.role === 'system')
            const content = typeof system?.content === 'string' ? system.content : ''
            const match = content.match(/<system_reminder>\n([\s\S]*?)\n<\/system_reminder>/)
            reminders.push(match?.[1]?.trim() || '')

            if (decision === 1) {
                const section = 'Opening progress note for the user.'
                input.onToken?.(section)
                return {
                    ok: true,
                    content: section,
                    toolCalls: [
                        {
                            id: 'call-1',
                            name: 'web_search',
                            argumentsJson: JSON.stringify({ query: 'test' }),
                        },
                    ],
                }
            }
            input.onToken?.(' Continued with new findings.')
            return { ok: true, content: ' Continued with new findings.', toolCalls: [] }
        }

        const result = await runAgentNodePipeline({
            complete,
            baseMessages: [
                { role: 'system', content: 'You are helpful.' },
                {
                    role: 'user',
                    content:
                        'Please research carefully and write a clear multi-part answer with sources and structure.',
                },
            ],
            provider: 'test',
            agentMode: 'ask',
            // Avoid real tool execution side effects: empty env / no host — web_search may error but still returns tool role
            maxSteps: 6,
        })

        expect(result.ok).toBe(true)
        // First decision: no prior public text → nudge absent
        expect(reminders[0] || '').not.toContain(PUBLIC_CONTINUE_NUDGE)
        // Later decision after public streamed → soft prefer-continue present
        expect(reminders.some((r) => r.includes(PUBLIC_CONTINUE_NUDGE))).toBe(true)
        expect(PUBLIC_CONTINUE_NUDGE.toLowerCase()).toContain('prefer')
        expect(PUBLIC_CONTINUE_NUDGE.toLowerCase()).not.toMatch(/\bmust\b|\bnever\b|\bdo not\b/)
    })
})

describe('Tool-result memory (soft loop compaction)', () => {
    it('keeps recent tool results fuller and digests older ones', () => {
        const messages: ChatMessage[] = [
            { role: 'system', content: 'sys' },
            { role: 'user', content: 'go' },
        ]
        for (let i = 0; i < 10; i += 1) {
            const id = `call-${i}`
            messages.push({
                role: 'assistant',
                content: null,
                tool_calls: [
                    {
                        id,
                        type: 'function',
                        function: { name: 'web_search', arguments: '{"query":"q"}' },
                    },
                ],
            })
            messages.push({
                role: 'tool',
                tool_call_id: id,
                content: `RESULT-${i}-` + 'x'.repeat(1_200),
            })
        }

        const compacted = compactLoopMessages(messages)
        const toolMsgs = compacted.filter((m) => m.role === 'tool')
        expect(toolMsgs.length).toBe(10)

        const older = toolMsgs.slice(0, -LOOP_RECENT_TOOL_KEEP)
        const recent = toolMsgs.slice(-LOOP_RECENT_TOOL_KEEP)
        for (const msg of older) {
            expect(typeof msg.content).toBe('string')
            expect((msg.content as string).length).toBeLessThanOrEqual(LOOP_OLD_TOOL_CHARS + 1)
        }
        for (const msg of recent) {
            expect(typeof msg.content).toBe('string')
            // Recent stay fuller than the old aggressive 500-char clip
            expect((msg.content as string).length).toBeGreaterThan(500)
            expect((msg.content as string).length).toBeLessThanOrEqual(LOOP_RECENT_TOOL_CHARS + 1)
        }
    })

    it('digests large artifact-shaped tool results to id/title', () => {
        const huge = JSON.stringify({
            ok: true,
            id: 'art-1',
            type: 'model3d',
            title: 'Solar System',
            content: 'y'.repeat(5_000),
        })
        const digested = digestToolResultForLoop(huge, 360)
        expect(digested.length).toBeLessThan(huge.length)
        expect(digested).toContain('art-1')
        expect(digested).toContain('Solar System')
        expect(digested).not.toContain('y'.repeat(100))
    })

    it('preserves error/detail when digesting artifact-shaped failures', () => {
        const huge = JSON.stringify({
            ok: false,
            id: 'art-bad',
            type: 'model3d',
            title: 'Broken Scene',
            error: 'objects[2] missing position',
            content: 'y'.repeat(5_000),
        })
        const digested = digestToolResultForLoop(huge, 360)
        expect(digested).toContain('art-bad')
        expect(digested).toContain('Broken Scene')
        expect(digested).toContain('objects[2] missing position')
        expect(digested).toContain('"ok":false')
        expect(digested).not.toContain('y'.repeat(100))
    })

    it('compacts prior create_artifact bodies; only the latest stays full', () => {
        const bigBody = 'z'.repeat(3_000)
        const messages: ChatMessage[] = [{ role: 'user', content: 'build' }]
        for (let i = 0; i < 10; i += 1) {
            const id = `art-${i}`
            messages.push({
                role: 'assistant',
                content: null,
                tool_calls: [
                    {
                        id,
                        type: 'function',
                        function: {
                            name: 'create_artifact',
                            arguments: JSON.stringify({
                                type: 'model3d',
                                title: `Scene ${i}`,
                                content: bigBody,
                            }),
                        },
                    },
                ],
            })
            messages.push({
                role: 'tool',
                tool_call_id: id,
                content: JSON.stringify({
                    ok: true,
                    id: `doc-${i}`,
                    type: 'model3d',
                    title: `Scene ${i}`,
                }),
            })
        }
        const compacted = compactLoopMessages(messages)
        const assistantCalls = compacted.filter((m) => m.role === 'assistant' && m.tool_calls)
        const olderArgs = assistantCalls[0]!.tool_calls![0]!.function.arguments
        const priorRecentArgs = assistantCalls[assistantCalls.length - 2]!.tool_calls![0]!.function.arguments
        const latestArgs = assistantCalls[assistantCalls.length - 1]!.tool_calls![0]!.function.arguments
        expect(olderArgs).toContain('_compacted')
        expect(olderArgs).not.toContain(bigBody)
        // Inside the recent tool window, prior create_artifact bodies still compact (budget guard).
        expect(priorRecentArgs).toContain('_compacted')
        expect(priorRecentArgs).not.toContain(bigBody)
        expect(latestArgs).toContain(bigBody)
        expect(latestArgs).not.toContain('_compacted')
    })
})

describe('Long-job soft continue nudge (near maxSteps)', () => {
    it('injects soft continue reminder when near step budget', async () => {
        let decision = 0
        const reminders: string[] = []

        const complete: AgentPipelineParams['complete'] = async (input) => {
            if (input.omitTools) {
                return { ok: true, content: '', toolCalls: [], reasoning: 'plan' }
            }
            decision += 1
            const system = input.messages.find((m) => m.role === 'system')
            const content = typeof system?.content === 'string' ? system.content : ''
            const match = content.match(/<system_reminder>\n([\s\S]*?)\n<\/system_reminder>/)
            reminders.push(match?.[1]?.trim() || '')

            if (decision < 3) {
                const section = decision === 1 ? 'Working through the research.' : ' Still gathering.'
                input.onToken?.(section)
                return {
                    ok: true,
                    content: section,
                    toolCalls: [
                        {
                            id: `call-${decision}`,
                            name: 'web_search',
                            argumentsJson: JSON.stringify({ query: `q${decision}` }),
                        },
                    ],
                }
            }
            input.onToken?.(' Final chunk.')
            return { ok: true, content: ' Final chunk.', toolCalls: [] }
        }

        const result = await runAgentNodePipeline({
            complete,
            baseMessages: [
                { role: 'system', content: 'You are helpful.' },
                { role: 'user', content: 'Do a careful multi-step research writeup.' },
            ],
            provider: 'test',
            agentMode: 'ask',
            maxSteps: 5,
        })

        expect(result.ok).toBe(true)
        expect(reminders.some((r) => r.includes(LONG_JOB_CONTINUE_NUDGE))).toBe(true)
        expect(LONG_JOB_CONTINUE_NUDGE.toLowerCase()).toMatch(/prefer|leave todos|continue/)
        expect(LONG_JOB_CONTINUE_NUDGE.toLowerCase()).not.toMatch(/\bmust\b|\bnever\b|\bdo not\b|hard stop/)
    })
})


describe('model3d compaction + weaker enrich guard', () => {
    it('keeps a geometry digest when stubbing prior create_artifact model3d bodies', () => {
        const bigPad = (tag: string) =>
            JSON.stringify({
                title: 'Solar System',
                description: tag.repeat(200),
                objects: [
                    { type: 'sphere', name: 'Sun', radius: 2, position: [0, 0, 0], color: '#fbbf24' },
                    { type: 'sphere', name: 'Earth', radius: 0.6, position: [5, 0, 0], color: '#38bdf8' },
                    ...Array.from({ length: 40 }, (_, i) => ({
                        type: 'box',
                        name: `${tag}-pad-${i}`,
                        size: [0.2, 0.2, 0.2],
                        position: [i * 0.1, 0, 0],
                        color: '#999999',
                    })),
                ],
            })
        const scaffold0 = bigPad('z')
        const scaffold1 = bigPad('y')
        expect(scaffold0.length).toBeGreaterThan(2_500)
        const messages: ChatMessage[] = [
            { role: 'user', content: 'build' },
            {
                role: 'assistant',
                content: null,
                tool_calls: [
                    {
                        id: 'art-0',
                        type: 'function',
                        function: {
                            name: 'create_artifact',
                            arguments: JSON.stringify({ type: 'model3d', title: 'Solar System', content: scaffold0 }),
                        },
                    },
                ],
            },
            {
                role: 'tool',
                tool_call_id: 'art-0',
                content: JSON.stringify({ ok: true, id: 'doc-0', type: 'model3d', title: 'Solar System' }),
            },
            {
                role: 'assistant',
                content: null,
                tool_calls: [
                    {
                        id: 'art-1',
                        type: 'function',
                        function: {
                            name: 'create_artifact',
                            arguments: JSON.stringify({
                                type: 'model3d',
                                title: 'Solar System',
                                content: scaffold1,
                            }),
                        },
                    },
                ],
            },
            {
                role: 'tool',
                tool_call_id: 'art-1',
                content: JSON.stringify({ ok: true, id: 'doc-1', type: 'model3d', title: 'Solar System' }),
            },
        ]
        const compacted = compactLoopMessages(messages)
        const priorArgs = compacted[1]!.tool_calls![0]!.function.arguments
        const latestArgs = compacted[3]!.tool_calls![0]!.function.arguments
        expect(priorArgs).toContain('_compacted')
        expect(priorArgs).toMatch(/renderable:|Sun|Earth|objects:/)
        expect(priorArgs).not.toContain('z-pad-20')
        expect(latestArgs).toContain('y-pad-20')
        expect(latestArgs).not.toContain('_compacted')
    })

    it('flags materials-only enrich as weaker than a geometry scaffold', () => {
        const scaffold = {
            type: 'model3d',
            title: 'House',
            content: JSON.stringify({
                title: 'House',
                objects: [
                    { type: 'box', name: 'Walls', size: [8, 4, 6], position: [0, 2, 0], color: '#fff' },
                    { type: 'box', name: 'Roof', size: [9, 1, 7], position: [0, 4.5, 0], color: '#a00' },
                ],
            }),
        }
        const enrich = {
            type: 'model3d',
            title: 'House',
            content: JSON.stringify({
                title: 'House',
                preset: 'custom',
                materials: [{ id: 'wood', color: '#888' }],
                camera: { position: [10, 8, 10] },
                objects: [{ type: 'group', name: 'House', children: [] }],
            }),
        }
        expect(isWeakerModel3dRevision(enrich, scaffold)).toBe(true)
        expect(isWeakerModel3dRevision(scaffold, enrich)).toBe(false)
    })
})

describe('shareInflight web_search parallel dedupe', () => {
    it('shares one factory across concurrent identical keys', async () => {
        let runs = 0
        const map = new Map<string, Promise<number>>()
        const factory = () =>
            new Promise<number>((resolve) => {
                runs += 1
                setTimeout(() => resolve(42), 5)
            })
        const [a, b] = await Promise.all([
            shareInflight(map, 'web_search:nietzsche', factory),
            shareInflight(map, 'web_search:nietzsche', factory),
        ])
        expect(a).toBe(42)
        expect(b).toBe(42)
        expect(runs).toBe(1)
        expect(map.size).toBe(0)
    })

    it('allows a later call after the first settles (cache layer owns reuse)', async () => {
        let runs = 0
        const map = new Map<string, Promise<string>>()
        const factory = () => {
            runs += 1
            return Promise.resolve(`run-${runs}`)
        }
        const first = await shareInflight(map, 'web_search:q', factory)
        const second = await shareInflight(map, 'web_search:q', factory)
        expect(first).toBe('run-1')
        expect(second).toBe('run-2')
        expect(runs).toBe(2)
    })
})

describe('researchToolCacheKey academic/corpus parity', () => {
    it('keys web_search by normalized query', () => {
        expect(
            researchToolCacheKey({
                id: 'a',
                name: 'web_search',
                argumentsJson: JSON.stringify({ query: '  Nietzsche Will  ' }),
            })
        ).toBe('web_search:nietzsche will')
    })

    it('keys search_academic_corpus with filters (parallel TOCTOU class)', () => {
        const a = researchToolCacheKey({
            id: '1',
            name: 'search_academic_corpus',
            argumentsJson: JSON.stringify({
                query: 'Deleuze rhizome',
                field: 'Philosophy',
                sort_by: 'citations',
                year_from: 1990,
                limit: 5,
                open_access_only: true,
            }),
        })
        const b = researchToolCacheKey({
            id: '2',
            name: 'search_academic_corpus',
            argumentsJson: JSON.stringify({
                query: 'deleuze rhizome',
                field: 'philosophy',
                sort_by: 'citations',
                year_from: 1990,
                limit: 5,
                open_access_only: true,
            }),
        })
        const c = researchToolCacheKey({
            id: '3',
            name: 'search_academic_corpus',
            argumentsJson: JSON.stringify({
                query: 'deleuze rhizome',
                field: 'philosophy',
                sort_by: 'recent',
                year_from: 1990,
                limit: 5,
                open_access_only: true,
            }),
        })
        expect(a).toBe(b)
        expect(a).toContain('search_academic_corpus:deleuze rhizome')
        expect(a).not.toBe(c)
    })

    it('keys verified_corpus_search by query + philosopher/work', () => {
        const a = researchToolCacheKey({
            id: '1',
            name: 'verified_corpus_search',
            argumentsJson: JSON.stringify({ query: 'eternal return', philosopher: 'Nietzsche', work: 'Zarathustra' }),
        })
        const b = researchToolCacheKey({
            id: '2',
            name: 'corpus_search',
            argumentsJson: JSON.stringify({ q: 'Eternal Return', author: 'nietzsche', book: 'zarathustra' }),
        })
        expect(a).toBe(b)
        expect(a).toContain('verified_corpus_search:eternal return')
    })

    it('returns null for non-research tools and short queries', () => {
        expect(
            researchToolCacheKey({ id: '1', name: 'read_document', argumentsJson: JSON.stringify({ url: 'https://x.com' }) })
        ).toBeNull()
        expect(
            researchToolCacheKey({ id: '2', name: 'search_academic_corpus', argumentsJson: JSON.stringify({ query: 'a' }) })
        ).toBeNull()
    })
})

describe('researchToolCacheKey fetch_url identical-URL inflight', () => {
    it('normalizes host case, default port, hash, and trailing whitespace', () => {
        const a = normalizeFetchUrlCacheKey('  HTTPS://Example.COM:443/path?q=1#frag  ')
        const b = normalizeFetchUrlCacheKey('https://example.com/path?q=1')
        expect(a).toBe(b)
        expect(a).toBe('https://example.com/path?q=1')
    })

    it('rejects invalid / non-http(s)', () => {
        expect(normalizeFetchUrlCacheKey('')).toBeNull()
        expect(normalizeFetchUrlCacheKey('ftp://example.com/x')).toBeNull()
        expect(normalizeFetchUrlCacheKey('not a url')).toBeNull()
        expect(normalizeFetchUrlCacheKey(null)).toBeNull()
    })

    it('keys fetch_url by normalized URL (aliases uri/href/link/page)', () => {
        const a = researchToolCacheKey({
            id: '1',
            name: 'fetch_url',
            argumentsJson: JSON.stringify({ url: 'https://Example.com/essay' }),
        })
        const b = researchToolCacheKey({
            id: '2',
            name: 'browse',
            argumentsJson: JSON.stringify({ href: 'https://example.com/essay#top' }),
        })
        const c = researchToolCacheKey({
            id: '3',
            name: 'fetch_url',
            argumentsJson: JSON.stringify({ uri: 'https://example.com/essay?x=1' }),
        })
        expect(a).toBe('fetch_url:https://example.com/essay')
        expect(a).toBe(b)
        expect(a).not.toBe(c)
    })

    it('returns null when url missing or invalid (no share)', () => {
        expect(
            researchToolCacheKey({ id: '1', name: 'fetch_url', argumentsJson: JSON.stringify({ url: 'notaurl' }) })
        ).toBeNull()
        expect(researchToolCacheKey({ id: '2', name: 'fetch_url', argumentsJson: '{}' })).toBeNull()
    })
})

describe('shareInflight fetch_url parallel dedupe', () => {
    it('shares one factory across concurrent identical URL keys (Promise.all TOCTOU)', async () => {
        let runs = 0
        const map = new Map<string, Promise<string>>()
        const factory = () =>
            new Promise<string>((resolve) => {
                runs += 1
                setTimeout(() => resolve('page-body'), 5)
            })
        const key = 'fetch_url:https://example.com/a'
        const [a, b] = await Promise.all([shareInflight(map, key, factory), shareInflight(map, key, factory)])
        expect(a).toBe('page-body')
        expect(b).toBe('page-body')
        expect(runs).toBe(1)
        expect(map.size).toBe(0)
    })

    it('distinct URLs do not share (no cross-URL coalesce)', async () => {
        let runs = 0
        const map = new Map<string, Promise<number>>()
        const factory = () => {
            runs += 1
            return Promise.resolve(runs)
        }
        const [a, b] = await Promise.all([
            shareInflight(map, 'fetch_url:https://example.com/a', factory),
            shareInflight(map, 'fetch_url:https://example.com/b', factory),
        ])
        expect(a).toBe(1)
        expect(b).toBe(2)
        expect(runs).toBe(2)
    })

    it('abort/reject clears inflight so a later call can retry', async () => {
        let runs = 0
        const map = new Map<string, Promise<string>>()
        const key = 'fetch_url:https://example.com/abort'
        const failing = () => {
            runs += 1
            return Promise.reject(new Error('client request aborted'))
        }
        await expect(Promise.all([shareInflight(map, key, failing), shareInflight(map, key, failing)])).rejects.toThrow(
            /aborted/
        )
        expect(runs).toBe(1)
        expect(map.size).toBe(0)
        const ok = await shareInflight(map, key, () => {
            runs += 1
            return Promise.resolve('recovered')
        })
        expect(ok).toBe('recovered')
        expect(runs).toBe(2)
    })
})

describe('finalizePlanReadinessReminder soft-gate', () => {
    it('blocks finalize when plan research ran without scratchpad (non-web_search)', () => {
        const reminder = finalizePlanReadinessReminder({
            todos: [{ id: 't1', title: 'Outline', status: 'pending' }],
            scratchpad: [],
            usedWebSearch: false,
            usedPlanResearch: true,
        })
        expect(reminder).toMatch(/scratchpad/i)
    })

    it('allows finalize once research findings are on scratchpad', () => {
        const reminder = finalizePlanReadinessReminder({
            todos: [{ id: 't1', title: 'Outline', status: 'pending' }],
            scratchpad: [{ note: 'Kant CPR A51', source: 'fetch_url' }],
            usedWebSearch: false,
            usedPlanResearch: true,
        })
        expect(reminder).toBeNull()
    })

    it('still requires todo spine', () => {
        expect(
            finalizePlanReadinessReminder({
                todos: [],
                scratchpad: [],
                usedPlanResearch: true,
            })
        ).toMatch(/todo/i)
    })
})
