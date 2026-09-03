/**
 * Groq/Gemini-honest agent graph (not Anthropic interleaved thinking).
 *
 *   THINK (no tools) → ACT (tools on, content held) → TOOLS → THINK → …
 *   Public text is emitted only from an ACT round with zero tool calls.
 *
 * Edge-runtime safe (Cloudflare Pages / Next.js Edge).
 */

import type { AiCitation } from '../../ai/contracts'
import type { ArtifactDocument } from '../../artifacts/kinds'
import { createActivityClock, type AgentActivity } from '../agent/activity'
import { snapshotCheckpoint, type AgentCheckpoint } from '../agent/checkpoint'
import type { HumanTurn } from '../agent/human'
import { mergePlan, PLAN_ACTIVITY_ID, withHostContext, type PlanTodo } from '../agent/plan'
import {
    EXECUTION_TRANSITION_PROMPT,
    modeTransitionPrompt,
    nodeStatusLabel,
    parseAgentMode,
    type AgentMode,
    type AgentNodeName,
} from '../agent/modes'
import { executeToolCall, resolveToolName, type ToolCall, type ToolExecution } from './execute'
import { splitLeakedToolContent, stripLeakedToolMarkup } from './leak'
import type { HostOsAction, HostSnapshot } from './host'
import { toolResultSummary, toolStatusLabel } from './labels'
import type { EnvStore } from '../runtime-env'
import type { GeminiPart } from './gemini'

const TASK_READ_TOOLS = new Set([
    'web_search',
    'fetch_url',
    'read_document',
    'search_site',
    'read_notebook',
    'read_post',
    'get_workspace',
    'list_notebooks',
])

const THINK_MAX_TOKENS = 48

/** One next-action sentence at the start of a turn. Later cycles use tools and native reasoning only. */
export function shouldRunThinkPhase(input: {
    userPrompt: string
    agentMode: AgentMode
    stepCount: number
    forceWebSearch?: boolean
}): boolean {
    if (input.stepCount > 0) return false
    if (input.agentMode === 'plan' || input.agentMode === 'execute') return true
    if (input.forceWebSearch) return true
    const text = String(input.userPrompt || '')
        .replace(/\[Plan mode[^\]]*\]/gi, '')
        .trim()
    if (!text) return false
    if (text.length > 160) return true
    const words = text.split(/\s+/).filter(Boolean)
    if (words.length > 18) return true
    if (/\b(why|how|explain|analiz|araştır|research|compare|karşılaştır|planla|pdf|notebook)\b/i.test(text)) return true
    if (/(nedir|nasıl|neden|\?)/i.test(text) && words.length > 4) return true
    return false
}

function lastUserText(messages: ChatMessage[]): string {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
        const message = messages[index]
        if (message.role !== 'user' || typeof message.content !== 'string') continue
        if (message.content.includes('<system_reminder>')) continue
        return message.content
    }
    return ''
}

function compactLoopMessages(messages: ChatMessage[]): ChatMessage[] {
    const toolIndexes = messages
        .map((message, index) => (message.role === 'tool' ? index : -1))
        .filter((index) => index >= 0)
    if (toolIndexes.length <= 6) return messages
    const keepFull = new Set(toolIndexes.slice(-4))
    return messages.map((message, index) => {
        if (message.role !== 'tool' || keepFull.has(index) || typeof message.content !== 'string') return message
        if (message.content.length <= 500) return message
        return { ...message, content: `${message.content.slice(0, 500)}…` }
    })
}

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant' | 'tool'
    content: string | null
    tool_calls?: Array<{
        id: string
        type: 'function'
        function: { name: string; arguments: string }
        thoughtSignature?: string
    }>
    tool_call_id?: string
    geminiModelParts?: GeminiPart[]
}

export type ToolEvent = {
    id: string
    name: string
    status: 'running' | 'done' | 'error'
    detail?: string
    arguments?: string
    result?: string
    thoughtSignature?: string
}

export type CompletionRound =
    | { ok: true; content: string; toolCalls: ToolCall[]; modelParts?: GeminiPart[]; reasoning?: string }
    | { ok: false; detail: string; status?: number }

export type AgentPhase = 'decision' | 'tools' | 'synthesis' | 'complete' | 'failed'

export type NodeEvent = {
    name: AgentNodeName
    status: 'started' | 'completed'
    detail?: string
}

export interface AgentState {
    phase: AgentPhase
    messages: ChatMessage[]
    currentToolCalls: ToolCall[]
    currentModelParts?: GeminiPart[]
    artifacts: ArtifactDocument[]
    citations: AiCitation[]
    actions: HostOsAction[]
    scratchpad: Array<{ note: string; source?: string }>
    todos: Array<{ id: string; title: string; status: 'pending' | 'in_progress' | 'completed' }>
    usedTools: boolean
    usedWebSearch: boolean
    publicText: string
    thinkingText: string
    cycleThought: string
    pendingReminder: string
    planNudges: number
    execNudges: number
    writeNudges: number
    stepCount: number
    maxSteps: number
    provider: string
    agentMode: AgentMode
    interrupt?: HumanTurn
    checkpoint?: AgentCheckpoint
    error?: string
}

export interface AgentPipelineParams {
    complete: (input: {
        messages: ChatMessage[]
        toolChoice: 'auto' | 'none' | 'web_search' | 'todo_write'
        onToken?: (text: string) => void
        onThinking?: (text: string) => void
        omitTools?: boolean
        maxTokens?: number
    }) => Promise<CompletionRound>
    baseMessages: ChatMessage[]
    onToken?: (text: string) => void
    onThinking?: (text: string) => void
    onTool?: (event: ToolEvent) => void
    onNode?: (event: NodeEvent) => void
    onMode?: (mode: AgentMode) => void
    onHuman?: (turn: HumanTurn) => void
    onActivity?: (activity: AgentActivity) => void
    clock?: ReturnType<typeof createActivityClock>
    provider: string
    env?: EnvStore
    host?: HostSnapshot
    forceWebSearch?: boolean
    holdPublicUntilCitations?: boolean
    maxSteps?: number
    agentMode?: AgentMode
    checkpoint?: AgentCheckpoint
}

export interface AgentPipelineResult {
    ok: boolean
    usedTools: boolean
    usedWebSearch: boolean
    text: string
    artifacts: ArtifactDocument[]
    citations: AiCitation[]
    actions: HostOsAction[]
    provider: string
    error?: string
    status?: 'done' | 'awaiting_human' | 'tools-rejected' | 'auth' | 'failed'
    agentMode?: AgentMode
    interrupt?: HumanTurn
    checkpoint?: AgentCheckpoint
}

/**
 * Extracts a viable answer if the model generated everything within thinking tags
 * but forgot to emit a clean public tail after </thinking>.
 */
export function extractFallbackAnswerFromThinking(thinking: string): string {
    if (!thinking) return ''
    const clean = thinking
        .replace(/<\/?(?:thinking|think|critique|synthesis|analysis|reflection)[^>]*>/gi, ' ')
        .trim()
    if (!clean) return ''
    return clean
}

/**
 * Decision Node: Prompts the model to either select tools or produce a public answer.
 */
function emitActivity(params: AgentPipelineParams, partial: Omit<AgentActivity, 'seq'>) {
    const clock = params.clock
    if (!clock) return
    params.onActivity?.(clock.next(partial))
}

function closeThought(params: AgentPipelineParams, thoughtId: string) {
    emitActivity(params, { kind: 'thought', id: thoughtId, status: 'done', title: 'Thought' })
}

function emitNode(
    params: AgentPipelineParams,
    name: AgentNodeName,
    status: 'started' | 'completed',
    _cycle = 0
) {
    params.onNode?.({ name, status, detail: nodeStatusLabel(name, status) })
}

function withThinkInstruction(messages: ChatMessage[]): ChatMessage[] {
    return messages.map((message, index) => {
        if (index === 0 && message.role === 'system') {
            return {
                ...message,
                content: `${message.content || ''}\n\nTHINK STEP ONLY: One sentence naming the next tool or step. No essay, no analysis, no user-facing answer. Do not call tools.`,
            }
        }
        return message
    })
}

function emitThoughtDelta(params: AgentPipelineParams, thoughtId: string, piece: string) {
    if (!piece) return
    params.onThinking?.(piece)
    emitActivity(params, {
        kind: 'thought',
        id: thoughtId,
        status: 'running',
        title: 'Thought',
        delta: piece,
    })
}

async function runThinkPhase(state: AgentState, params: AgentPipelineParams, thoughtId: string): Promise<void> {
    let nativeThought = 0
    const absorb = (delta: string, fromNative: boolean) => {
        if (!delta) return
        if (fromNative) nativeThought += delta.length
        else if (nativeThought > 0) return
        state.thinkingText += delta
        emitThoughtDelta(params, thoughtId, delta)
    }
    const started = state.thinkingText.length
    const think = await params.complete({
        messages: withThinkInstruction(
            withHostContext(compactLoopMessages(state.messages), {
                todos: state.todos,
                reminder: state.pendingReminder,
                memories: params.host?.scratchpad?.memories,
            })
        ),
        toolChoice: 'none',
        omitTools: true,
        maxTokens: THINK_MAX_TOKENS,
        onThinking: (delta) => absorb(delta, true),
        onToken: (text) => absorb(text, false),
    })
    if (think.ok && think.reasoning && nativeThought === 0) {
        absorb(think.reasoning, true)
    }
    state.cycleThought = state.thinkingText.slice(started)
}

async function runDecisionNode(state: AgentState, params: AgentPipelineParams): Promise<void> {
    const cycle = state.stepCount
    const thoughtId = `thought-${cycle}-${state.messages.length}`
    emitNode(params, 'root', 'started', cycle)
    if (
        shouldRunThinkPhase({
            userPrompt: lastUserText(state.messages),
            agentMode: state.agentMode,
            stepCount: state.stepCount,
            forceWebSearch: params.forceWebSearch,
        })
    ) {
        await runThinkPhase(state, params, thoughtId)
    }
    const isLastStep = state.stepCount >= state.maxSteps - 1
    const toolChoice: 'auto' | 'none' | 'web_search' | 'todo_write' = isLastStep
        ? 'none'
        : state.agentMode === 'plan' && state.todos.length === 0
          ? 'todo_write'
          : state.stepCount === 0 && params.forceWebSearch
            ? 'web_search'
            : 'auto'

    const emitPublic = (text: string) => {
        const cleaned = stripLeakedToolMarkup(text)
        if (!cleaned) return
        if (params.holdPublicUntilCitations && state.citations.length === 0) return
        params.onToken?.(cleaned)
    }

    let streamedThought = 0
    let heldPublic = ''
    const round = await params.complete({
        messages: withHostContext(compactLoopMessages(state.messages), {
            todos: state.todos,
            thought: state.cycleThought,
            reminder: state.pendingReminder,
            memories: params.host?.scratchpad?.memories,
        }),
        toolChoice,
        onToken: (text) => {
            heldPublic += text
        },
        onThinking: (delta) => {
            if (!delta) return
            streamedThought += delta.length
            state.thinkingText += delta
            emitThoughtDelta(params, thoughtId, delta)
        },
    })

    state.stepCount += 1

    if (!round.ok) {
        closeThought(params, thoughtId)
        emitNode(params, 'root', 'completed', cycle)
        state.error = round.detail
        state.phase = 'failed'
        return
    }

    if (round.reasoning && streamedThought === 0) {
        streamedThought += round.reasoning.length
        state.thinkingText += round.reasoning
        emitThoughtDelta(params, thoughtId, round.reasoning)
    }

    state.currentToolCalls = round.toolCalls || []
    state.currentModelParts = round.modelParts

    const roundContent = round.content || heldPublic
    const leaked = splitLeakedToolContent(roundContent)
    if (leaked.calls.length > 0 && state.currentToolCalls.length === 0 && !isLastStep) {
        state.currentToolCalls = leaked.calls
    }
    const leftover = leaked.cleaned

    if (state.currentToolCalls.length > 0) {
        closeThought(params, thoughtId)
        emitNode(params, 'root', 'completed', cycle)
        state.usedTools = true
        state.messages.push({
            role: 'assistant',
            content: leftover || null,
            tool_calls: state.currentToolCalls.map((call) => ({
                id: call.id,
                type: 'function' as const,
                function: { name: call.name, arguments: call.argumentsJson },
                thoughtSignature: call.thoughtSignature,
            })),
            geminiModelParts: state.currentModelParts,
        })
        state.phase = 'tools'
        return
    }

    if (leftover) {
        emitPublic(leftover)
        state.publicText += leftover
        closeThought(params, thoughtId)
        emitNode(params, 'root', 'completed', cycle)
        state.phase = 'synthesis'
        return
    }

    if (state.agentMode === 'plan' && state.stepCount < state.maxSteps && state.planNudges < 2) {
        closeThought(params, thoughtId)
        emitNode(params, 'root', 'completed', cycle)
        state.planNudges += 1
        state.pendingReminder =
            state.todos.length === 0
                ? 'Plan mode is on. Use todo_write or research tools if they help, or write the user-facing piece now.'
                : 'Continue as needed: research, finalize_plan if you need mutating tools, or write the user-facing piece now.'
        state.phase = 'decision'
        return
    }

    if (
        !state.publicText.trim() &&
        state.usedTools &&
        state.stepCount < state.maxSteps &&
        state.writeNudges < 1
    ) {
        closeThought(params, thoughtId)
        emitNode(params, 'root', 'completed', cycle)
        state.writeNudges += 1
        state.pendingReminder =
            'Write the full user-requested answer in the public bubble now. No tools. If they asked for a long article, essay, or word count, write that length. Do not outline. Do not summarize.'
        state.phase = 'decision'
        return
    }
    closeThought(params, thoughtId)
    emitNode(params, 'root', 'completed', cycle)
    state.phase = 'synthesis'
}

function parseJsonObject(raw: string): Record<string, unknown> | null {
    try {
        const parsed = JSON.parse(raw) as unknown
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null
    } catch {
        return null
    }
}

function enterExecute(state: AgentState, params: AgentPipelineParams, summary?: string): string {
    state.agentMode = 'execute'
    params.onMode?.('execute')
    const current =
        state.todos.find((todo) => todo.status === 'in_progress') ||
        state.todos.find((todo) => todo.status !== 'completed')
    state.pendingReminder = current
        ? `Plan is locked. Execute now. Current step: ${current.title}. Call the tools needed, then todo_write with the SAME ids. Do not wait for the user.`
        : 'Write the full user-requested piece in the public bubble now. If they asked for a long article or word count, write that length. No more planning.'
    return [EXECUTION_TRANSITION_PROMPT, summary ? `Plan summary: ${summary}` : ''].filter(Boolean).join('\n\n')
}

async function runTaskSubagent(
    goal: string,
    parentCall: ToolCall,
    state: AgentState,
    params: AgentPipelineParams
): Promise<ToolExecution> {
    const subMessages: ChatMessage[] = [
        {
            role: 'system',
            content:
                'You are a focused subagent. Complete the goal with at most two read-only tool calls. Return a short factual report. Do not write a user-facing essay.',
        },
        { role: 'user', content: goal },
    ]
    let report = ''
    for (let step = 0; step < 2; step += 1) {
        const round = await params.complete({
            messages: subMessages,
            toolChoice: step === 1 ? 'none' : 'auto',
        })
        if (!round.ok) {
            const result = JSON.stringify({ ok: false, error: round.detail || 'subtask failed' })
            return {
                callId: parentCall.id,
                name: 'task',
                ok: false,
                result,
                summary: toolResultSummary('task', false, result),
            }
        }
        if (!round.toolCalls.length) {
            report = round.content || ''
            break
        }
        subMessages.push({
            role: 'assistant',
            content: round.content || null,
            tool_calls: round.toolCalls.map((call) => ({
                id: call.id,
                type: 'function' as const,
                function: { name: call.name, arguments: call.argumentsJson },
                thoughtSignature: call.thoughtSignature,
            })),
        })
        for (const nested of round.toolCalls.slice(0, 2)) {
            const nestedName = resolveToolName(nested.name)
            if (!TASK_READ_TOOLS.has(nestedName)) {
                subMessages.push({
                    role: 'tool',
                    tool_call_id: nested.id,
                    content: JSON.stringify({ ok: false, error: 'subagent may only use read tools' }),
                })
                continue
            }
            params.onTool?.({
                id: nested.id,
                name: nestedName,
                status: 'running',
                arguments: nested.argumentsJson.slice(0, 800),
                detail: toolStatusLabel(nestedName, 'running'),
            })
            emitActivity(params, {
                kind: 'tool',
                id: `tool-${nested.id}`,
                status: 'running',
                title: toolStatusLabel(nestedName, 'running'),
                toolName: nestedName,
                arguments: nested.argumentsJson.slice(0, 800),
            })
            const nestedExec = await executeToolCall(nested, params.env, params.host, 'ask')
            if (nestedName === 'web_search') state.usedWebSearch = true
            if (nestedExec.citations?.length) state.citations.push(...nestedExec.citations)
            params.onTool?.({
                id: nested.id,
                name: nestedName,
                status: nestedExec.ok ? 'done' : 'error',
                arguments: nested.argumentsJson.slice(0, 800),
                result: nestedExec.result.slice(0, 1200),
                detail: nestedExec.summary || toolResultSummary(nestedName, nestedExec.ok, nestedExec.result),
            })
            emitActivity(params, {
                kind: 'tool',
                id: `tool-${nested.id}`,
                status: nestedExec.ok ? 'done' : 'error',
                title: nestedExec.summary || toolResultSummary(nestedName, nestedExec.ok, nestedExec.result),
                toolName: nestedName,
                arguments: nested.argumentsJson.slice(0, 800),
                result: nestedExec.result.slice(0, 1200),
            })
            subMessages.push({
                role: 'tool',
                tool_call_id: nested.id,
                content: nestedExec.result,
            })
        }
    }
    if (!report.trim()) {
        const last = await params.complete({
            messages: subMessages,
            toolChoice: 'none',
            omitTools: true,
        })
        report = last.ok ? last.content : ''
    }
    const result = JSON.stringify({ ok: true, report: report.slice(0, 4_000) })
    return {
        callId: parentCall.id,
        name: 'task',
        ok: true,
        result,
        summary: report.trim() ? 'Finished subtask' : toolResultSummary('task', true, result),
    }
}

const PARALLEL_READ_TOOLS = new Set([
    'web_search',
    'fetch_url',
    'read_document',
    'read_notebook',
    'read_post',
    'get_workspace',
    'search_site',
    'list_notebooks',
])

function emitToolRunning(call: ToolCall, params: AgentPipelineParams): string {
    const name = resolveToolName(call.name)
    const kind = name === 'todo_write' ? 'plan' : 'tool'
    const activityId = name === 'todo_write' ? PLAN_ACTIVITY_ID : `tool-${call.id}`
    params.onTool?.({
        id: call.id,
        name,
        status: 'running',
        arguments: call.argumentsJson.slice(0, 800),
        detail: toolStatusLabel(name, 'running'),
        thoughtSignature: call.thoughtSignature,
    })
    emitActivity(params, {
        kind,
        id: activityId,
        status: 'running',
        title: toolStatusLabel(name, 'running'),
        toolName: name,
        arguments: call.argumentsJson.slice(0, 800),
    })
    return name
}

async function runOneToolCall(
    call: ToolCall,
    state: AgentState,
    params: AgentPipelineParams,
    preExecuted?: ToolExecution
): Promise<void> {
    const name = resolveToolName(call.name)
    const kind = name === 'todo_write' ? 'plan' : 'tool'
    const activityId = name === 'todo_write' ? PLAN_ACTIVITY_ID : `tool-${call.id}`
    if (!preExecuted) emitToolRunning(call, params)

    let executed = preExecuted || (await executeToolCall(call, params.env, params.host, state.agentMode))

    if (executed.artifact) {
        state.artifacts.push(executed.artifact)
    }
    if (executed.citations?.length) {
        state.citations.push(...executed.citations)
    }
    if (executed.action) {
        state.actions.push(executed.action)
    }
    if (name === 'web_search') {
        state.usedWebSearch = true
    }
    if (name === 'write_scratchpad' && executed.ok) {
        try {
            const parsed = JSON.parse(executed.result)
            if (parsed.note) {
                state.scratchpad.push({ note: parsed.note, source: parsed.source })
            }
        } catch {
            state.scratchpad.push({ note: executed.result })
        }
    }
    if (name === 'remember' && executed.ok) {
        const parsed = parseJsonObject(executed.result)
        if (typeof parsed?.fact === 'string' && parsed.fact) {
            state.scratchpad.push({ note: parsed.fact, source: 'memory' })
        }
    }
    if (name === 'todo_write' && executed.ok) {
        try {
            const parsed = JSON.parse(executed.result)
            if (Array.isArray(parsed.tasks)) {
                state.todos = mergePlan(state.todos as PlanTodo[], parsed.tasks as PlanTodo[])
                const current = state.todos.find((todo) => todo.status === 'in_progress')
                const completedCount = state.todos.filter((todo) => todo.status === 'completed').length
                executed = {
                    ...executed,
                    result: JSON.stringify({
                        ok: true,
                        locked: true,
                        tasks: state.todos,
                        progress: `${completedCount}/${state.todos.length}`,
                        current: current?.title,
                        instruction: current
                            ? `Do this step now: ${current.title}. Then todo_write with the SAME ids.`
                            : 'All steps completed. Write the full user-requested answer in the public bubble now. If they asked for a long article or word count, write that length. No more tools.',
                    }),
                    summary: current
                        ? `Working on: ${current.title} (${completedCount}/${state.todos.length})`
                        : `Plan complete (${completedCount}/${state.todos.length})`,
                }
            }
        } catch {}
    }

    if (name === 'task' && executed.ok) {
        const parsed = parseJsonObject(executed.result)
        const goal = typeof parsed?.goal === 'string' ? parsed.goal.trim() : ''
        if (goal) {
            executed = await runTaskSubagent(goal, call, state, params)
        }
    }

    let toolContent = executed.result
    if (name === 'switch_mode' && executed.ok) {
        const parsed = parseJsonObject(executed.result)
        const next = parseAgentMode(parsed?.mode)
        if (next === 'execute') {
            toolContent = enterExecute(state, params)
        } else if (next === 'plan') {
            state.agentMode = next
            params.onMode?.(next)
            toolContent = modeTransitionPrompt(next)
        }
    }
    if (name === 'finalize_plan' && executed.ok) {
        const parsed = parseJsonObject(executed.result)
        const summary = typeof parsed?.summary === 'string' ? parsed.summary : undefined
        toolContent = enterExecute(state, params, summary)
    }
    const summary = executed.summary || toolResultSummary(name, executed.ok, executed.result)
    params.onTool?.({
        id: call.id,
        name,
        status: executed.ok ? 'done' : 'error',
        arguments: call.argumentsJson.slice(0, 800),
        result: executed.result.slice(0, 1200),
        detail: summary,
        thoughtSignature: call.thoughtSignature,
    })
    emitActivity(params, {
        kind,
        id: activityId,
        status: executed.ok ? 'done' : 'error',
        title: summary,
        detail: summary,
        toolName: name,
        arguments:
            name === 'todo_write'
                ? JSON.stringify({ tasks: state.todos }).slice(0, 800)
                : call.argumentsJson.slice(0, 800),
        result: executed.result.slice(0, 1200),
    })

    state.messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: toolContent,
    })
}

/**
 * Tools Node: read-only tools can run together; mutating / plan tools stay ordered.
 */
async function runToolsNode(state: AgentState, params: AgentPipelineParams): Promise<void> {
    const cycle = state.stepCount
    emitNode(params, 'tools', 'started', cycle)
    const calls = state.currentToolCalls
    state.currentToolCalls = []

    let index = 0
    while (index < calls.length && !state.interrupt) {
        if (PARALLEL_READ_TOOLS.has(resolveToolName(calls[index].name))) {
            let end = index + 1
            while (end < calls.length && PARALLEL_READ_TOOLS.has(resolveToolName(calls[end].name))) end += 1
            const batch = calls.slice(index, end)
            for (const call of batch) emitToolRunning(call, params)
            const rows = await Promise.all(
                batch.map(async (call) => ({
                    call,
                    executed: await executeToolCall(call, params.env, params.host, state.agentMode),
                }))
            )
            for (const row of rows) {
                if (state.interrupt) break
                await runOneToolCall(row.call, state, params, row.executed)
            }
            index = end
            continue
        }
        await runOneToolCall(calls[index], state, params)
        index += 1
    }

    emitNode(params, 'tools', 'completed', cycle)
    const current = state.todos.find((todo) => todo.status === 'in_progress')
    if (current && !state.interrupt) {
        state.pendingReminder = `Current locked step: ${current.title}. Do that work now. Then todo_write with the SAME ids.`
    }
    state.cycleThought = ''
    if (state.interrupt) {
        state.checkpoint = snapshotCheckpoint({
            messages: state.messages,
            todos: state.todos,
            scratchpad: state.scratchpad,
            agentMode: state.agentMode,
            stepCount: state.stepCount,
            usedTools: state.usedTools,
            usedWebSearch: state.usedWebSearch,
            interrupt: state.interrupt,
        })
        params.onHuman?.(state.interrupt)
        state.phase = 'synthesis'
        return
    }
    if (state.stepCount >= state.maxSteps) {
        state.phase = 'synthesis'
    } else {
        state.phase = 'decision'
    }
}

/**
 * Synthesis Node: Finalizes output, ensuring that thinking-only turns do not end empty.
 */
function runSynthesisNode(state: AgentState, params: AgentPipelineParams): void {
    const cycle = state.stepCount
    emitNode(params, 'synthesis', 'started', cycle)
    state.publicText = stripLeakedToolMarkup(state.publicText)
    if (!state.publicText.trim()) {
        if (state.interrupt || state.usedTools || state.artifacts.length > 0 || state.citations.length > 0) {
            state.phase = 'complete'
            emitNode(params, 'synthesis', 'completed', cycle)
            return
        }

        const recovered = extractFallbackAnswerFromThinking(state.thinkingText)
        if (recovered) {
            state.publicText = recovered
        }
    }

    state.phase = 'complete'
    emitNode(params, 'synthesis', 'completed', cycle)
}

/**
 * Main State Graph Runner (PostHog-style Agent Loop).
 */
export async function runAgentNodePipeline(params: AgentPipelineParams): Promise<AgentPipelineResult> {
    if (!params.clock) params.clock = createActivityClock()
    const maxSteps = params.maxSteps ?? 16
    const restored = params.checkpoint
    const state: AgentState = {
        phase: 'decision',
        messages: params.baseMessages.map((item) => ({ ...item })),
        currentToolCalls: [],
        artifacts: [],
        citations: [],
        actions: [],
        scratchpad: restored?.scratchpad ? restored.scratchpad.map((item) => ({ ...item })) : [],
        todos: restored?.todos ? restored.todos.map((item) => ({ ...item })) : [],
        usedTools: restored?.usedTools || false,
        usedWebSearch: restored?.usedWebSearch || false,
        publicText: '',
        thinkingText: '',
        cycleThought: '',
        pendingReminder: '',
        planNudges: 0,
        execNudges: 0,
        writeNudges: 0,
        stepCount: 0,
        maxSteps,
        provider: params.provider,
        agentMode: parseAgentMode(params.agentMode),
    }

    while (state.phase !== 'complete' && state.phase !== 'failed') {
        switch (state.phase) {
            case 'decision':
                await runDecisionNode(state, params)
                break
            case 'tools':
                await runToolsNode(state, params)
                break
            case 'synthesis':
                runSynthesisNode(state, params)
                break
        }
    }

    const hasProduct =
        Boolean(state.publicText.trim()) ||
        Boolean(state.interrupt) ||
        state.usedTools ||
        state.artifacts.length > 0 ||
        state.citations.length > 0

    return {
        ok: state.phase === 'complete' && hasProduct,
        usedTools: state.usedTools,
        usedWebSearch: state.usedWebSearch,
        text: state.publicText,
        artifacts: state.artifacts,
        citations: state.citations,
        actions: state.actions,
        provider: state.provider,
        error: state.error,
        status: state.interrupt ? 'awaiting_human' : state.phase === 'complete' ? 'done' : 'failed',
        interrupt: state.interrupt,
        checkpoint: state.checkpoint,
        agentMode: state.agentMode,
    }
}
