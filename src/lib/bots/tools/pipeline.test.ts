import { describe, expect, it } from 'vitest'
import { geminiToolGenerationConfig } from './gemini'
import {
    compactLoopMessages,
    isWeakerModel3dRevision,
    digestToolResultForLoop,
    extractFallbackAnswerFromThinking,
    LONG_JOB_CONTINUE_NUDGE,
    LOOP_OLD_TOOL_CHARS,
    LOOP_RECENT_TOOL_CHARS,
    LOOP_RECENT_TOOL_KEEP,
    PUBLIC_CONTINUE_NUDGE,
    runAgentNodePipeline,
    THINK_MAX_TOKENS,
    THINK_PLAN_INSTRUCTION,
    THINK_REFLECT_INSTRUCTION,
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
