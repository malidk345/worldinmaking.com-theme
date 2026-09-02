import { test, expect } from '@playwright/test'
import {
    isToolAllowedInMode,
    parseAgentMode,
    PLAN_TOOL_NAMES,
    PLAN_TOOL_PROTOCOL,
    PLAN_USER_PREFIX,
    modeSystemPrompt,
    toolsForMode,
} from '../src/lib/bots/agent/modes'
import {
    activityFromToolEvent,
    applyAgentActivity,
    processItemToThinkingStep,
} from '../src/lib/bots/agent/activity'
import { buildThinkingTimeline, shouldShowLiveThinkingIndicator } from '../src/lib/bots/agent/timeline'
import { mergePlan, normalizePlan, withHostContext } from '../src/lib/bots/agent/plan'
import { OPENAI_CHAT_TOOLS, toolsForAgentMode } from '../src/lib/bots/tools/spec'
import { runAgentNodePipeline, shouldRunThinkPhase } from '../src/lib/bots/tools/pipeline'
import { TOOL_FAMILY_ORDER } from '../src/lib/bots/tools/loop'
import {
    modeAfterResume,
    parseAgentCheckpoint,
    resumeUserMessage,
} from '../src/lib/bots/agent/checkpoint'

test.describe('Agent modes', () => {
    test('parseAgentMode defaults unknown values to ask', () => {
        expect(parseAgentMode('plan')).toBe('plan')
        expect(parseAgentMode('execute')).toBe('execute')
        expect(parseAgentMode('ask')).toBe('ask')
        expect(parseAgentMode('nope')).toBe('ask')
        expect(parseAgentMode(undefined)).toBe('ask')
    })

    test('plan mode toolkit is research and switch_mode only', () => {
        const names = toolsForAgentMode('plan').map((tool) => tool.function.name).sort()
        expect(names).toEqual([...PLAN_TOOL_NAMES].sort())
        expect(names).toContain('switch_mode')
        expect(names).toContain('todo_write')
        expect(names).toContain('finalize_plan')
        expect(names).toContain('ask_user')
        expect(names).toContain('remember')
        expect(names).not.toContain('create_artifact')
        expect(names).not.toContain('open_path')
        expect(toolsForAgentMode('ask').length).toBe(OPENAI_CHAT_TOOLS.length)
        expect(toolsForAgentMode('execute').length).toBe(OPENAI_CHAT_TOOLS.length)
    })

    test('isToolAllowedInMode blocks mutating tools only in plan', () => {
        expect(isToolAllowedInMode('create_artifact', 'plan')).toBe(false)
        expect(isToolAllowedInMode('web_search', 'plan')).toBe(true)
        expect(isToolAllowedInMode('create_artifact', 'execute')).toBe(true)
        expect(isToolAllowedInMode('create_artifact', 'ask')).toBe(true)
    })

    test('plan mode prompt is required and tells the model to call todo_write first', () => {
        expect(modeSystemPrompt('plan')).toContain('todo_write')
        expect(modeSystemPrompt('plan')).toContain('finalize_plan')
        expect(modeSystemPrompt('ask')).toBe('')
        expect(modeSystemPrompt('execute')).toContain('execution mode')
        expect(PLAN_TOOL_PROTOCOL).toContain('todo_write')
        expect(PLAN_USER_PREFIX).toContain('Plan mode is ON')
    })

    test('toolsForMode is a generic filter over any spec list', () => {
        const filtered = toolsForMode('plan', [{ function: { name: 'web_search' } }, { function: { name: 'open_path' } }])
        expect(filtered.map((item) => item.function.name)).toEqual(['web_search'])
    })
})

test.describe('Host activity stream', () => {
    test('thought tokens then a tool stay in arrival order', () => {
        let items: ReturnType<typeof applyAgentActivity> = []
        items = applyAgentActivity(items, {
            seq: 1,
            kind: 'node',
            id: 'node-root-0',
            status: 'running',
            title: 'Deciding next step',
            node: 'root',
        })
        items = applyAgentActivity(items, {
            seq: 2,
            kind: 'thought',
            id: 'thought-0',
            status: 'running',
            title: 'Thought',
            delta: 'I will ',
        })
        items = applyAgentActivity(items, {
            seq: 3,
            kind: 'thought',
            id: 'thought-0',
            status: 'running',
            delta: 'search first.',
        })
        items = applyAgentActivity(items, {
            seq: 4,
            kind: 'tool',
            id: 'tool-1',
            status: 'running',
            title: 'Searching the web',
            toolName: 'web_search',
        })
        items = applyAgentActivity(items, {
            seq: 5,
            kind: 'tool',
            id: 'tool-1',
            status: 'done',
            title: 'Searched the web',
            toolName: 'web_search',
            result: 'ok',
        })
        expect(items.map((item) => item.kind)).toEqual(['node', 'thought', 'tool'])
        expect(items[1].detail).toBe('I will search first.')
        expect(items[2].status).toBe('done')
        expect(processItemToThinkingStep(items[1]).kind).toBe('reasoning')
    })

    test('web_search tool events still appear after a thought row', () => {
        let items: ReturnType<typeof applyAgentActivity> = []
        items = applyAgentActivity(items, {
            seq: 1,
            kind: 'thought',
            id: 'thought-0',
            status: 'done',
            title: 'Thought',
            delta: 'Need live sources.',
        })
        items = applyAgentActivity(
            items,
            activityFromToolEvent(
                {
                    id: 'host-search',
                    name: 'web_search',
                    status: 'running',
                    detail: 'Searching the web',
                    arguments: JSON.stringify({ query: 'today news' }),
                },
                2
            )
        )
        items = applyAgentActivity(
            items,
            activityFromToolEvent(
                {
                    id: 'host-search',
                    name: 'web_search',
                    status: 'done',
                    detail: 'Searched the web',
                    result: 'hit',
                },
                3
            )
        )
        const timeline = buildThinkingTimeline(items.map(processItemToThinkingStep))
        expect(timeline.map((item) => item.kind)).toEqual(['reasoning', 'tool'])
        expect(timeline[1].toolName).toBe('web_search')
        expect(timeline[1].status).toBe('done')
        expect(timeline[1].id).toBe('tool-host-search')
    })

    test('empty done does not create a blank thought row', () => {
        let items: ReturnType<typeof applyAgentActivity> = []
        items = applyAgentActivity(items, {
            seq: 1,
            kind: 'thought',
            id: 'thought-0',
            status: 'done',
            title: 'Thought',
        })
        expect(items).toEqual([])
        items = applyAgentActivity(items, {
            seq: 2,
            kind: 'thought',
            id: 'thought-0',
            status: 'running',
            title: 'Thought',
            delta: 'Need sources.',
        })
        items = applyAgentActivity(items, {
            seq: 3,
            kind: 'thought',
            id: 'thought-0',
            status: 'done',
            title: 'Thought',
        })
        expect(items).toHaveLength(1)
        expect(items[0].status).toBe('done')
        expect(items[0].detail).toBe('Need sources.')
    })
})

test.describe('Thinking timeline', () => {
    test('interleaves reasoning and tools in arrival order', () => {
        const items = buildThinkingTimeline(
            [
                { id: 'stream-think', title: 'Thought', detail: 'Need sources.', kind: 'reasoning' },
                {
                    id: 'tool-call_1',
                    title: 'Searching the web',
                    detail: 'Searching the web',
                    kind: 'tool',
                    toolName: 'web_search',
                    status: 'done',
                },
                { id: 'stream-think-2', title: 'Thought', detail: 'Now I can answer.', kind: 'reasoning', completed: true },
            ],
            [
                {
                    id: 'call_1',
                    name: 'web_search',
                    status: 'done',
                    arguments: '{"query":"news"}',
                    result: 'hit',
                },
            ]
        )
        expect(items.map((item) => item.kind)).toEqual(['reasoning', 'tool', 'reasoning'])
        expect(items[1].toolName).toBe('web_search')
        expect(items[1].args).toContain('news')
    })

    test('later todo_write updates the same plan row instead of stacking a new one', () => {
        const items = buildThinkingTimeline(
            [
                {
                    id: 'tool-a',
                    title: 'Planning',
                    kind: 'plan',
                    toolName: 'todo_write',
                    status: 'done',
                    arguments: JSON.stringify({
                        tasks: [{ id: 't1', title: 'Search', status: 'in_progress' }],
                    }),
                },
                {
                    id: 'tool-b',
                    title: 'Planning',
                    kind: 'plan',
                    toolName: 'todo_write',
                    status: 'done',
                    arguments: JSON.stringify({
                        tasks: [
                            { id: 't1', title: 'Search', status: 'completed' },
                            { id: 't2', title: 'Write', status: 'in_progress' },
                        ],
                    }),
                },
            ],
            []
        )
        expect(items.filter((item) => item.kind === 'plan')).toHaveLength(1)
        expect(items[0].todos?.map((todo) => todo.status)).toEqual(['completed', 'in_progress'])
        expect(items[0].todos?.map((todo) => todo.title)).toEqual(['Search', 'Write'])
    })

    test('todo_write becomes a plan row with todos', () => {
        const items = buildThinkingTimeline(
            [
                {
                    id: 'tool-plan-1',
                    title: 'Planning',
                    kind: 'plan',
                    toolName: 'todo_write',
                    status: 'done',
                    arguments: JSON.stringify({
                        tasks: [
                            { id: 't1', title: 'Search', status: 'completed' },
                            { id: 't2', title: 'Write', status: 'in_progress' },
                        ],
                    }),
                },
            ],
            []
        )
        expect(items).toHaveLength(1)
        expect(items[0].kind).toBe('plan')
        expect(items[0].todos?.map((todo) => todo.title)).toEqual(['Search', 'Write'])
    })

    test('node stages stay in the thinking timeline', () => {
        const items = buildThinkingTimeline(
            [
                { id: 'node-root-0', title: 'Deciding next step', kind: 'node', status: 'done' },
                { id: 'stream-think-0', title: 'Thought', detail: 'Need a plan.', kind: 'reasoning' },
                {
                    id: 'tool-plan-1',
                    title: 'Planning',
                    kind: 'plan',
                    toolName: 'todo_write',
                    status: 'done',
                    arguments: JSON.stringify({ tasks: [{ id: 't1', title: 'Search', status: 'in_progress' }] }),
                },
                { id: 'node-tools-1', title: 'Using tools', kind: 'node', status: 'running' },
            ],
            []
        )
        expect(items.map((item) => item.kind)).toEqual(['node', 'reasoning', 'plan', 'node'])
        expect(items[1].detail).toBe('Need a plan.')
        expect(items[0].title).toBe('Deciding next step')
        expect(items[3].title).toBe('Using tools')
    })

    test('does not dump leftover traces when the activity log already owns the thread', () => {
        const items = buildThinkingTimeline(
            [{ id: 'stream-think', title: 'Thought', detail: 'First think.', kind: 'reasoning' }],
            [{ id: 'later', name: 'web_search', status: 'done' }]
        )
        expect(items.map((item) => item.kind)).toEqual(['reasoning'])
    })

    test('does not show a second thinking indicator once a thought row exists', () => {
        const liveThought = buildThinkingTimeline([
            { id: 'thought-0', title: 'Thought', detail: 'Need sources.', kind: 'reasoning' },
        ])
        const finishedThought = buildThinkingTimeline([
            { id: 'thought-0', title: 'Thought', detail: 'Need sources.', kind: 'reasoning', completed: true },
        ])
        expect(shouldShowLiveThinkingIndicator([], true)).toBe(true)
        expect(shouldShowLiveThinkingIndicator([], false)).toBe(false)
        expect(shouldShowLiveThinkingIndicator(liveThought, true)).toBe(false)
        expect(shouldShowLiveThinkingIndicator(finishedThought, true)).toBe(false)
        expect(
            shouldShowLiveThinkingIndicator(
                [
                    {
                        id: 'tool-1',
                        kind: 'tool',
                        title: 'Searching the web',
                        status: 'running',
                        toolName: 'web_search',
                    },
                ],
                true
            )
        ).toBe(false)
    })

    test('falls back to toolTrace only for old messages without an activity log', () => {
        const items = buildThinkingTimeline([], [{ id: 'later', name: 'web_search', status: 'done' }])
        expect(items).toHaveLength(1)
        expect(items[0].kind).toBe('tool')
        expect(items[0].toolName).toBe('web_search')
    })
})

test.describe('Locked plan board', () => {
    test('mergePlan keeps the original steps and only advances status', () => {
        const first = normalizePlan([
            { id: 't1', title: 'Search', status: 'in_progress' },
            { id: 't2', title: 'Write', status: 'pending' },
        ])
        const merged = mergePlan(first, [
            { id: 't1', title: 'Search', status: 'completed' },
            { id: 't2', title: 'Write', status: 'in_progress' },
        ])
        expect(merged.map((todo) => `${todo.id}:${todo.status}`)).toEqual(['t1:completed', 't2:in_progress'])
    })

    test('mergePlan ignores a wholesale new plan', () => {
        const first = normalizePlan([
            { id: 'task_1', title: 'Makale iskeleti', status: 'completed' },
            { id: 'task_2', title: 'Jeeves paradoksu', status: 'in_progress' },
            { id: 'task_3', title: 'Deleuze', status: 'pending' },
        ])
        const merged = mergePlan(first, [
            { id: 'a', title: 'Yeni giriş', status: 'in_progress' },
            { id: 'b', title: 'Yeni vaka', status: 'pending' },
        ])
        expect(merged.map((todo) => todo.title)).toEqual(['Makale iskeleti', 'Jeeves paradoksu', 'Deleuze'])
        expect(merged[0].status).toBe('completed')
        expect(merged.filter((todo) => todo.status === 'in_progress')).toHaveLength(1)
    })

    test('host context folds thought and reminder into system, not a fake user turn', () => {
        const messages = withHostContext(
            [
                { role: 'system', content: 'You are Ask AI.' },
                { role: 'user', content: 'write the paper' },
            ],
            {
                todos: [{ id: 't1', title: 'Search', status: 'in_progress' }],
                thought: 'I should search first.',
                reminder: 'Work only on Search.',
                memories: [{ fact: 'Prefer Turkish replies', category: 'preference' }],
            }
        )
        expect(messages[0].content).toContain('<plan_board>')
        expect(messages[0].content).toContain('<private_thought>')
        expect(messages[0].content).toContain('I should search first.')
        expect(messages[0].content).toContain('<system_reminder>')
        expect(messages[0].content).toContain('<memory>')
        expect(messages[0].content).toContain('Prefer Turkish replies')
        expect(messages[1].role).toBe('user')
        expect(messages[1].content).toBe('write the paper')
        expect(messages.some((message) => message.role === 'user' && String(message.content).includes('system_reminder'))).toBe(
            false
        )
    })
})

test.describe('Think skip and Groq-first', () => {
    test('skips Think on short greetings and keeps it for plan or real work', () => {
        expect(
            shouldRunThinkPhase({ userPrompt: 'hi', agentMode: 'ask', stepCount: 0 })
        ).toBe(false)
        expect(
            shouldRunThinkPhase({ userPrompt: 'sen kimsin', agentMode: 'ask', stepCount: 0 })
        ).toBe(false)
        expect(
            shouldRunThinkPhase({ userPrompt: 'hi', agentMode: 'plan', stepCount: 0 })
        ).toBe(true)
        expect(
            shouldRunThinkPhase({
                userPrompt: 'Compare these two PDFs and extract the core argument',
                agentMode: 'ask',
                stepCount: 0,
            })
        ).toBe(true)
        expect(
            shouldRunThinkPhase({ userPrompt: 'hi', agentMode: 'ask', stepCount: 1 })
        ).toBe(false)
        expect(
            shouldRunThinkPhase({
                userPrompt: 'Compare these two PDFs and extract the core argument',
                agentMode: 'ask',
                stepCount: 1,
            })
        ).toBe(false)
        expect(
            shouldRunThinkPhase({ userPrompt: 'plan a research pass', agentMode: 'plan', stepCount: 1 })
        ).toBe(false)
    })

    test('think phase still emits a thought row', async () => {
        const deltas: string[] = []
        await runAgentNodePipeline({
            complete: async ({ omitTools, onThinking }) => {
                if (omitTools) {
                    onThinking?.('Search the PDF first.')
                    return { ok: true as const, content: '', toolCalls: [] }
                }
                return { ok: true as const, content: 'Done.', toolCalls: [] }
            },
            onActivity: (activity) => {
                if (activity.kind === 'thought' && activity.delta) deltas.push(activity.delta)
            },
            baseMessages: [
                { role: 'system', content: 'sys' },
                { role: 'user', content: 'Compare these two PDFs and extract the core argument' },
            ],
            provider: 'test',
            agentMode: 'ask',
            maxSteps: 2,
        })
        expect(deltas.join('')).toContain('Search the PDF first.')
    })

    test('later tool cycles do not open another think essay', async () => {
        let thinkRounds = 0
        await runAgentNodePipeline({
            complete: async ({ omitTools }) => {
                if (omitTools) {
                    thinkRounds += 1
                    return { ok: true as const, content: 'Write the plan first.', toolCalls: [] }
                }
                return {
                    ok: true as const,
                    content: '',
                    toolCalls: [
                        {
                            id: `c-${thinkRounds}`,
                            name: 'todo_write',
                            argumentsJson: JSON.stringify({
                                tasks: [{ id: 't1', title: 'Search', status: 'in_progress' }],
                            }),
                        },
                    ],
                }
            },
            baseMessages: [
                { role: 'system', content: 'sys' },
                { role: 'user', content: 'plan a research pass' },
            ],
            provider: 'test',
            agentMode: 'plan',
            maxSteps: 4,
        })
        expect(thinkRounds).toBe(1)
    })

    test('tool-round leftover does not become the thought row', async () => {
        const deltas: string[] = []
        await runAgentNodePipeline({
            complete: async ({ omitTools, onThinking }) => {
                if (omitTools) {
                    onThinking?.('Search the PDF first.')
                    return { ok: true as const, content: '', toolCalls: [] }
                }
                return {
                    ok: true as const,
                    content: 'Here is a long ramble about the article that should not be thought. '.repeat(8),
                    toolCalls: [
                        {
                            id: 'c1',
                            name: 'todo_write',
                            argumentsJson: JSON.stringify({
                                tasks: [{ id: 't1', title: 'Search', status: 'in_progress' }],
                            }),
                        },
                    ],
                }
            },
            onActivity: (activity) => {
                if (activity.kind === 'thought' && activity.delta) deltas.push(activity.delta)
            },
            baseMessages: [
                { role: 'system', content: 'sys' },
                { role: 'user', content: 'Compare these two PDFs and extract the core argument' },
            ],
            provider: 'test',
            agentMode: 'ask',
            maxSteps: 2,
        })
        const visible = deltas.join('')
        expect(visible).toContain('Search the PDF first.')
        expect(visible).not.toContain('long ramble')
    })

    test('tool loop prefers Groq before Gemini', () => {
        expect([...TOOL_FAMILY_ORDER]).toEqual(['groq', 'gemini', 'nvidia', 'openai'])
    })

    test('plan mode publishes a written answer when there are no tool calls', async () => {
        const result = await runAgentNodePipeline({
            complete: async () => ({
                ok: true as const,
                content: 'Here is the finished HAIC article, all five sections.',
                toolCalls: [],
            }),
            baseMessages: [
                { role: 'system', content: 'sys' },
                { role: 'user', content: 'write the paper' },
            ],
            provider: 'test',
            agentMode: 'plan',
            maxSteps: 3,
        })
        expect(result.text).toContain('finished HAIC article')
    })

    test('ask mode publishes a long requested article in the public bubble', async () => {
        const article = `Labor and value. ${'word '.repeat(400)}`
        const result = await runAgentNodePipeline({
            complete: async ({ omitTools }) => {
                if (omitTools) return { ok: true as const, content: '', toolCalls: [] }
                return { ok: true as const, content: article, toolCalls: [] }
            },
            baseMessages: [
                { role: 'system', content: 'sys' },
                { role: 'user', content: 'write a 3000 word article about labor' },
            ],
            provider: 'test',
            agentMode: 'ask',
            maxSteps: 3,
        })
        expect(result.text).toContain('Labor and value')
        expect(result.text.length).toBeGreaterThan(800)
    })

    test('after tools with no answer, the host nudges a full public write', async () => {
        let acts = 0
        const result = await runAgentNodePipeline({
            complete: async ({ omitTools }) => {
                if (omitTools) return { ok: true as const, content: '', toolCalls: [] }
                acts += 1
                if (acts === 1) {
                    return {
                        ok: true as const,
                        content: '',
                        toolCalls: [
                            {
                                id: 'c1',
                                name: 'todo_write',
                                argumentsJson: JSON.stringify({
                                    tasks: [{ id: 't1', title: 'Write', status: 'completed' }],
                                }),
                            },
                        ],
                    }
                }
                return { ok: true as const, content: 'Here is the finished essay on labor.', toolCalls: [] }
            },
            baseMessages: [
                { role: 'system', content: 'sys' },
                { role: 'user', content: 'write a long essay about labor' },
            ],
            provider: 'test',
            agentMode: 'ask',
            maxSteps: 4,
        })
        expect(result.text).toContain('finished essay on labor')
    })
})

test.describe('Graph checkpoint resume', () => {
    test('resume instructions switch mode instead of starting a new user turn', () => {
        expect(modeAfterResume('run', 'plan')).toBe('execute')
        expect(modeAfterResume('revise', 'plan')).toBe('plan')
        expect(resumeUserMessage('run')).toContain('approved the plan')
        expect(resumeUserMessage('answer', 'Use the PDF')).toContain('Use the PDF')
    })

    test('finalize_plan starts execute in the same turn without waiting', async () => {
        let started = false
        const modes: string[] = []
        const result = await runAgentNodePipeline({
            complete: async ({ omitTools }) => {
                if (omitTools) return { ok: true as const, content: '', toolCalls: [] }
                if (!started) {
                    started = true
                    return {
                        ok: true as const,
                        content: '',
                        toolCalls: [
                            {
                                id: 'c1',
                                name: 'finalize_plan',
                                argumentsJson: JSON.stringify({ summary: 'Search, then write.' }),
                            },
                        ],
                    }
                }
                return { ok: true as const, content: 'Executed the plan.', toolCalls: [] }
            },
            onMode: (mode) => modes.push(mode),
            baseMessages: [
                { role: 'system', content: 'sys' },
                { role: 'user', content: 'plan a research pass' },
            ],
            provider: 'test',
            agentMode: 'plan',
            maxSteps: 4,
        })
        expect(result.status).toBe('done')
        expect(result.interrupt).toBeUndefined()
        expect(result.checkpoint).toBeUndefined()
        expect(result.agentMode).toBe('execute')
        expect(modes).toContain('execute')
        expect(result.text).toContain('Executed the plan.')
    })

    test('switch_mode execute from plan does not wait for a human', async () => {
        const result = await runAgentNodePipeline({
            complete: async ({ omitTools }) => {
                if (omitTools) return { ok: true as const, content: '', toolCalls: [] }
                return {
                    ok: true as const,
                    content: 'Working the first step.',
                    toolCalls: [{ id: 'c1', name: 'switch_mode', argumentsJson: JSON.stringify({ mode: 'execute' }) }],
                }
            },
            baseMessages: [
                { role: 'system', content: 'sys' },
                { role: 'user', content: 'plan a research pass' },
            ],
            provider: 'test',
            agentMode: 'plan',
            maxSteps: 2,
        })
        expect(result.status).not.toBe('awaiting_human')
        expect(result.interrupt).toBeUndefined()
        expect(result.agentMode).toBe('execute')
    })

    test('ask_user pauses the graph with a parseable checkpoint', async () => {
        const result = await runAgentNodePipeline({
            complete: async () => ({
                ok: true as const,
                content: '',
                toolCalls: [
                    {
                        id: 'c1',
                        name: 'ask_user',
                        argumentsJson: JSON.stringify({
                            title: 'Scope',
                            questions: [{ prompt: 'Which source first?' }],
                        }),
                    },
                ],
            }),
            baseMessages: [
                { role: 'system', content: 'sys' },
                { role: 'user', content: 'plan a research pass' },
            ],
            provider: 'test',
            agentMode: 'plan',
            maxSteps: 3,
        })
        expect(result.status).toBe('awaiting_human')
        expect(result.interrupt?.kind).toBe('ask')
        const parsed = parseAgentCheckpoint(result.checkpoint)
        expect(parsed?.v).toBe(1)
        expect(parsed?.interrupt.kind).toBe('ask')
        expect(parsed?.messages.some((message) => message.role === 'tool')).toBe(true)
    })

    test('resuming from checkpoint continues ROOT without a blank state', async () => {
        const paused = await runAgentNodePipeline({
            complete: async () => ({
                ok: true as const,
                content: '',
                toolCalls: [
                    {
                        id: 'c1',
                        name: 'ask_user',
                        argumentsJson: JSON.stringify({
                            title: 'Scope',
                            questions: [{ prompt: 'Which source first?' }],
                        }),
                    },
                ],
            }),
            baseMessages: [
                { role: 'system', content: 'sys' },
                { role: 'user', content: 'plan a research pass' },
            ],
            provider: 'test',
            agentMode: 'plan',
            maxSteps: 3,
        })
        const checkpoint = parseAgentCheckpoint(paused.checkpoint)
        expect(checkpoint).toBeTruthy()
        const resumed = await runAgentNodePipeline({
            complete: async () => ({
                ok: true as const,
                content: 'Used the PDF.',
                toolCalls: [],
            }),
            baseMessages: [
                { role: 'system', content: 'sys' },
                ...(checkpoint?.messages || []),
                { role: 'user', content: resumeUserMessage('answer', 'Use the PDF') },
            ],
            provider: 'test',
            agentMode: 'execute',
            checkpoint,
            maxSteps: 3,
        })
        expect(resumed.ok).toBe(true)
        expect(resumed.status).toBe('done')
        expect(resumed.text).toContain('Used the PDF.')
    })
})
