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
import { executeToolCall, resolveToolName, type ToolCall } from './execute'
import type { HostOsAction, HostSnapshot } from './host'
import { geminiToolCompletion, type GeminiPart } from './gemini'
import { compactToolHistory, type HistoryTurn } from './history'
import { isAuthDetail, isRateLimitDetail, isToolProtocolReject } from '../provider-errors'
import { toolResultSummary, toolStatusLabel } from './labels'
import { OPENAI_CHAT_TOOLS, TOOL_PROTOCOL } from './spec'

const GEMINI_TOOL_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-3.6-flash'] as const
const GROQ_TOOL_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'] as const

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

const MAX_STEPS = 6
const REQUEST_TIMEOUT_MS = 30_000
const GEMINI_TIMEOUT_MS = 45_000
const MAX_TOKENS = 4_096

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
    return [...buckets.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([, value]) => ({
            id: value.id || `call-${Math.random().toString(36).slice(2, 9)}`,
            name: value.name,
            argumentsJson: value.arguments || '{}',
        }))
        .filter((call) => Boolean(call.name))
}

function openaiToolChoice(choice: 'auto' | 'none' | 'web_search') {
    if (choice === 'web_search') {
        return { type: 'function' as const, function: { name: 'web_search' } }
    }
    return choice
}

async function groqCompletion(params: {
    apiKey: string
    model: string
    messages: ChatMessage[]
    toolChoice: 'auto' | 'none' | 'web_search'
    onToken?: (text: string) => void
}): Promise<
    | { ok: true; content: string; toolCalls: ToolCall[] }
    | { ok: false; detail: string; status?: number }
> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    try {
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
                max_tokens: MAX_TOKENS,
                stream: true,
                tools: OPENAI_CHAT_TOOLS,
                tool_choice: openaiToolChoice(params.toolChoice),
                ...(params.model.includes('gpt-oss') ? { reasoning_effort: 'low' } : {}),
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
        let sawToolCall = false
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
                            sawToolCall = true
                            applyToolCallDelta(buckets, call)
                        }
                        const piece = delta?.content
                        if (typeof piece === 'string' && piece) {
                            content += piece
                            if (!sawToolCall) params.onToken?.(piece)
                        }
                    } catch {
                        /* ignore malformed SSE lines */
                    }
                }
            }
        } finally {
            reader.releaseLock()
        }

        return { ok: true, content, toolCalls: assembleToolCalls(buckets) }
    } catch (error) {
        return { ok: false, detail: error instanceof Error ? error.message : 'fetch error' }
    } finally {
        clearTimeout(timer)
    }
}

type CompletionRound =
    | { ok: true; content: string; toolCalls: ToolCall[]; modelParts?: GeminiPart[] }
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
        toolChoice: 'auto' | 'none' | 'web_search'
        onToken?: (text: string) => void
    }) => Promise<CompletionRound>
    baseMessages: ChatMessage[]
    onToken?: (text: string) => void
    onTool?: (event: ToolEvent) => void
    provider: string
    env?: EnvStore
    host?: HostSnapshot
    forceWebSearch?: boolean
    holdPublicUntilCitations?: boolean
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
    const artifacts: ArtifactDocument[] = []
    const citations: AiCitation[] = []
    const actions: HostOsAction[] = []
    const working: ChatMessage[] = params.baseMessages.map((item) => ({ ...item }))
    let usedTools = false
    let usedWebSearch = false
    let publicText = ''

    for (let step = 0; step < MAX_STEPS; step += 1) {
        const lastStep = step === MAX_STEPS - 1
        const toolChoice: 'auto' | 'none' | 'web_search' = lastStep
            ? 'none'
            : step === 0 && params.forceWebSearch
              ? 'web_search'
              : 'auto'
        const emitPublic = (text: string) => {
            if (!text) return
            if (params.holdPublicUntilCitations && citations.length === 0) return
            params.onToken?.(text)
        }
        let streamedChars = 0
        const round = await params.complete({
            messages: working,
            toolChoice,
            onToken: (text) => {
                streamedChars += text.length
                emitPublic(text)
            },
        })
        if (!round.ok) {
            if (round.status === 400 && isToolProtocolReject(round.detail)) {
                return { kind: 'tools-rejected', error: round.detail }
            }
            if (
                round.status === 429 ||
                round.status === 401 ||
                round.status === 403 ||
                isRateLimitDetail(round.detail) ||
                isAuthDetail(round.detail)
            ) {
                return { kind: 'auth', error: round.detail }
            }
            return {
                kind: 'failed',
                error: round.detail,
                usedTools,
                usedWebSearch,
                artifacts,
                citations,
                actions,
                text: publicText,
            }
        }

        const visible = publicTextFromRound(round.content || '', round.toolCalls.length)
        if (visible && streamedChars === 0) emitPublic(visible)
        publicText += visible
        if (round.toolCalls.length === 0) {
            return {
                kind: 'done',
                result: {
                    ok: Boolean(publicText.trim()) || usedTools || artifacts.length > 0 || citations.length > 0,
                    usedTools,
                    usedWebSearch,
                    text: publicText,
                    artifacts,
                    citations,
                    actions,
                    provider: params.provider,
                },
            }
        }

        usedTools = true
        working.push({
            role: 'assistant',
            content: round.content || null,
            tool_calls: round.toolCalls.map((call) => ({
                id: call.id,
                type: 'function' as const,
                function: { name: call.name, arguments: call.argumentsJson },
                thoughtSignature: call.thoughtSignature,
            })),
            geminiModelParts: round.modelParts,
        })

        for (const call of round.toolCalls) {
            const name = resolveToolName(call.name)
            params.onTool?.({
                id: call.id,
                name,
                status: 'running',
                arguments: call.argumentsJson.slice(0, 800),
                detail: toolStatusLabel(name, 'running'),
                thoughtSignature: call.thoughtSignature,
            })
        }
        const executedRound = await Promise.all(
            round.toolCalls.map((call) => executeToolCall(call, params.env, params.host))
        )
        for (let index = 0; index < round.toolCalls.length; index += 1) {
            const call = round.toolCalls[index]
            const executed = executedRound[index]
            if (executed.artifact) artifacts.push(executed.artifact)
            if (executed.citations?.length) citations.push(...executed.citations)
            if (executed.action) actions.push(executed.action)
            if (executed.name === 'web_search') usedWebSearch = true
            params.onTool?.({
                id: call.id,
                name: executed.name,
                status: executed.ok ? 'done' : 'error',
                arguments: call.argumentsJson.slice(0, 800),
                result: executed.result.slice(0, 1500),
                detail:
                    executed.summary ||
                    toolResultSummary(executed.name, executed.ok, executed.result),
                thoughtSignature: call.thoughtSignature,
            })
            working.push({
                role: 'tool',
                tool_call_id: call.id,
                content: executed.result,
            })
        }
    }

    return {
        kind: 'done',
        result: {
            ok: Boolean(publicText.trim()) || artifacts.length > 0 || citations.length > 0,
            usedTools,
            usedWebSearch,
            text: publicText,
            artifacts,
            citations,
            actions,
            provider: params.provider,
        },
    }
}

export async function runToolLoop(params: {
    systemPrompt: string
    userPrompt: string
    history?: HistoryTurn[]
    env?: EnvStore
    onToken?: (text: string) => void
    onTool?: (event: ToolEvent) => void
    forceWebSearch?: boolean
    holdPublicUntilCitations?: boolean
    host?: HostSnapshot
}): Promise<ToolLoopResult> {
    const env = params.env ?? getRuntimeEnv()
    const groqKeys = takeGroqKeyOrder(collectGroqKeys(env)).filter((key) => !isGroqKeyCooling(key))
    const groqModels = resolveGroqToolModels(env)
    const geminiKeys = takeGeminiKeyOrder(collectGeminiKeys(env)).filter((key) => !isFamilyKeyCooling('gemini', key))
    const configuredGemini = envFrom(env, 'GEMINI_MODEL', 'GEMINI_PRIMARY_MODEL')
    const geminiModels = configuredGemini
        ? [configuredGemini, ...GEMINI_TOOL_MODELS.filter((model) => model !== configuredGemini)]
        : [...GEMINI_TOOL_MODELS]

    const systemPrompt = `${params.systemPrompt}\n\n${TOOL_PROTOCOL}`.slice(0, 10_000)
    const baseMessages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...compactToolHistory(params.history),
        { role: 'user', content: params.userPrompt.slice(0, 8_000) },
    ]

    let lastError = ''

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
                onTool: params.onTool,
                complete: ({ messages, toolChoice, onToken }) =>
                    groqCompletion({ apiKey, model: groqModel, messages, toolChoice, onToken }),
            })
            if (step.kind === 'done') return step.result
            lastError = step.error
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
                onTool: params.onTool,
                complete: ({ messages, toolChoice, onToken }) =>
                    geminiToolCompletion({
                        apiKey,
                        model,
                        systemPrompt,
                        messages,
                        toolChoice,
                        onToken,
                        timeoutMs: GEMINI_TIMEOUT_MS,
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
