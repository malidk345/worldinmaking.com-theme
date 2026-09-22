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
import { countModel3DRenderable, model3dGeometryDigest, parseModel3DSpecStrict } from '../../ai/visual-artifacts'
import { createActivityClock, type AgentActivity } from '../agent/activity'
import { snapshotCheckpoint, type AgentCheckpoint } from '../agent/checkpoint'
import type { HumanTurn } from '../agent/human'
import { memoriesForHostContext, mergePlan, PLAN_ACTIVITY_ID, seedLongFormPlan, withHostContext, type PlanTodo } from '../agent/plan'
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
import { toolActivityTitle, toolResultSummary } from './labels'
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
    'search_academic_corpus',
    'verified_corpus_search',
    'run_code_sandbox',
])

/** Cap for the host THINK round. gpt-oss native CoT still counts against this. */
export const THINK_MAX_TOKENS = 256
/** Host THINK must not burn the full 45s tool-completion budget — silent UI otherwise. */
export const THINK_TIMEOUT_MS = 15_000

/** Host THINK is the comprehensive planning round where the entire approach is decided. */
export const THINK_PLAN_INSTRUCTION =
    'PLANNING STEP: In a few short sentences, plan your entire approach: identify the core thesis, the analytical argument, the structure of your answer, and whether any tools are needed. Keep this private to your reasoning. Do not call tools in this thought.'

/** Plan mode: this step only — not the whole essay approach. */
export const THINK_PLAN_MODE_INSTRUCTION =
    'PLANNING STEP (plan mode): In a few short sentences, focus on THIS step only: open questions, sources to check, success criteria for the current todo, and one tool move. Do not plan the entire essay approach. Keep this private to your reasoning. Do not call tools in this thought.'

export const THINK_REFLECT_INSTRUCTION =
    'REFLECTION STEP: In a few short sentences, evaluate if the tool results fully satisfy what the user requested. If more information or another tool is needed, identify it; otherwise, outline how to synthesize the comprehensive final answer. Keep this private to your reasoning. Do not repeat the results. Do not call tools in this thought.'

/** Plan mode reflect: enough for this step? → scratchpad/todo+STOP vs one more focused call. */
export const THINK_REFLECT_PLAN_INSTRUCTION =
    'REFLECTION STEP (plan mode): In a few short sentences, is this enough for the CURRENT step? If yes: write_scratchpad (citations/synthesis) and/or todo_write with the SAME ids, then STOP. If no: one more focused tool for this step only. Do not start the next step. Keep this private to your reasoning. Do not call tools in this thought.'

/**
 * Plan-mode research cluster size before requiring scratchpad + stop.
 * N=3: allows a typical search → fetch → read trio without starving deep research;
 * beyond that, findings must hit write_scratchpad and the turn stops (step isolation).
 */
export const PLAN_RESEARCH_CLUSTER_N = 3

/** Research / read tools that count toward the plan-mode research cluster. */
export const PLAN_RESEARCH_TOOL_NAMES = new Set([
    'web_search',
    'fetch_url',
    'read_document',
    'search_site',
    'search_academic_corpus',
    'verified_corpus_search',
    'read_notebook',
    'read_post',
    'list_notebooks',
    'get_workspace',
    'task',
    'analyze_image',
    'transcribe_audio',
    'run_code_sandbox',
    'cross_examine_argument',
])

export function isPlanResearchTool(name: string): boolean {
    return PLAN_RESEARCH_TOOL_NAMES.has(name)
}

export function thinkInstructionFor(agentMode: AgentMode, postTool = false): string {
    if (agentMode === 'plan') {
        return postTool ? THINK_REFLECT_PLAN_INSTRUCTION : THINK_PLAN_MODE_INSTRUCTION
    }
    return postTool ? THINK_REFLECT_INSTRUCTION : THINK_PLAN_INSTRUCTION
}

/** Soft gate before finalize_plan interrupt — returns reminder text or null if ready. */
export function finalizePlanReadinessReminder(input: {
    todos: Array<{ id: string; title: string; status: string }>
    scratchpad: Array<{ note: string; source?: string }>
    usedWebSearch?: boolean
    /** True when any plan research tool succeeded this turn (or prior in restored state). */
    usedPlanResearch?: boolean
}): string | null {
    if (!input.todos.length) {
        return 'finalize_plan needs a todo spine first. Call todo_write with the plan steps (include short done_when where helpful), then finalize_plan.'
    }
    const completedResearch = input.todos.some(
        (todo) =>
            todo.status === 'completed' &&
            /research|source|search|ara[sş]t[iı]r|kaynak|corpus|citation/i.test(todo.title)
    )
    const hasResearchScratch = input.scratchpad.some(
        (item) => item.source !== 'memory' && Boolean(item.note?.trim())
    )
    if ((completedResearch || input.usedWebSearch || input.usedPlanResearch) && !hasResearchScratch) {
        return 'Research findings are not on the scratchpad yet. Call write_scratchpad with citations/synthesis for the research step, then finalize_plan.'
    }
    return null
}

/** Soft optional hint when public text already streamed this turn — prefer continue/refine, not a hard rule. */
export const PUBLIC_CONTINUE_NUDGE =
    'Prefer continuing or refining the public text already in this bubble rather than restating it from the start.'

/** Reflection and planning phase: runs at start of a turn and after tool executions to digest results. */
export function shouldRunThinkPhase(input: {
    userPrompt: string
    agentMode: AgentMode
    stepCount: number
    forceWebSearch?: boolean
    hasNewToolResults?: boolean
}): boolean {
    if (input.hasNewToolResults) return true
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
    if (/(nedir|nasıl|neden)/i.test(text) && words.length > 8) return true
    if (/\?/i.test(text) && words.length > 10) return true
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

/** Recent tool results stay fuller mid multi-tool jobs; older digest. Soft limits — not a hard wipe. */
export const LOOP_RECENT_TOOL_KEEP = 8
export const LOOP_RECENT_TOOL_CHARS = 8_000
export const LOOP_OLD_TOOL_CHARS = 360

/** Soft optional hint when this turn is near maxSteps — finish a coherent chunk; continue next turn if needed. */
export const LONG_JOB_CONTINUE_NUDGE =
    "Approaching this turn's step budget: prefer finishing a coherent chunk now. If more remains, leave todos or a short note — you can continue on the next user turn."

/** Prefer id/title when a tool result is a large artifact-shaped payload. Always keep error/detail. */
export function digestToolResultForLoop(content: string, maxChars: number): string {
    if (content.length <= maxChars) return content
    try {
        const parsed = JSON.parse(content) as Record<string, unknown>
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            const id = typeof parsed.id === 'string' ? parsed.id : undefined
            const title = typeof parsed.title === 'string' ? parsed.title : undefined
            const type = typeof parsed.type === 'string' ? parsed.type : undefined
            const error =
                typeof parsed.error === 'string'
                    ? parsed.error
                    : typeof parsed.detail === 'string'
                      ? parsed.detail
                      : typeof parsed.message === 'string'
                        ? parsed.message
                        : undefined
            if (id || title) {
                const stub: Record<string, unknown> = {
                    ok: parsed.ok,
                    id,
                    type,
                    title,
                    note: 'Body omitted — revise with create_artifact using the same title if needed.',
                }
                // Never drop critical failure context when digesting huge payloads.
                if (error) stub.error = error
                if (parsed.ok === false && stub.ok === undefined) stub.ok = false
                return JSON.stringify(stub)
            }
            if (typeof parsed.content === 'string' && parsed.content.length > 400) {
                const slim: Record<string, unknown> = {
                    ...parsed,
                    content: '[omitted — id/title enough to revise]',
                }
                const encoded = JSON.stringify(slim)
                if (encoded.length <= maxChars) return encoded
            }
        }
    } catch {
        /* plain text */
    }
    return `${content.slice(0, maxChars)}…`
}

function compactCreateArtifactArgs(argumentsJson: string, keepFull: boolean): string {
    if (keepFull || argumentsJson.length <= 2_500) return argumentsJson
    try {
        const args = JSON.parse(argumentsJson) as Record<string, unknown>
        if (!args || typeof args !== 'object' || Array.isArray(args)) {
            return `${argumentsJson.slice(0, 2_500)}…`
        }
        const content = args.content
        if (typeof content === 'string' && content.length > 800) {
            const type = typeof args.type === 'string' ? args.type : undefined
            // Keep a geometry digest so staged model3d enrich still knows the scaffold shape.
            const digest =
                type === 'model3d' || type === '3d' || type === '3d_model' || type === 'scene'
                    ? model3dGeometryDigest(content)
                    : ''
            const note = digest
                ? `[prior body omitted — ${digest}; revise with create_artifact same title and FULL objects[] (not materials/camera-only)]`
                : '[prior body omitted — revise with create_artifact same title; enrich must resend full body]'
            return JSON.stringify({
                type: args.type,
                title: args.title,
                content: note,
                _compacted: true,
                ...(digest ? { _geometry: digest } : {}),
            })
        }
    } catch {
        /* keep slice */
    }
    return argumentsJson.length <= 2_500 ? argumentsJson : `${argumentsJson.slice(0, 2_500)}…`
}

function normalizedArtifactTitle(title: string | undefined): string {
    return String(title || '')
        .toLowerCase()
        .trim()
        .replace(/[\s\-_]+/g, '')
}

/** True when incoming model3d would wipe a richer same-title scaffold (blank enrich). */
export function isWeakerModel3dRevision(
    incoming: { type?: string; title?: string; content?: string },
    previous: { type?: string; title?: string; content?: string }
): boolean {
    if (incoming.type !== 'model3d' || previous.type !== 'model3d') return false
    if (normalizedArtifactTitle(incoming.title) !== normalizedArtifactTitle(previous.title)) return false
    const prevSpec = parseModel3DSpecStrict(previous.content || '')
    const nextSpec = parseModel3DSpecStrict(incoming.content || '')
    if (!prevSpec) return false
    // Invalid/empty incoming is weaker.
    if (!nextSpec) return true
    if (prevSpec.url && !nextSpec.url && countModel3DRenderable(nextSpec.objects) === 0) return true
    const prevN = prevSpec.url ? 10_000 : countModel3DRenderable(prevSpec.objects)
    const nextN = nextSpec.url ? 10_000 : countModel3DRenderable(nextSpec.objects)
    return prevN > 0 && nextN < prevN
}

/** Soften mid-loop tool memory: last N results fuller; older digest; only latest create_artifact body kept full. */
export function compactLoopMessages(messages: ChatMessage[]): ChatMessage[] {
    const toolIndexes = messages
        .map((message, index) => (message.role === 'tool' ? index : -1))
        .filter((index) => index >= 0)
    if (toolIndexes.length === 0) return messages

    const keepFullToolIdx = new Set(toolIndexes.slice(-LOOP_RECENT_TOOL_KEEP))
    // Staged scaffold→enrich can stack many large create_artifact bodies. Keep only the latest
    // full (same idea as history.ts last-artifact body) so 8×120k args cannot blow the budget.
    let latestCreateArtifactId: string | null = null
    for (let i = messages.length - 1; i >= 0; i -= 1) {
        const message = messages[i]
        if (message.role !== 'assistant' || !message.tool_calls?.length) continue
        for (let j = message.tool_calls.length - 1; j >= 0; j -= 1) {
            const call = message.tool_calls[j]
            if (call?.function?.name === 'create_artifact' && call.id) {
                latestCreateArtifactId = call.id
                break
            }
        }
        if (latestCreateArtifactId) break
    }

    return messages.map((message, index) => {
        if (message.role === 'tool' && typeof message.content === 'string') {
            const limit = keepFullToolIdx.has(index) ? LOOP_RECENT_TOOL_CHARS : LOOP_OLD_TOOL_CHARS
            if (message.content.length <= limit) return message
            return { ...message, content: digestToolResultForLoop(message.content, limit) }
        }
        if (message.role === 'assistant' && message.tool_calls?.length) {
            let changed = false
            const tool_calls = message.tool_calls.map((call) => {
                const name = call.function?.name
                if (name !== 'create_artifact') return call
                const keep = Boolean(latestCreateArtifactId && call.id === latestCreateArtifactId)
                const nextArgs = compactCreateArtifactArgs(call.function.arguments || '{}', keep)
                if (nextArgs === call.function.arguments) return call
                changed = true
                return { ...call, function: { ...call.function, arguments: nextArgs } }
            })
            return changed ? { ...message, tool_calls } : message
        }
        return message
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
    todos: Array<{ id: string; title: string; status: 'pending' | 'in_progress' | 'completed'; done_when?: string; needs_evidence?: boolean }>
    usedTools: boolean
    usedWebSearch: boolean
    publicText: string
    thinkingText: string
    cycleThought: string
    pendingReminder: string
    planNudges: number
    /** Plan mode: end the turn after completing one todo step (quality isolation). */
    stopAfterTools: boolean
    /** Plan mode: research tools since last todo advance / scratchpad persist. */
    researchClusterCount: number
    /** Plan mode: nudged once to write_scratchpad after a research cluster. */
    researchClusterAwaitingScratchpad: boolean
    /** Plan mode: at least one research tool succeeded (finalize soft gate). */
    usedPlanResearch: boolean
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
        timeoutMs?: number
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
    signal?: AbortSignal
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

function withThinkInstruction(messages: ChatMessage[], postTool = false, agentMode: AgentMode = 'ask'): ChatMessage[] {
    const instruction = thinkInstructionFor(agentMode, postTool)

    return messages.map((message, index) => {
        if (index === 0 && message.role === 'system') {
            return {
                ...message,
                content: `${message.content || ''}\n\n${instruction}`,
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

async function runThinkPhase(
    state: AgentState,
    params: AgentPipelineParams,
    thoughtId: string,
    postTool = false
): Promise<{ paintedThought: boolean }> {
    let nativeThought = 0
    let paintedThought = false
    /**
     * Think-phase demux:
     * - Native reasoning (onThinking) → Thought UI + thinkingText (always).
     * - Content tokens (onToken):
     *   - Pre-tool / planning THINK: thinkingText only (cycleThought / empty-public
     *     fallback). Do NOT paint Thought — models often draft a full answer here
     *     (#775 answer-leak guard).
     *   - Post-tool / reflect THINK (`postTool`): also paint Thought. Gemini host
     *     THINK uses omitTools → thinkingBudget:0 / no native thoughts, so reflect
     *     is content-only; without this the second Thought after tools is invisible
     *     even though reflection still feeds cycleThought → next ACT (#775/#785).
     */
    const absorb = (delta: string, fromNative: boolean) => {
        if (!delta) return
        if (fromNative) {
            nativeThought += delta.length
            state.thinkingText += delta
            emitThoughtDelta(params, thoughtId, delta)
            paintedThought = true
            return
        }
        // Content during think. If native reasoning already arrived, drop content
        // (same as before). Otherwise buffer into thinkingText for cycleThought /
        // extractFallbackAnswerFromThinking.
        if (nativeThought > 0) return
        state.thinkingText += delta
        // Post-tool reflect only: paint content-only THINK into Thought UI so users
        // see tool-result mastery. Planning/decision must not (#775).
        if (postTool) {
            emitThoughtDelta(params, thoughtId, delta)
            paintedThought = true
        }
    }
    const started = state.thinkingText.length
    const think = await params.complete({
        messages: withThinkInstruction(
            withHostContext(compactLoopMessages(state.messages), {
            todos: state.todos,
            mode: state.agentMode,
                reminder: state.pendingReminder,
                memories: memoriesForHostContext(params.host?.scratchpad?.memories, state.scratchpad),
            }),
            postTool,
            state.agentMode
        ),
        toolChoice: 'none',
        omitTools: true,
        maxTokens: THINK_MAX_TOKENS,
        timeoutMs: THINK_TIMEOUT_MS,
        onThinking: (delta) => absorb(delta, true),
        onToken: (text) => absorb(text, false),
    })
    if (think.ok && think.reasoning && nativeThought === 0) {
        absorb(think.reasoning, true)
    }
    state.cycleThought = state.thinkingText.slice(started)
    return { paintedThought }
}

async function runDecisionNode(state: AgentState, params: AgentPipelineParams): Promise<void> {
    const cycle = state.stepCount
    const thoughtId = `thought-${cycle}-${state.messages.length}`
    emitNode(params, 'root', 'started', cycle)
    const hasNewToolResults =
        state.messages.length > 0 && state.messages[state.messages.length - 1]?.role === 'tool'

    // Thought UI already painted in think phase (native only). Content-buffered
    // cycleThought alone must NOT suppress decision native streaming — that was
    // the #775 regression (Thought dumped only when decision reasoning arrived).
    let thoughtUiPainted = false
    if (
        shouldRunThinkPhase({
            userPrompt: lastUserText(state.messages),
            agentMode: state.agentMode,
            stepCount: state.stepCount,
            forceWebSearch: params.forceWebSearch,
            hasNewToolResults,
        })
    ) {
        const thinkResult = await runThinkPhase(state, params, thoughtId, hasNewToolResults)
        thoughtUiPainted = thinkResult.paintedThought
    }
    const isLastStep = state.stepCount >= state.maxSteps - 1
    const toolChoice: 'auto' | 'none' | 'web_search' | 'todo_write' = isLastStep
        ? 'none'
        : state.stepCount === 0 && params.forceWebSearch
          ? 'web_search'
          : 'auto'

    const emitPublic = (text: string) => {
        const cleaned = stripLeakedToolMarkup(text)
        if (!cleaned) return
        if (
            params.holdPublicUntilCitations &&
            state.citations.length === 0 &&
            !state.usedTools &&
            state.currentToolCalls.length === 0
        )
            return
        params.onToken?.(cleaned)
    }

    let streamedThought = 0
    let heldPublic = ''
    let streamedPublicLength = 0
    // Soft optional nudges — models stay autonomous (no hard stop / MUST).
    // Soft: last few steps only; require a real budget so tiny maxSteps don't nudge on step 0.
    const nearStepBudget =
        state.maxSteps >= 4 && state.stepCount >= Math.max(1, state.maxSteps - 3)
    const reminder = [
        state.pendingReminder,
        state.publicText.trim() ? PUBLIC_CONTINUE_NUDGE : '',
        nearStepBudget ? LONG_JOB_CONTINUE_NUDGE : '',
    ]
        .filter(Boolean)
        .join('\n')
    const round = await params.complete({
        messages: withHostContext(compactLoopMessages(state.messages), {
            todos: state.todos,
            mode: state.agentMode,
            thought: state.cycleThought,
            reminder,
            memories: memoriesForHostContext(params.host?.scratchpad?.memories, state.scratchpad),
        }),
        toolChoice,
        onToken: (text) => {
            heldPublic += text
            streamedPublicLength += text.length
            emitPublic(text)
        },
        onThinking: (delta) => {
            if (!delta) return
            // Suppress only when think phase already streamed native Thought UI.
            // cycleThought may be content-only (#775 buffer) with empty Thought —
            // still stream decision native reasoning in that case.
            if (thoughtUiPainted) return
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

    if (round.reasoning && streamedThought === 0 && !thoughtUiPainted) {
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
        if (leftover) {
            const remainingUnstreamed = leftover.slice(streamedPublicLength)
            if (remainingUnstreamed) {
                emitPublic(remainingUnstreamed)
            }
            state.publicText += (state.publicText ? '\n\n' : '') + leftover
        }
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
        const remainingUnstreamed = leftover.slice(streamedPublicLength)
        if (remainingUnstreamed) {
            emitPublic(remainingUnstreamed)
        }
        state.publicText += (state.publicText ? '\n\n' : '') + leftover
        closeThought(params, thoughtId)
        emitNode(params, 'root', 'completed', cycle)
        state.phase = 'synthesis'
        return
    }

    if (state.agentMode === 'plan' && !state.stopAfterTools && state.stepCount < state.maxSteps && state.planNudges < 2) {
        closeThought(params, thoughtId)
        emitNode(params, 'root', 'completed', cycle)
        state.planNudges += 1
        state.pendingReminder =
            state.todos.length === 0
                ? 'Plan mode is on. Invent the plan yourself — do not ask the user for next steps. Use todo_write (with short done_when) or one research tool if they help, or write the user-facing piece now.'
                : 'One focused action for the CURRENT step only: one research tool, OR write_scratchpad, OR todo_write (same ids) then STOP, OR finalize_plan when ready. Do not ask the user for next steps. Do not pack several tools to finish the whole plan now.'
        state.phase = 'decision'
        return
    }

    if (
        state.usedTools &&
        state.stepCount < state.maxSteps &&
        state.writeNudges < 1 &&
        !isLastStep &&
        !leftover
    ) {
        closeThought(params, thoughtId)
        emitNode(params, 'root', 'completed', cycle)
        state.writeNudges += 1
        state.pendingReminder = state.publicText.trim()
            ? 'Continue writing seamlessly from where you left off. Integrate the returned tool findings to complete the comprehensive piece.'
            : 'Evaluate if the returned findings fully satisfy what the user requested. If additional investigation or tools are needed, continue autonomously; you may share concise progress context with the user if helpful. When satisfied, deliver the comprehensive, high-quality response in the public bubble. If they asked for a specific length or format, deliver that. Do not outline. Do not summarize.'
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
        ? `Plan is locked. Execute now. Current step: ${current.title}. Call the tools needed (several at once if they are independent), then todo_write with the SAME ids. Do not wait for the user.`
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
                detail: toolActivityTitle(nestedName, 'running', nested.argumentsJson),
            })
            emitActivity(params, {
                kind: 'tool',
                id: `tool-${nested.id}`,
                status: 'running',
                title: toolActivityTitle(nestedName, 'running', nested.argumentsJson),
                toolName: nestedName,
                arguments: nested.argumentsJson.slice(0, 800),
            })
            const nestedExec = await executeToolCall(nested, params.env, params.host, 'ask', params.signal)
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
    'run_code_sandbox',
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
        detail: toolActivityTitle(name, 'running', call.argumentsJson),
        thoughtSignature: call.thoughtSignature,
    })
    emitActivity(params, {
        kind,
        id: activityId,
        status: 'running',
        title: toolActivityTitle(name, 'running', call.argumentsJson),
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
    if (params.signal?.aborted) return
    const name = resolveToolName(call.name)
    const kind = name === 'todo_write' ? 'plan' : 'tool'
    const activityId = name === 'todo_write' ? PLAN_ACTIVITY_ID : `tool-${call.id}`
    if (!preExecuted) emitToolRunning(call, params)

    let executed = preExecuted || (await executeToolCall(call, params.env, params.host, state.agentMode, params.signal))

    if (executed.artifact) {
        const incoming = executed.artifact
        if (incoming.type === 'model3d') {
            const prior = [...state.artifacts]
                .reverse()
                .find(
                    (item) =>
                        item.type === 'model3d' &&
                        normalizedArtifactTitle(item.title) === normalizedArtifactTitle(incoming.title)
                )
            if (prior && isWeakerModel3dRevision(incoming, prior)) {
                // Keep the richer scaffold on screen; tell the model to resend full objects[].
                executed = {
                    ...executed,
                    ok: false,
                    artifact: undefined,
                    result: JSON.stringify({
                        ok: false,
                        error:
                            'model3d enrich dropped geometry — resend the FULL objects[] (complete scene). Materials/camera-only or empty groups cannot replace a scaffold.',
                        id: prior.id,
                        title: prior.title,
                        kept: 'prior',
                    }),
                    summary: '3D enrich lacked geometry — kept prior scene',
                }
            } else {
                state.artifacts.push(incoming)
            }
        } else {
            state.artifacts.push(incoming)
        }
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
    if (state.agentMode === 'plan' && executed.ok && isPlanResearchTool(name)) {
        state.researchClusterCount += 1
        state.usedPlanResearch = true
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
        // Plan research durability: after a cluster (or when awaiting), persist then stop.
        if (
            state.agentMode === 'plan' &&
            (state.researchClusterAwaitingScratchpad || state.researchClusterCount >= PLAN_RESEARCH_CLUSTER_N)
        ) {
            state.stopAfterTools = true
            state.researchClusterCount = 0
            state.researchClusterAwaitingScratchpad = false
        } else if (state.agentMode === 'plan') {
            // Findings saved mid-cluster — reset cluster counter so research can continue carefully.
            state.researchClusterCount = 0
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
                const userPrompt = [...state.messages]
                    .reverse()
                    .find((message) => message.role === 'user' && typeof message.content === 'string')
                const incoming = parsed.tasks as PlanTodo[]
                const seeded =
                    state.todos.length === 0
                        ? seedLongFormPlan(incoming, String(userPrompt?.content || ''))
                        : incoming
                const completedBefore = state.todos.filter((todo) => todo.status === 'completed').length
                state.todos = mergePlan(state.todos as PlanTodo[], seeded)
                const current = state.todos.find((todo) => todo.status === 'in_progress')
                const completedCount = state.todos.filter((todo) => todo.status === 'completed').length
                const advanced = completedCount > completedBefore
                const hasOpen = state.todos.some((todo) => todo.status !== 'completed')
                if (state.agentMode === 'plan') {
                    state.researchClusterCount = 0
                    state.researchClusterAwaitingScratchpad = false
                    if (advanced && hasOpen) {
                        state.stopAfterTools = true
                    }
                }
                const planStopInstruction =
                    state.agentMode === 'plan' && advanced && hasOpen && current
                        ? `Step done. Next is "${current.title}" — STOP this turn now. Do not ask the user for next steps. Do not start the next step until the next request.`
                        : state.agentMode === 'plan' && current
                          ? `Current step only: ${current.title}. Do that work, then todo_write with the SAME ids, then STOP this turn.`
                          : current
                            ? `Do this step now: ${current.title}. Then todo_write with the SAME ids.`
                            : 'All steps completed. Write the full user-requested answer in the public bubble now. If they asked for a long article or word count, write that length. No more tools.'
                executed = {
                    ...executed,
                    result: JSON.stringify({
                        ok: true,
                        locked: true,
                        tasks: state.todos,
                        progress: `${completedCount}/${state.todos.length}`,
                        current: current?.title,
                        instruction: planStopInstruction,
                    }),
                    summary: current
                        ? `Working on: ${current.title} (${completedCount}/${state.todos.length})`
                        : `Plan complete (${completedCount}/${state.todos.length})`,
                }
            }
        } catch { /* no-op */ }
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
        const readiness = finalizePlanReadinessReminder({
            todos: state.todos,
            scratchpad: state.scratchpad,
            usedWebSearch: state.usedWebSearch,
            usedPlanResearch: state.usedPlanResearch,
        })
        if (readiness) {
            // Soft gate — do not interrupt; remind and let the model fix this turn.
            toolContent = JSON.stringify({ ok: false, error: readiness })
            executed = {
                ...executed,
                ok: false,
                result: toolContent,
                summary: readiness,
            }
            state.pendingReminder = state.pendingReminder
                ? `${state.pendingReminder}\n${readiness}`
                : readiness
        } else {
            const parsed = parseJsonObject(executed.result)
            const summary =
                typeof parsed?.summary === 'string' && parsed.summary.trim()
                    ? parsed.summary.trim()
                    : undefined
            const plan = state.todos.map((todo) => ({
                id: todo.id,
                title: todo.title,
                status: todo.status,
                ...(todo.done_when ? { done_when: todo.done_when } : {}),
            }))
            state.interrupt = {
                kind: 'plan_approval',
                status: 'pending',
                title: 'Plan',
                summary: summary || (plan.length ? plan.map((item) => item.title).join(' → ') : 'Ready to run'),
                ...(plan.length ? { plan } : {}),
            }
            if (!state.publicText.trim()) state.publicText = state.interrupt.summary || 'Plan ready.'
            toolContent = JSON.stringify({
                ok: true,
                awaiting: 'plan_approval',
                summary: state.interrupt.summary,
                tasks: plan,
            })
        }
    }
    if (name === 'ask_user' && executed.ok) {
        const parsed = parseJsonObject(executed.result)
        const question = typeof parsed?.question === 'string' ? parsed.question.trim() : ''
        if (question) {
            const choices = Array.isArray(parsed?.choices)
                ? parsed.choices
                      .map((item: unknown) => (typeof item === 'string' ? item.trim() : ''))
                      .filter(Boolean)
                      .slice(0, 6)
                : []
            state.interrupt = {
                kind: 'ask_user',
                status: 'pending',
                title: 'Question',
                question,
                ...(choices.length ? { choices } : {}),
            }
            if (!state.publicText.trim()) state.publicText = question
        }
    }
    const summary = executed.summary || toolResultSummary(name, executed.ok, executed.result)
    if (!executed.ok) {
        const retry = `Last tool (${name}) failed: ${summary}. Fix the arguments and retry, or pick a different tool. Do not dump the error in the bubble.`
        state.pendingReminder = state.pendingReminder ? `${state.pendingReminder}\n${retry}` : retry
    }
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
        if (params.signal?.aborted) break
        if (PARALLEL_READ_TOOLS.has(resolveToolName(calls[index].name))) {
            let end = index + 1
            while (end < calls.length && PARALLEL_READ_TOOLS.has(resolveToolName(calls[end].name))) end += 1
            const batch = calls.slice(index, end)
            for (const call of batch) emitToolRunning(call, params)
            const rows = await Promise.all(
                batch.map(async (call) => ({
                    call,
                    executed: await executeToolCall(call, params.env, params.host, state.agentMode, params.signal),
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
    // Plan research cluster: after N research tools without todo advance, require scratchpad then stop.
    if (
        state.agentMode === 'plan' &&
        !state.interrupt &&
        !state.stopAfterTools &&
        state.researchClusterCount >= PLAN_RESEARCH_CLUSTER_N
    ) {
        if (!state.researchClusterAwaitingScratchpad) {
            state.researchClusterAwaitingScratchpad = true
            const clusterHint =
                `Research cluster (≥${PLAN_RESEARCH_CLUSTER_N} tools) without a todo advance. Call write_scratchpad now with citations/synthesis for this step, then STOP. Do not start more research tools.`
            state.pendingReminder = state.pendingReminder
                ? `${clusterHint}\n${state.pendingReminder}`
                : clusterHint
        } else {
            // Already nudged once; stop even without scratchpad so the turn cannot infinite-research.
            state.stopAfterTools = true
        }
    }
    const current = state.todos.find((todo) => todo.status === 'in_progress')
    if (current && !state.interrupt && !state.stopAfterTools) {
        const step =
            state.agentMode === 'plan'
                ? `Current step: ${current.title}. If this step is done: todo_write with the SAME ids (mark completed, next in_progress) then STOP. Else: one focused tool for this step only — do not pack several tools to finish the whole plan.`
                : `Current step: ${current.title}. Do that work now. You may call several tools. Then todo_write with the SAME ids.`
        state.pendingReminder = state.pendingReminder && state.pendingReminder !== step
            ? `${step}\n${state.pendingReminder}`
            : step
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
    if (state.stopAfterTools || state.stepCount >= state.maxSteps) {
        if (state.stopAfterTools && !state.publicText.trim()) {
            const nxt = state.todos.find((todo) => todo.status === 'in_progress')
            state.publicText = nxt
                ? `Finished the previous plan step. Next: ${nxt.title}.`
                : 'Finished this plan step.'
        }
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
        // 1. Recover answer if model emitted thinking/reasoning
        const recovered = extractFallbackAnswerFromThinking(state.thinkingText)
        if (recovered) {
            state.publicText = recovered
        }
    }

    // 2. If still empty and no interactive interrupt, ensure a clean delivery
    if (!state.publicText.trim() && !state.interrupt) {
        if (state.artifacts.length > 0) {
            // Artifact is the primary output
            state.publicText = ''
        } else if (state.usedTools) {
            state.publicText = 'Requested operations and tool actions completed successfully.'
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
        stopAfterTools: false,
        researchClusterCount: 0,
        researchClusterAwaitingScratchpad: false,
        usedPlanResearch: false,
        execNudges: 0,
        writeNudges: 0,
        stepCount: 0,
        maxSteps,
        provider: params.provider,
        agentMode: parseAgentMode(params.agentMode),
    }

    while (state.phase !== 'complete' && state.phase !== 'failed') {
        if (params.signal?.aborted) {
            state.error = 'client request aborted'
            state.phase = 'failed'
            break
        }
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
