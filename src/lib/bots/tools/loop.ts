/**
 * OpenAI Chat Completions tool loop on Groq (industry wire format).
 * Streams public tokens; if the model emits tool_calls, the host executes
 * allowlisted tools and continues the conversation as role:tool messages.
 */

import type { AiCitation } from '../../ai/contracts'
import type { ArtifactDocument } from '../../artifacts/kinds'
import {
    collectGeminiKeys,
    collectGroqKeys,
    isFamilyKeyCooling,
    isGroqKeyCooling,
    markFamilyKeyCooling,
    markGroqKeyCooling,
    takeGeminiKeyOrder,
    takeGroqKeyOrder,
} from '../ai-gateway'
import { envFrom, getRuntimeEnv, type EnvStore } from '../runtime-env'
import type { ToolCall } from './execute'
import type { HostOsAction, HostSnapshot } from './host'
import { anthropicToolCompletion } from './anthropic'
import { geminiToolCompletion, type GeminiPart } from './gemini'
import { compactToolHistory, type HistoryTurn } from './history'
import { isAuthDetail, isRateLimitDetail, isToolProtocolReject } from '../provider-errors'
import { modeAfterResume, resumeUserMessage, type AgentCheckpoint, type ResumeAction } from '../agent/checkpoint'
import type { HumanTurn } from '../agent/human'
import { modeSystemPrompt, nodeStatusLabel, parseAgentMode, PLAN_TOOL_PROTOCOL, type AgentMode } from '../agent/modes'
import { OPENAI_CHAT_TOOLS, TOOL_PROTOCOL, type OpenAiToolSpec } from './spec'
import {
    ACADEMIC_SEED_TOOLS,
    messagesUsedAcademicSeed,
    questionWantsAcademicFollowUps,
    researchProtocolFor,
    selectTurnTools,
    shouldOmitResearchWrite,
} from './turn-tools'
import { runAgentNodePipeline, type NodeEvent, type RoundFailure } from './pipeline'
import {
    answerIncompleteMessage,
    buildNoToolSynthesisMessages,
    gatheredToolResults,
    hasResearchResults,
    LOOP_ACTIONS_PLACEHOLDER,
    PIPELINE_EMPTY_ANSWER_PLACEHOLDER,
    redactProviderDetail,
    SYNTHESIS_MAX_TOKENS,
    toolResultChars,
    type GatheredToolResult,
    type ToolLoopFallback,
} from './answer-recovery'
import { stripLeakedToolMarkup, stripLeakedToolMarkupForStream } from './leak'
import type { AgentActivity } from '../agent/activity'
import { fetchWithTransientRetry } from './provider-retry'


const GEMINI_TOOL_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-3.6-flash'] as const
const GROQ_TOOL_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'] as const

/** PostHog Max always enables model thinking. Ask AI tool loop must do the same. */
export function groqNativeThinkingBody(model: string): Record<string, unknown> {
    if (model.includes('gpt-oss')) {
        return { reasoning_effort: 'low', include_reasoning: true }
    }
    return { reasoning_format: 'parsed' }
}

export function extractReasoningDelta(delta: unknown): string {
    if (!delta || typeof delta !== 'object') return ''
    const row = delta as Record<string, unknown>
    if (typeof row.reasoning_content === 'string' && row.reasoning_content) return row.reasoning_content
    if (typeof row.reasoning === 'string' && row.reasoning) return row.reasoning
    const nested = row.reasoning
    if (nested && typeof nested === 'object' && typeof (nested as { content?: unknown }).content === 'string') {
        return (nested as { content: string }).content
    }
    return ''
}

/** Ask AI tool loop only. Forum / gateway keep Qwen. */
export function resolveGroqToolModels(env?: EnvStore): string[] {
    const configured = envFrom(env ?? getRuntimeEnv(), 'GROQ_TOOL_MODEL').trim()
    if (configured) return [configured, ...GROQ_TOOL_MODELS.filter((model) => model !== configured)]
    return [...GROQ_TOOL_MODELS]
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

type ChatMessage = {
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

const MAX_STEPS = 16
const REQUEST_TIMEOUT_MS = 45_000
const GEMINI_TIMEOUT_MS = 45_000
const MAX_TOKENS = 8_192

function linkAbortSignal(controller: AbortController, external?: AbortSignal): () => void {
    if (!external) return () => { /* no-op */ }
    if (external.aborted) {
        controller.abort()
        return () => { /* no-op */ }
    }
    const onAbort = () => controller.abort()
    external.addEventListener('abort', onAbort, { once: true })
    return () => external.removeEventListener('abort', onAbort)
}

function isClientAbortDetail(detail: string): boolean {
    const d = detail.toLowerCase()
    return d.includes('client request aborted') || d.includes('aborterror') || d === 'aborted'
}


export const TOOL_FAMILY_ORDER = ['groq', 'gemini', 'nvidia', 'openai', 'anthropic'] as const

export type ToolLoopResult = {
    ok: boolean
    usedTools: boolean
    usedWebSearch: boolean
    text: string
    artifacts: ArtifactDocument[]
    citations: AiCitation[]
    actions: HostOsAction[]
    provider: string
    error?: string
    interrupt?: HumanTurn
    checkpoint?: AgentCheckpoint
    /**
     * Set when `text` is host fallback copy (honest "could not finish" or the
     * generic action confirmation), not a model answer. The orchestrator must
     * skip the quality gate / persona rewrite for it.
     */
    fallback?: ToolLoopFallback
    /** The answer was written by the tools-off retry after a failed/empty answer round. */
    recoveredAnswer?: boolean
}

export type ToolCallDelta = {
    index?: number
    id?: string
    function?: { name?: string; arguments?: string }
}

type ToolCallBucket = { id: string; name: string; arguments: string }

/** Accumulate OpenAI streaming tool_call deltas by index (the wire protocol). */
export function applyToolCallDelta(buckets: Map<number, ToolCallBucket>, call: ToolCallDelta): void {
    const index = Number.isFinite(Number(call.index)) ? Number(call.index) : 0
    const slot = buckets.get(index) || { id: '', name: '', arguments: '' }
    if (call.id) slot.id = call.id
    if (call.function?.name) slot.name += call.function.name
    if (call.function?.arguments) slot.arguments += call.function.arguments
    buckets.set(index, slot)
}

/** Tool rounds are not the public answer. Only a completion with zero tool_calls is. */
export function publicTextFromRound(content: string, toolCallCount: number): string {
    if (toolCallCount > 0) return ''
    return content || ''
}

export function assembleToolCalls(buckets: Map<number, ToolCallBucket>): ToolCall[] {
    return Array.from(buckets.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([, value]) => ({
            id: value.id || `call-${Math.random().toString(36).slice(2, 9)}`,
            name: value.name,
            argumentsJson: value.arguments || '{}',
        }))
        .filter((call) => Boolean(call.name))
}

function openaiToolChoice(choice: 'auto' | 'none' | 'web_search' | 'todo_write') {
    if (choice === 'web_search') {
        return { type: 'function' as const, function: { name: 'web_search' } }
    }
    if (choice === 'todo_write') {
        return { type: 'function' as const, function: { name: 'todo_write' } }
    }
    return choice
}

async function openaiCompletion(params: {
    apiKey: string
    baseUrl?: string
    model: string
    messages: ChatMessage[]
    toolChoice: 'auto' | 'none' | 'web_search' | 'todo_write'
    onToken?: (text: string) => void
    onThinking?: (text: string) => void
    tools?: OpenAiToolSpec[]
    omitTools?: boolean
    /** Answer-budget call with no tool schemas. Does not switch Gemini into the short think config. */
    dropToolSchemas?: boolean
    maxTokens?: number
    timeoutMs?: number
    signal?: AbortSignal
}): Promise<
    | { ok: true; content: string; toolCalls: ToolCall[]; reasoning?: string }
    | { ok: false; detail: string; status?: number }
> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), params.timeoutMs || REQUEST_TIMEOUT_MS)
    const unlink = linkAbortSignal(controller, params.signal)
    try {
        if (params.signal?.aborted) return { ok: false, detail: 'client request aborted' }
        const url = params.baseUrl || 'https://api.openai.com/v1/chat/completions'
        const res = await fetchWithTransientRetry(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${params.apiKey}`,
                'Content-Type': 'application/json',
            },
            signal: controller.signal,
            body: JSON.stringify({
                model: params.model || 'gpt-4o',
                messages: toGroqMessages(params.messages),
                temperature: 0.6,
                max_tokens: params.maxTokens || MAX_TOKENS,
                stream: true,
                ...(params.omitTools || params.dropToolSchemas
                    ? {}
                    : {
                          tools: params.tools || OPENAI_CHAT_TOOLS,
                          tool_choice: openaiToolChoice(params.toolChoice),
                      }),
            }),
        }, { signal: controller.signal })
        if (!res.ok) {
            const raw = await res.text()
            return { ok: false, detail: `${res.status} ${raw.slice(0, 220)}`, status: res.status }
        }
        if (!res.body) return { ok: false, detail: 'No response body' }

        const reader = res.body.getReader()
        const decoder = new TextDecoder('utf-8')
        let buffer = ''
        let content = ''
        let reasoning = ''
        const buckets = new Map<number, { id: string; name: string; arguments: string }>()

        try {
            const iterating = true;
    while (iterating) {
                const { done, value } = await reader.read()
                if (done) break
                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() || ''
                for (let line of lines) {
                    line = line.trim()
                    if (!line || line === 'data: [DONE]' || !line.startsWith('data: ')) continue
                    try {
                        const data = JSON.parse(line.slice(6)) as {
                            choices?: Array<{
                                delta?: {
                                    content?: string | null
                                    reasoning_content?: string | null
                                    reasoning?: string | null
                                    tool_calls?: Array<{
                                        index?: number
                                        id?: string
                                        function?: { name?: string; arguments?: string }
                                    }>
                                }
                            }>
                        }
                        const delta = data.choices?.[0]?.delta
                        for (const call of delta?.tool_calls || []) {
                            applyToolCallDelta(buckets, call)
                        }
                        const reasoningPiece = extractReasoningDelta(delta)
                        if (reasoningPiece) {
                            reasoning += reasoningPiece
                            params.onThinking?.(reasoningPiece)
                        }
                        const piece = delta?.content
                        if (typeof piece === 'string' && piece) {
                            content += piece
                            if (buckets.size === 0) {
                                params.onToken?.(piece)
                            }
                        }
                    } catch {
                        /* ignore */
                    }
                }
            }
        } finally {
            reader.releaseLock()
        }

        const toolCalls = assembleToolCalls(buckets)
        return { ok: true, content, toolCalls, reasoning: reasoning.trim() || undefined }
    } catch (error) {
        if (params.signal?.aborted) return { ok: false, detail: 'client request aborted' }
        return { ok: false, detail: error instanceof Error ? error.message : 'fetch error' }
    } finally {
        clearTimeout(timer)
        unlink()
    }
}

async function groqCompletion(params: {
    apiKey: string
    model: string
    messages: ChatMessage[]
    toolChoice: 'auto' | 'none' | 'web_search' | 'todo_write'
    onToken?: (text: string) => void
    onThinking?: (text: string) => void
    tools?: OpenAiToolSpec[]
    omitTools?: boolean
    /** Answer-budget call with no tool schemas. Does not switch Gemini into the short think config. */
    dropToolSchemas?: boolean
    maxTokens?: number
    timeoutMs?: number
    signal?: AbortSignal
}): Promise<
    | { ok: true; content: string; toolCalls: ToolCall[]; reasoning?: string }
    | { ok: false; detail: string; status?: number }
> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), params.timeoutMs || REQUEST_TIMEOUT_MS)
    const unlink = linkAbortSignal(controller, params.signal)
    try {
        if (params.signal?.aborted) return { ok: false, detail: 'client request aborted' }
        const res = await fetchWithTransientRetry('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${params.apiKey}`,
                'Content-Type': 'application/json',
            },
            signal: controller.signal,
            body: JSON.stringify({
                model: params.model,
                messages: toGroqMessages(params.messages),
                temperature: 0.6,
                max_tokens: params.maxTokens || MAX_TOKENS,
                stream: true,
                ...groqNativeThinkingBody(params.model),
                ...(params.omitTools || params.dropToolSchemas
                    ? {}
                    : {
                          tools: params.tools || OPENAI_CHAT_TOOLS,
                          tool_choice: openaiToolChoice(params.toolChoice),
                      }),
            }),
        }, { signal: controller.signal })
        if (!res.ok) {
            const raw = await res.text()
            return { ok: false, detail: `${res.status} ${raw.slice(0, 220)}`, status: res.status }
        }
        if (!res.body) return { ok: false, detail: 'No response body' }

        const reader = res.body.getReader()
        const decoder = new TextDecoder('utf-8')
        let buffer = ''
        let content = ''
        let reasoning = ''
        const buckets = new Map<number, { id: string; name: string; arguments: string }>()

        try {
            const iterating = true;
    while (iterating) {
                const { done, value } = await reader.read()
                if (done) break
                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() || ''
                for (let line of lines) {
                    line = line.trim()
                    if (!line || line === 'data: [DONE]' || !line.startsWith('data: ')) continue
                    try {
                        const data = JSON.parse(line.slice(6)) as {
                            choices?: Array<{
                                delta?: {
                                    content?: string | null
                                    reasoning_content?: string | null
                                    reasoning?: string | null
                                    tool_calls?: Array<{
                                        index?: number
                                        id?: string
                                        function?: { name?: string; arguments?: string }
                                    }>
                                }
                            }>
                        }
                        const delta = data.choices?.[0]?.delta
                        for (const call of delta?.tool_calls || []) {
                            applyToolCallDelta(buckets, call)
                        }
                        const piece = delta?.content
                        if (typeof piece === 'string' && piece) {
                            content += piece
                            if (buckets.size === 0) {
                                params.onToken?.(piece)
                            }
                        }
                        const reasonPiece = extractReasoningDelta(delta)
                        if (reasonPiece) {
                            reasoning += reasonPiece
                            params.onThinking?.(reasonPiece)
                        }
                    } catch {
                        /* ignore malformed SSE lines */
                    }
                }
            }
        } finally {
            reader.releaseLock()
        }

        const toolCalls = assembleToolCalls(buckets)
        if (toolCalls.length === 0 && content && buckets.size > 0) params.onToken?.(content)
        return { ok: true, content, toolCalls, reasoning }
    } catch (error) {
        if (params.signal?.aborted) return { ok: false, detail: 'client request aborted' }
        return { ok: false, detail: error instanceof Error ? error.message : 'fetch error' }
    } finally {
        clearTimeout(timer)
        unlink()
    }
}

type CompletionRound =
    | { ok: true; content: string; toolCalls: ToolCall[]; modelParts?: GeminiPart[]; reasoning?: string }
    | { ok: false; detail: string; status?: number }


function toGroqMessages(messages: ChatMessage[]): ChatMessage[] {
    return messages.map((message) => {
        if (!message.tool_calls && !message.geminiModelParts) return message
        return {
            role: message.role,
            content: message.content,
            tool_call_id: message.tool_call_id,
            tool_calls: message.tool_calls?.map((call) => ({
                id: call.id,
                type: 'function' as const,
                function: call.function,
            })),
        }
    })
}

type CompleteFn = (input: {
    messages: ChatMessage[]
    toolChoice: 'auto' | 'none' | 'web_search' | 'todo_write'
    onToken?: (text: string) => void
    onThinking?: (text: string) => void
    omitTools?: boolean
    /** Answer-budget call with no tool schemas. Does not switch Gemini into the short think config. */
    dropToolSchemas?: boolean
    maxTokens?: number
    timeoutMs?: number
}) => Promise<CompletionRound>

type StepPartial = {
    usedTools: boolean
    usedWebSearch: boolean
    artifacts: ArtifactDocument[]
    citations: AiCitation[]
    actions: HostOsAction[]
    text: string
    messages: ChatMessage[]
}

async function runToolSteps(params: {
    complete: CompleteFn
    baseMessages: ChatMessage[]
    onToken?: (text: string) => void
    onThinking?: (text: string) => void
    onTool?: (event: ToolEvent) => void
    onNode?: (event: NodeEvent) => void
    onMode?: (mode: AgentMode) => void
    onHuman?: (turn: HumanTurn) => void
    onActivity?: (activity: AgentActivity) => void
    provider: string
    env?: EnvStore
    host?: HostSnapshot
    /** Earlier-turn citations from the chat request (see lib/ai/prior-citations). */
    priorCitations?: AiCitation[]
    forceWebSearch?: boolean
    holdPublicUntilCitations?: boolean
    agentMode?: AgentMode
    checkpoint?: AgentCheckpoint
    signal?: AbortSignal
}): Promise<
    | { kind: 'done'; result: ToolLoopResult; answerMissing: boolean; messages: ChatMessage[] }
    | { kind: 'tools-rejected'; error: string }
    | { kind: 'auth'; error: string }
    | ({ kind: 'failed'; error: string; roundFailure?: RoundFailure } & StepPartial)
> {
    const pipelineRes = await runAgentNodePipeline({
        complete: params.complete,
        baseMessages: params.baseMessages,
        onToken: params.onToken,
        onThinking: params.onThinking,
        onTool: params.onTool,
        onNode: params.onNode,
        onMode: params.onMode,
        onHuman: params.onHuman,
        onActivity: params.onActivity,
        checkpoint: params.checkpoint,
        provider: params.provider,
        env: params.env,
        host: params.host,
        priorCitations: params.priorCitations,
        forceWebSearch: params.forceWebSearch,
        holdPublicUntilCitations: params.holdPublicUntilCitations,
        maxSteps: MAX_STEPS,
        agentMode: params.agentMode,
        signal: params.signal,
    })

    if (pipelineRes.ok) {
        return {
            kind: 'done',
            answerMissing: Boolean(pipelineRes.answerMissing),
            messages: pipelineRes.messages || [],
            result: {
                ok: true,
                usedTools: pipelineRes.usedTools,
                usedWebSearch: pipelineRes.usedWebSearch,
                text: pipelineRes.text,
                artifacts: pipelineRes.artifacts,
                citations: pipelineRes.citations,
                actions: pipelineRes.actions,
                provider: pipelineRes.provider,
                interrupt: pipelineRes.interrupt,
                checkpoint: pipelineRes.checkpoint,
            },
        }
    }

    if (pipelineRes.error) {
        if (isToolProtocolReject(pipelineRes.error)) {
            return { kind: 'tools-rejected', error: pipelineRes.error }
        }
        if (isRateLimitDetail(pipelineRes.error) || isAuthDetail(pipelineRes.error)) {
            return { kind: 'auth', error: pipelineRes.error }
        }
    }

    return {
        kind: 'failed',
        error: pipelineRes.error || 'tool loop failed',
        roundFailure: pipelineRes.roundFailure,
        usedTools: pipelineRes.usedTools,
        usedWebSearch: pipelineRes.usedWebSearch,
        artifacts: pipelineRes.artifacts,
        citations: pipelineRes.citations,
        actions: pipelineRes.actions,
        text: pipelineRes.text,
        messages: pipelineRes.messages || [],
    }
}

function fallbackSuccessFromPartial(step: {
    usedTools: boolean
    usedWebSearch: boolean
    text: string
    artifacts: ArtifactDocument[]
    citations: AiCitation[]
    actions: HostOsAction[]
}, provider: string): ToolLoopResult {
    const trimmed = step.text.trim()
    const text = trimmed || (step.artifacts.length > 0 ? '' : LOOP_ACTIONS_PLACEHOLDER)
    return {
        ok: true,
        usedTools: step.usedTools,
        usedWebSearch: step.usedWebSearch,
        text,
        artifacts: step.artifacts,
        citations: step.citations,
        actions: step.actions,
        provider,
        // Generic placeholder is host copy, not a model answer: never quality-gate it into prose.
        ...(trimmed || step.artifacts.length > 0 ? {} : { fallback: 'actions_placeholder' as const }),
    }
}

function abortedResult(partial?: StepPartial): ToolLoopResult {
    return {
        ok: false,
        usedTools: partial?.usedTools || false,
        usedWebSearch: partial?.usedWebSearch || false,
        text: partial?.text || '',
        artifacts: partial?.artifacts || [],
        citations: partial?.citations || [],
        actions: partial?.actions || [],
        provider: 'none',
        error: 'client request aborted',
    }
}

/** One entry of the existing fallback chain (family → key → model), in order. */
type ToolCandidate = {
    provider: string
    model: string
    /** Groq/Gemini: an auth/rate-limit miss skips the rest of this key's models. */
    keyGroup?: string
    onAuthMiss?: () => void
    complete: CompleteFn
}

function logAnswerRoundFailure(input: {
    provider: string
    model: string
    stage: 'failed' | 'empty'
    roundFailure?: RoundFailure
    error?: string
    results: GatheredToolResult[]
    citations: number
}): void {
    console.warn(
        '[tools] answer round failed',
        JSON.stringify({
            provider: input.provider,
            model: input.model,
            stage: input.stage,
            status: input.roundFailure?.status,
            detail: redactProviderDetail(input.roundFailure?.detail || input.error || ''),
            afterTools: input.roundFailure?.afterTools ?? true,
            toolResults: input.results.length,
            toolResultChars: toolResultChars(input.results),
            tools: Array.from(new Set(input.results.map((item) => item.name))).slice(0, 8),
            citations: input.citations,
        })
    )
}

/**
 * Retry the answer once, tools off, on `candidate` using the tool results the
 * failed pipeline already gathered. Returns the written answer or null.
 */
async function synthesizeAnswerWithoutTools(input: {
    candidate: ToolCandidate
    messages: ChatMessage[]
    turnStart: number
    results: GatheredToolResult[]
    onToken?: (text: string) => void
    onNode?: (event: NodeEvent) => void
    signal?: AbortSignal
}): Promise<string | null> {
    if (input.signal?.aborted) return null
    const messages = buildNoToolSynthesisMessages({
        messages: input.messages,
        turnStart: input.turnStart,
        results: input.results,
    })
    input.onNode?.({ name: 'synthesis', status: 'started', detail: nodeStatusLabel('synthesis', 'started') })
    let streamed = ''
    const round = await input.candidate.complete({
        messages,
        toolChoice: 'none',
        omitTools: true,
        maxTokens: SYNTHESIS_MAX_TOKENS,
        onToken: (text) => {
            const cleaned = stripLeakedToolMarkupForStream(text)
            if (!cleaned) return
            streamed += cleaned
            input.onToken?.(cleaned)
        },
    })
    input.onNode?.({ name: 'synthesis', status: 'completed', detail: nodeStatusLabel('synthesis', 'completed') })
    // A retry that dies mid-stream keeps what the user already saw rather than
    // stacking the "could not finish" copy under a half-written answer.
    const content = (round.ok ? stripLeakedToolMarkup(round.content || streamed) : streamed).trim()
    console.info(
        '[tools] answer synthesis retry',
        JSON.stringify({
            provider: input.candidate.provider,
            model: input.candidate.model,
            ok: round.ok && Boolean(content),
            ...(round.ok ? {} : { partialChars: content.length }),
            status: round.ok ? undefined : round.status,
            detail: round.ok ? (content ? undefined : 'empty answer') : redactProviderDetail(round.detail),
            chars: content.length,
        })
    )
    if (!content) return null
    // Tokens already reached the client through onToken; if the adapter buffered
    // (no onToken calls), deliver the answer now so the bubble is not blank.
    if (!streamed.trim()) input.onToken?.(content)
    return content
}

export async function runToolLoop(params: {
    systemPrompt: string
    userPrompt: string
    history?: HistoryTurn[]
    env?: EnvStore
    onToken?: (text: string) => void
    onThinking?: (text: string) => void
    onTool?: (event: ToolEvent) => void
    onNode?: (event: NodeEvent) => void
    onMode?: (mode: AgentMode) => void
    onHuman?: (turn: HumanTurn) => void
    onActivity?: (activity: AgentActivity) => void
    forceWebSearch?: boolean
    holdPublicUntilCitations?: boolean
    host?: HostSnapshot
    /** Earlier-turn citations from the chat request (see lib/ai/prior-citations). */
    priorCitations?: AiCitation[]
    agentMode?: AgentMode
    checkpoint?: AgentCheckpoint
    resumeAction?: ResumeAction
    resumePayload?: string
    /** Raw user question — picks the language of host fallback copy (defaults to userPrompt). */
    languageSample?: string
    /** Client disconnect / Stop — abort in-flight provider fetches. */
    signal?: AbortSignal
}): Promise<ToolLoopResult> {
    if (params.signal?.aborted) return abortedResult()
    const env = params.env ?? getRuntimeEnv()
    const groqKeys = takeGroqKeyOrder(collectGroqKeys(env)).filter((key) => !isGroqKeyCooling(key))
    const groqModels = resolveGroqToolModels(env)
    const geminiKeys = takeGeminiKeyOrder(collectGeminiKeys(env)).filter((key) => !isFamilyKeyCooling('gemini', key))
    const configuredGemini = envFrom(env, 'GEMINI_MODEL', 'GEMINI_PRIMARY_MODEL')
    const geminiModels = configuredGemini
        ? [configuredGemini, ...GEMINI_TOOL_MODELS.filter((model) => model !== configuredGemini)]
        : [...GEMINI_TOOL_MODELS]

    const resumed = params.checkpoint && params.resumeAction
    let agentMode = resumed
        ? modeAfterResume(params.resumeAction!, parseAgentMode(params.checkpoint!.agentMode))
        : parseAgentMode(params.agentMode)
    const question = (params.languageSample || params.userPrompt || '').slice(0, 8_000)
    const researchProtocol = agentMode === 'ask' ? researchProtocolFor(question) : null
    const modePrompt = modeSystemPrompt(agentMode)
    const protocol = agentMode === 'plan' ? PLAN_TOOL_PROTOCOL : researchProtocol || TOOL_PROTOCOL
    const systemPrompt = [params.systemPrompt, modePrompt, protocol].filter(Boolean).join('\n\n')
    const toolGate = {
        academicFollowUps:
            questionWantsAcademicFollowUps(question) || messagesUsedAcademicSeed(params.checkpoint?.messages),
    }
    const toolsForThisRound = (messages: ChatMessage[]) =>
        selectTurnTools(OPENAI_CHAT_TOOLS, {
            mode: agentMode,
            question,
            academicFollowUps: toolGate.academicFollowUps,
            messages,
        })
    const roundTools = (args: { messages: ChatMessage[]; omitTools?: boolean; toolChoice: 'auto' | 'none' | 'web_search' | 'todo_write' }) => {
        const dropToolSchemas =
            Boolean(args.omitTools) ||
            args.toolChoice === 'none' ||
            shouldOmitResearchWrite({ mode: agentMode, question, messages: args.messages })
        return {
            dropToolSchemas,
            tools: dropToolSchemas ? undefined : toolsForThisRound(args.messages),
        }
    }
    const onTool = (event: ToolEvent) => {
        if (event.status === 'done' && ACADEMIC_SEED_TOOLS.has(event.name)) toolGate.academicFollowUps = true
        params.onTool?.(event)
    }
    const onMode = (mode: AgentMode) => {
        agentMode = mode
        params.onMode?.(mode)
    }
    if (resumed) onMode(agentMode)
    const baseMessages: ChatMessage[] = resumed
        ? [
              { role: 'system', content: systemPrompt },
              ...params.checkpoint!.messages.filter((message) => message.role !== 'system'),
              { role: 'user', content: resumeUserMessage(params.resumeAction!, params.resumePayload) },
          ]
        : [
              { role: 'system', content: systemPrompt },
              ...compactToolHistory(params.history),
              { role: 'user', content: params.userPrompt.slice(0, 8_000) },
          ]

    let lastError = ''

    const byokOpenai = envFrom(env, 'OPENAI_API_KEY', 'OPENAI_KEY').trim()
    const openaiModel = envFrom(env, 'OPENAI_MODEL', 'OPENAI_TOOL_MODEL') || 'gpt-4o'
    const nvidiaKey = envFrom(env, 'NVIDIA_API_KEY', 'NVIDIA_KEY', 'DEEPSEEK_API_KEY', 'DEEPSEEK_KEY').trim()
    const configuredNvidia = envFrom(env, 'NVIDIA_MODEL', 'DEEPSEEK_MODEL')
    const nvidiaModels = configuredNvidia
        ? [configuredNvidia]
        : ['deepseek-ai/deepseek-v4-pro-0813', 'deepseek-ai/deepseek-v4-flash-0731']

    let toolFamilyCursor = 0
    function nextToolFamilyOrder(): Array<(typeof TOOL_FAMILY_ORDER)[number]> {
        const order = [...TOOL_FAMILY_ORDER]
        const offset = toolFamilyCursor % order.length
        toolFamilyCursor += 1
        return [...order.slice(offset), ...order.slice(0, offset)]
    }

    const anthropicKey = envFrom(env, 'ANTHROPIC_API_KEY', 'ANTHROPIC_KEY').trim()
    const anthropicModel = envFrom(env, 'ANTHROPIC_MODEL', 'ANTHROPIC_TOOL_MODEL') || 'claude-3-7-sonnet-20250219'

    // Same order as before: family rotation → keys → models. `agentMode` is read
    // at call time (switch_mode can change it mid-turn).
    const candidates: ToolCandidate[] = []
    for (const family of nextToolFamilyOrder()) {
        if (family === 'anthropic' && anthropicKey) {
            candidates.push({
                provider: 'anthropic',
                model: anthropicModel,
                complete: ({ messages, toolChoice, onToken, onThinking, omitTools, maxTokens, timeoutMs }) =>
                    anthropicToolCompletion({
                        apiKey: anthropicKey,
                        model: anthropicModel,
                        systemPrompt,
                        messages,
                        toolChoice,
                        onToken,
                        onThinking,
                        omitTools,
                        maxTokens,
                        timeoutMs,
                        ...roundTools({ messages, omitTools, toolChoice }),
                        signal: params.signal,
                    }),
            })
        }
        if (family === 'openai' && byokOpenai) {
            candidates.push({
                provider: 'openai',
                model: openaiModel,
                complete: ({ messages, toolChoice, onToken, onThinking, omitTools, maxTokens, timeoutMs }) =>
                    openaiCompletion({
                        apiKey: byokOpenai,
                        model: openaiModel,
                        messages,
                        toolChoice,
                        onToken,
                        onThinking,
                        omitTools,
                        maxTokens,
                        timeoutMs,
                        ...roundTools({ messages, omitTools, toolChoice }),
                        signal: params.signal,
                    }),
            })
        }
        if (family === 'nvidia' && nvidiaKey) {
            for (const nvidiaModel of nvidiaModels) {
                candidates.push({
                    provider: 'nvidia:deepseek',
                    model: nvidiaModel,
                    complete: ({ messages, toolChoice, onToken, onThinking, omitTools, maxTokens, timeoutMs }) =>
                        openaiCompletion({
                            apiKey: nvidiaKey,
                            baseUrl: 'https://integrate.api.nvidia.com/v1/chat/completions',
                            model: nvidiaModel,
                            messages,
                            toolChoice,
                            onToken,
                            onThinking,
                            omitTools,
                            maxTokens,
                            timeoutMs,
                            ...roundTools({ messages, omitTools, toolChoice }),
                            signal: params.signal,
                        }),
                })
            }
        }
        if (family === 'groq') {
            groqKeys.forEach((apiKey, keyIndex) => {
                for (const groqModel of groqModels) {
                    candidates.push({
                        provider: 'groq',
                        model: groqModel,
                        keyGroup: `groq:${keyIndex}`,
                        onAuthMiss: () => markGroqKeyCooling(apiKey),
                        complete: ({ messages, toolChoice, onToken, onThinking, omitTools, maxTokens, timeoutMs }) =>
                            groqCompletion({
                                apiKey,
                                model: groqModel,
                                messages,
                                toolChoice,
                                onToken,
                                onThinking,
                                omitTools,
                                maxTokens,
                                timeoutMs,
                                ...roundTools({ messages, omitTools, toolChoice }),
                                signal: params.signal,
                            }),
                    })
                }
            })
        }
        if (family === 'gemini') {
            geminiKeys.forEach((apiKey, keyIndex) => {
                for (const model of geminiModels) {
                    candidates.push({
                        provider: 'gemini',
                        model,
                        keyGroup: `gemini:${keyIndex}`,
                        onAuthMiss: () => markFamilyKeyCooling('gemini', apiKey),
                        complete: ({ messages, toolChoice, onToken, onThinking, omitTools, maxTokens, timeoutMs }) =>
                            geminiToolCompletion({
                                apiKey,
                                model,
                                systemPrompt,
                                messages,
                                toolChoice,
                                onToken,
                                onThinking,
                                omitTools,
                                maxTokens,
                                timeoutMs: timeoutMs || GEMINI_TIMEOUT_MS,
                                ...roundTools({ messages, omitTools, toolChoice }),
                                signal: params.signal,
                            }),
                    })
                }
            })
        }
    }

    const skippedKeyGroups = new Set<string>()
    const languageSample = params.languageSample || params.userPrompt
    const turnStart = baseMessages.length

    /** Next usable candidate after `index` (fallback chain order); the same one when it is the last. */
    function nextCandidateAfter(index: number): ToolCandidate {
        for (let next = index + 1; next < candidates.length; next += 1) {
            const group = candidates[next].keyGroup
            if (group && skippedKeyGroups.has(group)) continue
            return candidates[next]
        }
        return candidates[index]
    }

    /**
     * Post-tool answer round failed or came back empty: one tools-off retry on
     * the next candidate, then honest copy. Tool results / citations are kept.
     */
    async function recoverAnswer(input: {
        index: number
        stage: 'failed' | 'empty'
        partial: StepPartial
        /** Public text from before the failed answer round (interim notes), kept in front. */
        leadText: string
        roundFailure?: RoundFailure
        error?: string
    }): Promise<ToolLoopResult> {
        const failed = candidates[input.index]
        const results = gatheredToolResults(input.partial.messages, turnStart)
        logAnswerRoundFailure({
            provider: failed.provider,
            model: failed.model,
            stage: input.stage,
            roundFailure: input.roundFailure,
            error: input.error,
            results,
            citations: input.partial.citations.length,
        })
        const retry = nextCandidateAfter(input.index)
        const written = await synthesizeAnswerWithoutTools({
            candidate: retry,
            messages: input.partial.messages,
            turnStart,
            results,
            onToken: params.onToken,
            onNode: params.onNode,
            signal: params.signal,
        })
        const base = {
            usedTools: input.partial.usedTools,
            usedWebSearch: input.partial.usedWebSearch,
            artifacts: input.partial.artifacts,
            citations: input.partial.citations,
            actions: input.partial.actions,
        }
        if (params.signal?.aborted) return abortedResult(input.partial)
        const lead = input.leadText.trim()
        if (written) {
            return {
                ok: true,
                ...base,
                text: lead ? `${lead}\n\n${written}` : written,
                provider: retry.provider,
                recoveredAnswer: true,
            }
        }
        const research = hasResearchResults(results, input.partial.citations.length)
        if (!research) {
            // Action-only turn: keep the pre-existing confirmation, never persona-rewrite it.
            return {
                ok: true,
                ...base,
                text: lead || (input.stage === 'empty' ? PIPELINE_EMPTY_ANSWER_PLACEHOLDER : LOOP_ACTIONS_PLACEHOLDER),
                provider: failed.provider,
                ...(lead ? {} : { fallback: 'actions_placeholder' as const }),
                error: input.roundFailure?.detail || input.error,
            }
        }
        const honest = answerIncompleteMessage(languageSample, input.partial.citations.length > 0)
        params.onToken?.(lead ? `\n\n${honest}` : honest)
        return {
            ok: true,
            ...base,
            text: lead ? `${lead}\n\n${honest}` : honest,
            provider: failed.provider,
            fallback: 'answer_incomplete',
            error: input.roundFailure?.detail || input.error || 'answer round empty',
        }
    }

    for (let index = 0; index < candidates.length; index += 1) {
        if (params.signal?.aborted) return abortedResult()
        const candidate = candidates[index]
        if (candidate.keyGroup && skippedKeyGroups.has(candidate.keyGroup)) continue
        const step = await runToolSteps({
            provider: candidate.provider,
            env,
            host: params.host,
            priorCitations: params.priorCitations,
            forceWebSearch: params.forceWebSearch,
            holdPublicUntilCitations: params.holdPublicUntilCitations,
            baseMessages,
            onToken: params.onToken,
            onThinking: params.onThinking,
            onTool,
            onNode: params.onNode,
            onMode,
            onHuman: params.onHuman,
            onActivity: params.onActivity,
            checkpoint: params.checkpoint,
            agentMode,
            signal: params.signal,
            complete: candidate.complete,
        })
        if (step.kind === 'done') {
            const result = step.result
            // Empty answer round after research tools: the pipeline filled in its
            // generic placeholder. Retry the answer instead of shipping that.
            if (step.answerMissing && result.artifacts.length === 0 && !result.interrupt) {
                const results = gatheredToolResults(step.messages, turnStart)
                if (hasResearchResults(results, result.citations.length)) {
                    return recoverAnswer({
                        index,
                        stage: 'empty',
                        partial: { ...result, messages: step.messages },
                        leadText: '',
                        error: 'answer round empty',
                    })
                }
                return { ...result, fallback: 'actions_placeholder' }
            }
            return result
        }
        lastError = step.error
        if (isClientAbortDetail(step.error)) {
            return abortedResult(step.kind === 'failed' ? step : undefined)
        }
        if (step.kind !== 'failed' || !(step.usedTools || step.artifacts.length > 0 || step.citations.length > 0)) {
            // Provider miss before any product: the chain moves on. Log why (no secrets, no content).
            console.warn(
                '[tools] candidate failed',
                JSON.stringify({
                    provider: candidate.provider,
                    model: candidate.model,
                    kind: step.kind,
                    status: step.kind === 'failed' ? step.roundFailure?.status : undefined,
                    detail: redactProviderDetail(step.error, 200),
                })
            )
        }
        if (step.kind === 'tools-rejected') continue
        if (step.kind === 'auth') {
            candidate.onAuthMiss?.()
            if (candidate.keyGroup) skippedKeyGroups.add(candidate.keyGroup)
            continue
        }
        if (step.usedTools || step.artifacts.length > 0 || step.citations.length > 0) {
            const failure = step.roundFailure
            const canRecover =
                step.artifacts.length === 0 &&
                step.messages.length > turnStart &&
                !(failure && failure.streamedPublic)
            if (canRecover) {
                return recoverAnswer({
                    index,
                    stage: 'failed',
                    partial: step,
                    leadText: step.text,
                    roundFailure: failure,
                    error: step.error,
                })
            }
            console.warn(
                '[tools] answer round failed',
                JSON.stringify({
                    provider: candidate.provider,
                    model: candidate.model,
                    stage: 'failed',
                    status: failure?.status,
                    detail: redactProviderDetail(failure?.detail || step.error),
                    recovery: 'skipped',
                    reason: step.artifacts.length > 0 ? 'artifacts' : failure?.streamedPublic ? 'partial_streamed' : 'no_tool_results',
                })
            )
            return fallbackSuccessFromPartial(step, candidate.provider)
        }
    }

    return {
        ok: false,
        usedTools: false,
        usedWebSearch: false,
        text: '',
        artifacts: [],
        citations: [],
        actions: [],
        provider: 'none',
        error: lastError || (groqKeys.length === 0 && geminiKeys.length === 0 ? 'no groq or gemini keys' : 'tool loop failed'),
    }
}
