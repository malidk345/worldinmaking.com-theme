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
import { geminiToolCompletion, type GeminiPart } from './gemini'
import { compactToolHistory, type HistoryTurn } from './history'
import { isAuthDetail, isRateLimitDetail, isToolProtocolReject } from '../provider-errors'
import { modeAfterResume, resumeUserMessage, type AgentCheckpoint, type ResumeAction } from '../agent/checkpoint'
import type { HumanTurn } from '../agent/human'
import { modeSystemPrompt, parseAgentMode, PLAN_TOOL_PROTOCOL, type AgentMode } from '../agent/modes'
import { OPENAI_CHAT_TOOLS, TOOL_PROTOCOL, toolsForAgentMode, type OpenAiToolSpec } from './spec'
import { runAgentNodePipeline, type NodeEvent } from './pipeline'
import type { AgentActivity } from '../agent/activity'


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
    if (!external) return () => {}
    if (external.aborted) {
        controller.abort()
        return () => {}
    }
    const onAbort = () => controller.abort()
    external.addEventListener('abort', onAbort, { once: true })
    return () => external.removeEventListener('abort', onAbort)
}

function isClientAbortDetail(detail: string): boolean {
    const d = detail.toLowerCase()
    return d.includes('client request aborted') || d.includes('aborterror') || d === 'aborted'
}


export const TOOL_FAMILY_ORDER = ['groq', 'gemini', 'nvidia', 'openai'] as const

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
    maxTokens?: number
    signal?: AbortSignal
}): Promise<
    | { ok: true; content: string; toolCalls: ToolCall[]; reasoning?: string }
    | { ok: false; detail: string; status?: number }
> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    const unlink = linkAbortSignal(controller, params.signal)
    try {
        if (params.signal?.aborted) return { ok: false, detail: 'client request aborted' }
        const url = params.baseUrl || 'https://api.openai.com/v1/chat/completions'
        const res = await fetch(url, {
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
                ...(params.omitTools
                    ? {}
                    : {
                          tools: params.tools || OPENAI_CHAT_TOOLS,
                          tool_choice: openaiToolChoice(params.toolChoice),
                      }),
            }),
        })
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
            while (true) {
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
    maxTokens?: number
    signal?: AbortSignal
}): Promise<
    | { ok: true; content: string; toolCalls: ToolCall[]; reasoning?: string }
    | { ok: false; detail: string; status?: number }
> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    const unlink = linkAbortSignal(controller, params.signal)
    try {
        if (params.signal?.aborted) return { ok: false, detail: 'client request aborted' }
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
                ...(params.omitTools
                    ? {}
                    : {
                          tools: params.tools || OPENAI_CHAT_TOOLS,
                          tool_choice: openaiToolChoice(params.toolChoice),
                      }),
            }),
        })
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
            while (true) {
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

async function runToolSteps(params: {
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
    provider: string
    env?: EnvStore
    host?: HostSnapshot
    forceWebSearch?: boolean
    holdPublicUntilCitations?: boolean
    agentMode?: AgentMode
    checkpoint?: AgentCheckpoint
}): Promise<
    | { kind: 'done'; result: ToolLoopResult }
    | { kind: 'tools-rejected'; error: string }
    | { kind: 'auth'; error: string }
    | {
          kind: 'failed'
          error: string
          usedTools: boolean
          usedWebSearch: boolean
          artifacts: ArtifactDocument[]
          citations: AiCitation[]
          actions: HostOsAction[]
          text: string
      }
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
        forceWebSearch: params.forceWebSearch,
        holdPublicUntilCitations: params.holdPublicUntilCitations,
        maxSteps: MAX_STEPS,
        agentMode: params.agentMode,
    })

    if (pipelineRes.ok) {
        return {
            kind: 'done',
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
        usedTools: pipelineRes.usedTools,
        usedWebSearch: pipelineRes.usedWebSearch,
        artifacts: pipelineRes.artifacts,
        citations: pipelineRes.citations,
        actions: pipelineRes.actions,
        text: pipelineRes.text,
    }
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
    agentMode?: AgentMode
    checkpoint?: AgentCheckpoint
    resumeAction?: ResumeAction
    resumePayload?: string
    /** Client disconnect / Stop — abort in-flight provider fetches. */
    signal?: AbortSignal
}): Promise<ToolLoopResult> {
    if (params.signal?.aborted) {
        return {
            ok: false,
            usedTools: false,
            usedWebSearch: false,
            text: '',
            artifacts: [],
            citations: [],
            actions: [],
            provider: 'none',
            error: 'client request aborted',
        }
    }
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
    const modePrompt = modeSystemPrompt(agentMode)
    const protocol = agentMode === 'plan' ? PLAN_TOOL_PROTOCOL : TOOL_PROTOCOL
    const head = [modePrompt, protocol].filter(Boolean).join('\n\n')
    const restBudget = Math.max(1500, 12_000 - head.length)
    const systemPrompt = `${head}\n\n${params.systemPrompt.slice(0, restBudget)}`
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

    const families = nextToolFamilyOrder()

    for (const family of families) {
        if (params.signal?.aborted) {
            return {
                ok: false,
                usedTools: false,
                usedWebSearch: false,
                text: '',
                artifacts: [],
                citations: [],
                actions: [],
                provider: 'none',
                error: 'client request aborted',
            }
        }
        if (family === 'openai' && byokOpenai) {
            const step = await runToolSteps({
                provider: 'openai',
                env,
                host: params.host,
                forceWebSearch: params.forceWebSearch,
                holdPublicUntilCitations: params.holdPublicUntilCitations,
                baseMessages,
                onToken: params.onToken,
                onThinking: params.onThinking,
                onTool: params.onTool,
                onNode: params.onNode,
                onMode,
                onHuman: params.onHuman,
                onActivity: params.onActivity,
                checkpoint: params.checkpoint,
                agentMode,
                complete: ({ messages, toolChoice, onToken, onThinking, omitTools, maxTokens }) =>
                    openaiCompletion({
                        apiKey: byokOpenai,
                        model: openaiModel,
                        messages,
                        toolChoice,
                        onToken,
                        onThinking,
                        omitTools,
                        maxTokens,
                        tools: toolsForAgentMode(agentMode),
                        signal: params.signal,
                    }),
            })
            if (step.kind === 'done') return step.result
            if (step.kind === 'failed' && (step.usedTools || step.artifacts.length > 0 || step.citations.length > 0)) {
                return {
                    ok: true,
                    usedTools: step.usedTools,
                    usedWebSearch: step.usedWebSearch,
                    text: step.text,
                    artifacts: step.artifacts,
                    citations: step.citations,
                    actions: step.actions,
                    provider: 'openai',
                }
            }
            lastError = step.error
            if (isClientAbortDetail(step.error)) {
                return {
                    ok: false,
                    usedTools: step.usedTools,
                    usedWebSearch: step.usedWebSearch,
                    text: step.text,
                    artifacts: step.artifacts,
                    citations: step.citations,
                    actions: step.actions,
                    provider: 'none',
                    error: 'client request aborted',
                }
            }
        }

        if (family === 'nvidia' && nvidiaKey) {
            for (const nvidiaModel of nvidiaModels) {
                const step = await runToolSteps({
                    provider: 'nvidia:deepseek',
                    env,
                    host: params.host,
                    forceWebSearch: params.forceWebSearch,
                    holdPublicUntilCitations: params.holdPublicUntilCitations,
                    baseMessages,
                    onToken: params.onToken,
                    onThinking: params.onThinking,
                    onTool: params.onTool,
                    onNode: params.onNode,
                    onMode,
                    onHuman: params.onHuman,
                    onActivity: params.onActivity,
                    checkpoint: params.checkpoint,
                    agentMode,
                    complete: ({ messages, toolChoice, onToken, onThinking, omitTools, maxTokens }) =>
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
                            tools: toolsForAgentMode(agentMode),
                            signal: params.signal,
                        }),
                })
                if (step.kind === 'done') return step.result
                if (step.kind === 'failed' && (step.usedTools || step.artifacts.length > 0 || step.citations.length > 0)) {
                    return {
                        ok: true,
                        usedTools: step.usedTools,
                        usedWebSearch: step.usedWebSearch,
                        text: step.text,
                        artifacts: step.artifacts,
                        citations: step.citations,
                        actions: step.actions,
                        provider: 'nvidia:deepseek',
                    }
                }
                lastError = step.error
                if (isClientAbortDetail(step.error)) {
                    return {
                        ok: false,
                        usedTools: step.usedTools,
                        usedWebSearch: step.usedWebSearch,
                        text: step.text,
                        artifacts: step.artifacts,
                        citations: step.citations,
                        actions: step.actions,
                        provider: 'none',
                        error: 'client request aborted',
                    }
                }
            }
        }

        if (family === 'groq') {
            for (const apiKey of groqKeys) {
                let skipKey = false
                for (const groqModel of groqModels) {
                    if (skipKey) break
                    const step = await runToolSteps({
                        provider: 'groq',
                        env,
                        host: params.host,
                        forceWebSearch: params.forceWebSearch,
                        holdPublicUntilCitations: params.holdPublicUntilCitations,
                        baseMessages,
                        onToken: params.onToken,
                        onThinking: params.onThinking,
                        onTool: params.onTool,
                        onNode: params.onNode,
                        onMode,
                        onHuman: params.onHuman,
                        onActivity: params.onActivity,
                        checkpoint: params.checkpoint,
                        agentMode,
                        complete: ({ messages, toolChoice, onToken, onThinking, omitTools, maxTokens }) =>
                            groqCompletion({
                                apiKey,
                                model: groqModel,
                                messages,
                                toolChoice,
                                onToken,
                                onThinking,
                                omitTools,
                                maxTokens,
                                tools: toolsForAgentMode(agentMode),
                                signal: params.signal,
                            }),
                    })
                    if (step.kind === 'done') return step.result
                    lastError = step.error
                    if (isClientAbortDetail(step.error)) {
                        return {
                            ok: false,
                            usedTools: false,
                            usedWebSearch: false,
                            text: '',
                            artifacts: [],
                            citations: [],
                            actions: [],
                            provider: 'none',
                            error: 'client request aborted',
                        }
                    }
                    if (step.kind === 'tools-rejected') continue
                    if (step.kind === 'auth') {
                        markGroqKeyCooling(apiKey)
                        skipKey = true
                        break
                    }
                    if (step.kind === 'failed' && (step.usedTools || step.artifacts.length > 0 || step.citations.length > 0)) {
                        return {
                            ok: true,
                            usedTools: step.usedTools,
                            usedWebSearch: step.usedWebSearch,
                            text: step.text,
                            artifacts: step.artifacts,
                            citations: step.citations,
                            actions: step.actions,
                            provider: 'groq',
                        }
                    }
                }
            }
        }

        if (family === 'gemini') {
            for (const apiKey of geminiKeys) {
                let skipKey = false
                for (const model of geminiModels) {
                    if (skipKey) break
                    const step = await runToolSteps({
                        provider: 'gemini',
                        env,
                        host: params.host,
                        forceWebSearch: params.forceWebSearch,
                        holdPublicUntilCitations: params.holdPublicUntilCitations,
                        baseMessages,
                        onToken: params.onToken,
                        onThinking: params.onThinking,
                        onTool: params.onTool,
                        onNode: params.onNode,
                        onMode,
                        onHuman: params.onHuman,
                        onActivity: params.onActivity,
                        checkpoint: params.checkpoint,
                        agentMode,
                        complete: ({ messages, toolChoice, onToken, onThinking, omitTools, maxTokens }) =>
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
                                timeoutMs: GEMINI_TIMEOUT_MS,
                                tools: toolsForAgentMode(agentMode),
                                signal: params.signal,
                            }),
                    })
                    if (step.kind === 'done') return step.result
                    lastError = step.error
                    if (step.kind === 'tools-rejected') continue
                    if (step.kind === 'auth') {
                        markFamilyKeyCooling('gemini', apiKey)
                        skipKey = true
                        break
                    }
                    if (step.kind === 'failed' && (step.usedTools || step.artifacts.length > 0 || step.citations.length > 0)) {
                        return {
                            ok: true,
                            usedTools: step.usedTools,
                            usedWebSearch: step.usedWebSearch,
                            text: step.text,
                            artifacts: step.artifacts,
                            citations: step.citations,
                            actions: step.actions,
                            provider: 'gemini',
                        }
                    }
                }
            }
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
        provider: groqKeys.length || geminiKeys.length ? 'none' : 'none',
        error: lastError || (groqKeys.length === 0 && geminiKeys.length === 0 ? 'no groq or gemini keys' : 'tool loop failed'),
    }
}
