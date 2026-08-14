/**
 * Edge-safe multi-provider AI gateway (plain fetch only).
 * Used by chat, /api/bots/act, and future forum/paper workers.
 */
import type { TaskType } from 'lib/persona-engine'
import { usesNativeQwenReasoning, type ThinkingDepth } from './thinking'
import {
    EnvStore,
    envFrom,
    getProviderKeyFlags,
    getRuntimeEnv,
    splitKeys,
} from './runtime-env'



export interface StreamResult {
    ok: true
    provider: GatewayProvider
    stream: AsyncIterableIterator<string>
    attempts: string[]
    configured: ReturnType<typeof getProviderKeyFlags>
}
export type GatewayProvider =
    | 'groq'
    | 'groq:qwen'
    | 'groq:llama'
    | 'openrouter'
    | `openrouter:${string}`
    | `gemini-fetch:${string}`
    | 'huggingface'
    | 'openai-sdk'
    | 'none'

export type GatewayMessage = {
    role: 'system' | 'user' | 'assistant'
    content: string
}

type PromptCaps = {
    system: number
    user: number
    turns: number
    turnChars: number
}

const DEFAULT_PROMPT_CAPS: PromptCaps = {
    system: 8_000,
    user: 4_000,
    turns: 6,
    turnChars: 1_200,
}

function buildCompletionMessages(
    systemPrompt: string,
    userPrompt: string,
    history?: GatewayMessage[],
    caps: PromptCaps = DEFAULT_PROMPT_CAPS,
): GatewayMessage[] {
    const messages: GatewayMessage[] = [{
        role: 'system',
        content: systemPrompt.slice(0, caps.system),
    }]
    if (history?.length) {
        for (const item of history.slice(-caps.turns)) {
            if ((item.role === 'user' || item.role === 'assistant') && item.content.trim()) {
                messages.push({ role: item.role, content: item.content.slice(0, caps.turnChars) })
            }
        }
    }
    messages.push({ role: 'user', content: userPrompt.slice(0, caps.user) })
    return messages
}

function toGeminiContents(userPrompt: string, history?: GatewayMessage[]) {
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = []
    if (history?.length) {
        for (const item of history.slice(-16)) {
            if ((item.role === 'user' || item.role === 'assistant') && item.content.trim()) {
                contents.push({
                    role: item.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: item.content.slice(0, 4000) }],
                })
            }
        }
    }
    contents.push({ role: 'user', parts: [{ text: userPrompt }] })
    return contents
}

export interface GenerateResult {
    ok: true
    text: string
    provider: GatewayProvider
    latencyMs: number
    /** Native provider trace format, when the selected model exposes one. */
    trace?: 'qwen'
}

export interface GenerateFailure {
    ok: false
    provider: 'none'
    attempts: string[]
    configured: ReturnType<typeof getProviderKeyFlags>
    error: string
    latencyMs: number
}

const OPENROUTER_MODELS = [
    'meta-llama/llama-3.3-70b-instruct',
    'meta-llama/llama-3.1-8b-instruct',
    'openai/gpt-4o-mini',
    'openrouter/auto',
]

const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash']

// Hugging Face Inference Router (OpenAI-compatible /v1/chat/completions) — real,
// configured fallback provider (HUGGINGFACE_API_KEY is bound on Cloudflare Pages).
// NOTE: xAI's "Grok" model is intentionally NOT included here — no GROK_API_KEY /
// XAI_API_KEY secret exists on Cloudflare, so it would only ever fail. If Grok keys
// are added later, bind GROK_API_KEYS (comma-separated) and wire a family for it here.
const HUGGINGFACE_MODEL = 'meta-llama/Meta-Llama-3-8B-Instruct'

/** Task → preferred OpenRouter model (when OPENROUTER_MODEL not set). */
const TASK_OPENROUTER: Partial<Record<TaskType, string>> = {
    synthesis: 'meta-llama/llama-3.3-70b-instruct',
    paper_section: 'meta-llama/llama-3.3-70b-instruct',
    third_voice: 'meta-llama/llama-3.3-70b-instruct',
    dialectic_challenge: 'meta-llama/llama-3.3-70b-instruct',
    cross_examine: 'meta-llama/llama-3.3-70b-instruct',
    fact_critique: 'meta-llama/llama-3.1-8b-instruct',
    community_reply: 'meta-llama/llama-3.1-8b-instruct',
    thread_init: 'meta-llama/llama-3.1-8b-instruct',
}

/**
 * Provider-family cooldown registry. When a family (groq/openrouter/gemini/huggingface)
 * returns a 429/rate-limit/quota error across all of its keys, it's marked "cooling" for
 * 60s and pushed to the end of the rotation (still tried as a last resort, never dropped).
 * Resets when the Cloudflare isolate recycles — acceptable, same limitation as rate-limit.ts.
 */
const PROVIDER_COOLDOWNS = new Map<string, number>()
const COOLDOWN_MS = 60_000
const PROVIDER_REQUEST_TIMEOUT_MS = 12_000
const GATEWAY_TOTAL_TIMEOUT_MS = 45_000
const MAX_SYSTEM_PROMPT_CHARS = 8_000
const MAX_USER_PROMPT_CHARS = 4_000
const DEFAULT_MAX_TOKENS = 2048
const GROQ_HISTORY_TURNS = 6
const GROQ_HISTORY_CHARS = 1200
/** Groq on_demand qwen/qwen3.6-27b: 8K TPM. Request size = input + max_tokens. */
export const GROQ_TPM_LIMIT = 8_000
const GROQ_TPM_SAFETY = 500
const MIN_GROQ_COMPLETION_TOKENS = 256
const HEAVY_THINKING_COOLDOWN_MS = 25_000

export function isRequestTooLarge(detail: string): boolean {
    const d = detail.toLowerCase()
    return d.startsWith('413') || d.includes('request too large') || d.includes('tpm')
}

function isQwen36(model: string): boolean {
    return /qwen3\.6|qwen\/qwen3\.6/i.test(model)
}

function isGroqEndpoint(url: string): boolean {
    return url.includes('api.groq.com')
}

/** Conservative mixed TR/EN estimate. Groq's TPM check is also conservative. */
export function estimateTokensFromText(text: string): number {
    if (!text) return 0
    return Math.ceil(text.length / 3)
}

export function estimateMessagesTokens(messages: GatewayMessage[]): number {
    return messages.reduce((sum, message) => sum + estimateTokensFromText(message.content) + 8, 16)
}

function groqPromptCaps(thinking: boolean, compact: boolean): PromptCaps {
    if (compact) {
        return { system: 3_200, user: 1_400, turns: 3, turnChars: 400 }
    }
    if (thinking) {
        return { system: 4_200, user: 1_800, turns: 4, turnChars: 600 }
    }
    return { system: 5_500, user: 2_400, turns: 5, turnChars: 800 }
}

function wantedGroqMaxTokens(model: string, thinking: boolean, compact: boolean): number {
    if (isQwen36(model)) {
        if (thinking) return compact ? 1_024 : 1_792
        return compact ? 768 : 1_280
    }
    return compact ? 768 : DEFAULT_MAX_TOKENS
}

function shrinkMessagesForTpm(messages: GatewayMessage[], neededCompletion: number): GatewayMessage[] {
    const fitted = messages.map((message) => ({ ...message }))
    const hardCap = GROQ_TPM_LIMIT - GROQ_TPM_SAFETY

    const roomFor = () => hardCap - estimateMessagesTokens(fitted)

    while (roomFor() < neededCompletion) {
        if (fitted.length > 2) {
            fitted.splice(1, 1)
            continue
        }
        const system = fitted[0]
        if (system && system.content.length > 1_600) {
            system.content = system.content.slice(0, Math.floor(system.content.length * 0.75))
            continue
        }
        const user = fitted[fitted.length - 1]
        if (user && user.content.length > 700) {
            user.content = user.content.slice(0, Math.floor(user.content.length * 0.75))
            continue
        }
        break
    }

    return fitted
}

export function fitGroqRequest(options: {
    model: string
    systemPrompt: string
    userPrompt: string
    history?: GatewayMessage[]
    thinkingDepth?: ThinkingDepth
    compact?: boolean
}): { messages: GatewayMessage[]; maxTokens: number; promptTokens: number; skip: boolean } {
    const thinking = usesNativeQwenReasoning(options.thinkingDepth)
    const compact = !!options.compact
    const wanted = wantedGroqMaxTokens(options.model, thinking, compact)
    const caps = groqPromptCaps(thinking, compact)
    let messages = buildCompletionMessages(options.systemPrompt, options.userPrompt, options.history, caps)
    messages = shrinkMessagesForTpm(messages, Math.min(wanted, 768))
    const promptTokens = estimateMessagesTokens(messages)
    const room = GROQ_TPM_LIMIT - GROQ_TPM_SAFETY - promptTokens
    const maxTokens = Math.max(MIN_GROQ_COMPLETION_TOKENS, Math.min(wanted, room))
    return {
        messages,
        maxTokens,
        promptTokens,
        skip: room < MIN_GROQ_COMPLETION_TOKENS,
    }
}

/**
 * Qwen 3.6 native reasoning is the live ThinkingBlock source.
 * Brief/minimal keeps it off so short replies are not starved.
 * Balanced/extended use parsed traces so `delta.reasoning` is visible.
 */
function providerBodyExtras(model: string, thinkingDepth?: ThinkingDepth): Record<string, unknown> {
    if (!isQwen36(model)) return {}
    return { reasoning_effort: usesNativeQwenReasoning(thinkingDepth) ? 'default' : 'none' }
}

function firstString(...values: unknown[]): string {
    for (const value of values) {
        if (typeof value === 'string' && value) return value
        if (value && typeof value === 'object' && typeof (value as { content?: unknown }).content === 'string') {
            const nested = (value as { content: string }).content
            if (nested) return nested
        }
    }
    return ''
}

/** Groq/OpenAI-compatible reasoning can sit on several fields depending on format. */
export function extractProviderReasoning(payload: unknown): string {
    if (!payload || typeof payload !== 'object') return ''
    const root = payload as Record<string, any>
    const choice = root.choices?.[0] || root
    const delta = choice?.delta || {}
    const message = choice?.message || root.message || {}
    return firstString(
        delta.reasoning,
        delta.reasoning_content,
        delta.reasoning_text,
        message.reasoning,
        message.reasoning_content,
        message.reasoning_text,
        root.reasoning,
        root.reasoning_content
    )
}

function resolveMaxTokens(model: string, thinkingDepth?: ThinkingDepth): number {
    if (isQwen36(model)) {
        return usesNativeQwenReasoning(thinkingDepth) ? 1792 : 1280
    }
    return DEFAULT_MAX_TOKENS
}

function resolveRequestTimeoutMs(model: string, deadline?: number): number {
    const desired = isQwen36(model) ? 25_000 : PROVIDER_REQUEST_TIMEOUT_MS
    if (!deadline) return desired
    return Math.max(1, Math.min(desired, deadline - Date.now()))
}

function isFamilyCooling(name: string): boolean {
    const coolUntil = PROVIDER_COOLDOWNS.get(name)
    if (!coolUntil) return false
    if (Date.now() > coolUntil) {
        PROVIDER_COOLDOWNS.delete(name)
        return false
    }
    return true
}

function markFamilyCooling(name: string, ms = COOLDOWN_MS): void {
    PROVIDER_COOLDOWNS.set(name, Date.now() + ms)
}

function isRateLimitDetail(detail: string): boolean {
    const d = detail.toLowerCase()
    return (
        d.startsWith('429') ||
        d.includes('rate limit') ||
        d.includes('rate_limit') ||
        d.includes('quota') ||
        d.includes('resource_exhausted') ||
        d.includes('too many requests')
    )
}

const PROVIDER_FAMILY_ORDER = ['groq', 'gemini', 'huggingface', 'openrouter'] as const
export type ProviderFamily = (typeof PROVIDER_FAMILY_ORDER)[number]

/** Groq Qwen first for every philosopher. Cooling families move to the end. */
export function getFamilyOrder(skipFamilies: ProviderFamily[] = []): ProviderFamily[] {
    const skip = new Set(skipFamilies)
    const active = PROVIDER_FAMILY_ORDER.filter((family) => !isFamilyCooling(family) && !skip.has(family))
    const cooling = PROVIDER_FAMILY_ORDER.filter((family) => isFamilyCooling(family) && !skip.has(family))
    return [...active, ...cooling]
}

export function resetProviderCooldowns(): void {
    PROVIDER_COOLDOWNS.clear()
}

export { markFamilyCooling }

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs = PROVIDER_REQUEST_TIMEOUT_MS): Promise<Response> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
        return await fetch(input, { ...init, signal: controller.signal })
    } catch (error: any) {
        if (controller.signal.aborted) throw new Error(`provider request timeout after ${timeoutMs}ms`)
        throw error
    } finally {
        clearTimeout(timer)
    }
}

/**
 * Transient failures (5xx, timeouts, network blips) are worth one quick retry
 * on the SAME key/model before moving on — non-transient failures (401/402/403/404,
 * bad request, empty content) are not retried since retrying won't help.
 */
function isTransientDetail(detail: string): boolean {
    const d = detail.toLowerCase()
    return (
        d.startsWith('500') ||
        d.startsWith('502') ||
        d.startsWith('503') ||
        d.startsWith('504') ||
        d.includes('timeout') ||
        d.includes('econnreset') ||
        d.includes('etimedout') ||
        d.includes('fetch error') ||
        d.includes('network')
    )
}

/**
 * Wraps a single provider call with one short retry on transient failures.
 */
async function withRetry(
    fn: () => Promise<{ ok: true; text: string } | { ok: false; detail: string }>,
    deadline?: number,
): Promise<{ ok: true; text: string } | { ok: false; detail: string }> {
    const first = await fn()
    if (first.ok || !isTransientDetail(first.detail)) return first
    if (deadline && Date.now() + 350 >= deadline) return first
    await sleep(350)
    return fn()
}


function resolveChatPayload(
    url: string,
    model: string,
    systemPrompt: string,
    userPrompt: string,
    history?: GatewayMessage[],
    thinkingDepth?: ThinkingDepth,
    compact?: boolean,
): { messages: GatewayMessage[]; maxTokens: number; skip: boolean } {
    if (isGroqEndpoint(url)) {
        return fitGroqRequest({
            model,
            systemPrompt,
            userPrompt,
            history,
            thinkingDepth,
            compact,
        })
    }
    return {
        messages: buildCompletionMessages(systemPrompt, userPrompt, history),
        maxTokens: resolveMaxTokens(model, thinkingDepth),
        skip: false,
    }
}

async function chatCompletionsStream(
    url: string,
    apiKey: string,
    model: string,
    systemPrompt: string,
    userPrompt: string,
    temperature?: number,
    extraHeaders: Record<string, string> = {},
    deadline?: number,
    history?: GatewayMessage[],
    thinkingDepth?: ThinkingDepth,
    compact?: boolean,
): Promise<{ ok: true; stream: AsyncIterableIterator<string> } | { ok: false; detail: string }> {
    try {
        const timeoutMs = resolveRequestTimeoutMs(model, deadline)
        const payload = resolveChatPayload(url, model, systemPrompt, userPrompt, history, thinkingDepth, compact)
        if (payload.skip) {
            return { ok: false, detail: '413 prompt exceeds groq tpm budget' }
        }

        const fetchRes = await fetchWithTimeout(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                ...extraHeaders,
            },
            body: JSON.stringify({
                model,
                messages: payload.messages,
                temperature: temperature ?? 0.7,
                max_tokens: payload.maxTokens,
                stream: true,
                ...providerBodyExtras(model, thinkingDepth),
            }),
        }, timeoutMs)

        if (!fetchRes.ok) {
            const raw = await fetchRes.text()
            const detail = `${fetchRes.status} ${raw.slice(0, 200)}`
            if (!compact && isGroqEndpoint(url) && isRequestTooLarge(detail)) {
                return chatCompletionsStream(
                    url,
                    apiKey,
                    model,
                    systemPrompt,
                    userPrompt,
                    temperature,
                    extraHeaders,
                    deadline,
                    history,
                    thinkingDepth,
                    true,
                )
            }
            return { ok: false, detail }
        }

        if (!fetchRes.body) {
            return { ok: false, detail: 'No response body' }
        }

        const streamGenerator = async function* (): AsyncIterableIterator<string> {
            const reader = fetchRes.body!.getReader()
            const decoder = new TextDecoder('utf-8')
            let buffer = ''
            
            let hasStartedReasoning = false
            let hasFinishedReasoning = false

            try {
                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break
                    
                    buffer += decoder.decode(value, { stream: true })
                    const lines = buffer.split('\n')
                    buffer = lines.pop() || ''
                    
                    for (let line of lines) {
                        line = line.trim()
                        if (!line || line === 'data: [DONE]') continue
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.slice(6))
                                const delta = data.choices?.[0]?.delta
                                const reasoning = extractProviderReasoning(data)
                                const content = typeof delta?.content === 'string' ? delta.content : ''

                                if (reasoning) {
                                    if (!hasStartedReasoning) {
                                        hasStartedReasoning = true
                                        yield '<think>'
                                    }
                                    yield reasoning
                                }
                                if (content) {
                                    if (hasStartedReasoning && !hasFinishedReasoning) {
                                        hasFinishedReasoning = true
                                        yield '</think>'
                                    }
                                    yield content
                                }
                            } catch {
                                // Ignore parse errors in stream
                            }
                        }
                    }
                }
                if (hasStartedReasoning && !hasFinishedReasoning) {
                    yield '</think>'
                }
            } finally {
                reader.releaseLock()
            }
        }

        return { ok: true, stream: streamGenerator() }
    } catch (e: any) {
        return { ok: false, detail: e?.message || 'fetch error' }
    }
}
async function chatCompletions(
    url: string,
    apiKey: string,
    model: string,
    systemPrompt: string,
    userPrompt: string,
    temperature?: number,
    extraHeaders: Record<string, string> = {},
    deadline?: number,
    history?: GatewayMessage[],
    thinkingDepth?: ThinkingDepth,
    compact?: boolean,
): Promise<{ ok: true; text: string } | { ok: false; detail: string }> {
    try {
        const timeoutMs = resolveRequestTimeoutMs(model, deadline)
        const payload = resolveChatPayload(url, model, systemPrompt, userPrompt, history, thinkingDepth, compact)
        if (payload.skip) {
            return { ok: false, detail: '413 prompt exceeds groq tpm budget' }
        }
        const fetchRes = await fetchWithTimeout(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                ...extraHeaders,
            },
            body: JSON.stringify({
                model,
                messages: payload.messages,
                temperature: temperature ?? 0.7,
                max_tokens: payload.maxTokens,
                ...providerBodyExtras(model, thinkingDepth),
            }),
        }, timeoutMs)
        const raw = await fetchRes.text()
        if (!fetchRes.ok) {
            const detail = `${fetchRes.status} ${raw.slice(0, 200)}`
            if (!compact && isGroqEndpoint(url) && isRequestTooLarge(detail)) {
                return chatCompletions(
                    url,
                    apiKey,
                    model,
                    systemPrompt,
                    userPrompt,
                    temperature,
                    extraHeaders,
                    deadline,
                    history,
                    thinkingDepth,
                    true,
                )
            }
            return { ok: false, detail }
        }
        let data: any
        try {
            data = JSON.parse(raw)
        } catch {
            return { ok: false, detail: 'invalid json' }
        }
        const message = data?.choices?.[0]?.message
        const visibleContent = message?.content
        const nativeReasoning = extractProviderReasoning(data)
        const text = nativeReasoning && !String(visibleContent || '').includes('<think>')
            ? `<think>${nativeReasoning}</think>${typeof visibleContent === 'string' ? visibleContent : ''}`
            : visibleContent
        if (!text || typeof text !== 'string') {
            return { ok: false, detail: 'empty content' }
        }
        return { ok: true, text }
    } catch (e: any) {
        return { ok: false, detail: e?.message || 'fetch error' }
    }
}

async function geminiGenerate(
    apiKey: string,
    model: string,
    systemPrompt: string,
    userPrompt: string,
    temperature?: number,
    deadline?: number,
    history?: GatewayMessage[],
): Promise<{ ok: true; text: string } | { ok: false; detail: string }> {
    try {
        const timeoutMs = deadline
            ? Math.max(1, Math.min(PROVIDER_REQUEST_TIMEOUT_MS, deadline - Date.now()))
            : PROVIDER_REQUEST_TIMEOUT_MS
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
        const fetchRes = await fetchWithTimeout(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents: toGeminiContents(userPrompt, history),
                generationConfig: { temperature: temperature ?? 0.7, maxOutputTokens: 1800 },
            }),
        }, timeoutMs)
        const raw = await fetchRes.text()
        if (!fetchRes.ok) {
            return { ok: false, detail: `${fetchRes.status} ${raw.slice(0, 200)}` }
        }
        let data: any
        try {
            data = JSON.parse(raw)
        } catch {
            return { ok: false, detail: 'invalid json' }
        }
        const text = data?.candidates?.[0]?.content?.parts
            ?.map((p: any) => p?.text)
            .filter(Boolean)
            .join('')
        if (!text) return { ok: false, detail: 'empty content' }
        return { ok: true, text }
    } catch (e: any) {
        return { ok: false, detail: e?.message || 'fetch error' }
    }
}

type FamilySuccess = { ok: true; text: string; provider: GatewayProvider; trace?: 'qwen' }
type FamilyParams = {
    systemPrompt: string
    userPrompt: string
    history?: GatewayMessage[]
    temperature?: number
    deadline: number
    thinkingDepth?: ThinkingDepth
}

/** Groq — rotate through all configured keys, first success wins. */
async function tryGroqFamily(
    groqKeys: string[],
    model: string,
    params: FamilyParams,
    attempts: string[]
): Promise<FamilySuccess | null> {
    let sawRateLimit = false
    for (const key of groqKeys) {
        if (Date.now() >= params.deadline) return null
        const r = await withRetry(() => chatCompletions(
            'https://api.groq.com/openai/v1/chat/completions',
            key,
            model,
            params.systemPrompt,
            params.userPrompt,
            params.temperature,
            {},
            params.deadline,
            params.history,
            params.thinkingDepth,
        ), params.deadline)
        if (r.ok) {
            return {
                ok: true,
                text: r.text,
                provider: model.toLowerCase().includes('qwen') ? 'groq:qwen' : 'groq:llama',
                ...(model.toLowerCase().includes('qwen') ? { trace: 'qwen' as const } : {}),
            }
        }
        if (isRateLimitDetail(r.detail)) sawRateLimit = true
        attempts.push(`groq[${groqKeys.indexOf(key) + 1}/${groqKeys.length}]: ${r.detail}`)
        if (isRequestTooLarge(r.detail)) break
    }
    if (groqKeys.length > 0 && sawRateLimit) markFamilyCooling('groq')
    return null
}

/** OpenRouter — skip remaining models immediately on 402 (no credits). */
async function tryOpenRouterFamily(
    openRouterKey: string,
    taskType: TaskType,
    runtimeEnv: EnvStore,
    params: FamilyParams,
    attempts: string[]
): Promise<FamilySuccess | null> {
    if (!openRouterKey) return null
    const preferred = envFrom(runtimeEnv, 'OPENROUTER_MODEL') || TASK_OPENROUTER[taskType] || ''
    const models = [preferred, ...OPENROUTER_MODELS].filter(Boolean)
    const seen = new Set<string>()
    let creditsDepleted = false
    let sawRateLimit = false
    for (const model of models) {
        if (Date.now() >= params.deadline) return null
        if (seen.has(model)) continue
        seen.add(model)
        if (creditsDepleted) { attempts.push(`openrouter(${model}): skipped-no-credits`); continue }
        const r = await withRetry(() => chatCompletions(
            'https://openrouter.ai/api/v1/chat/completions',
            openRouterKey,
            model,
            params.systemPrompt,
            params.userPrompt,
            params.temperature,
            {
                'HTTP-Referer':
                    envFrom(runtimeEnv, 'NEXT_PUBLIC_SITE_URL') || 'https://worldinmaking.com',
                'X-Title': 'WorldInMaking Philosopher Bots',
            },
            params.deadline,
            params.history,
            params.thinkingDepth,
        ), params.deadline)
        if (r.ok) return { ok: true, text: r.text, provider: `openrouter:${model}` }
        if (r.detail.startsWith('402')) creditsDepleted = true
        if (isRateLimitDetail(r.detail)) sawRateLimit = true
        attempts.push(`openrouter(${model}): ${r.detail.slice(0, 100)}`)
    }
    if (sawRateLimit) markFamilyCooling('openrouter')
    return null
}

/** Gemini — rotate through all keys × all models, first success wins. */
async function tryGeminiFamily(
    geminiKeys: string[],
    params: FamilyParams,
    attempts: string[]
): Promise<FamilySuccess | null> {
    let sawRateLimit = false
    for (const key of geminiKeys) {
        if (Date.now() >= params.deadline) return null
        const keyIdx = geminiKeys.indexOf(key) + 1
        for (const model of GEMINI_MODELS) {
            if (Date.now() >= params.deadline) return null
            const r = await withRetry(
                () => geminiGenerate(key, model, params.systemPrompt, params.userPrompt, params.temperature, params.deadline, params.history),
                params.deadline,
            )
            if (r.ok) return { ok: true, text: r.text, provider: `gemini-fetch:${model}` }
            if (isRateLimitDetail(r.detail)) sawRateLimit = true
            attempts.push(`gemini[${keyIdx}/${geminiKeys.length}](${model}): ${r.detail}`)
        }
    }
    if (geminiKeys.length > 0 && sawRateLimit) markFamilyCooling('gemini')
    return null
}

/** Hugging Face Inference Router — OpenAI-compatible endpoint, rotate through all keys. */
async function tryHuggingFaceFamily(
    hfKeys: string[],
    params: FamilyParams,
    attempts: string[]
): Promise<FamilySuccess | null> {
    let sawRateLimit = false
    for (const key of hfKeys) {
        if (Date.now() >= params.deadline) return null
        const r = await withRetry(() => chatCompletions(
            'https://router.huggingface.co/v1/chat/completions',
            key,
            HUGGINGFACE_MODEL,
            params.systemPrompt,
            params.userPrompt,
            params.temperature,
            {},
            params.deadline,
            params.history,
            params.thinkingDepth,
        ), params.deadline)
        if (r.ok) return { ok: true, text: r.text, provider: 'huggingface' }
        if (isRateLimitDetail(r.detail)) sawRateLimit = true
        attempts.push(`huggingface[${hfKeys.indexOf(key) + 1}/${hfKeys.length}]: ${r.detail}`)
    }
    if (hfKeys.length > 0 && sawRateLimit) markFamilyCooling('huggingface')
    return null
}

/**
 * Run system+user prompts through available providers.
 * Family order is Groq → Gemini → HuggingFace → OpenRouter for every philosopher.
 * Cooling families move to the end. OpenAI SDK remains an optional last resort.
 */
export async function generateWithGateway(params: {
    systemPrompt: string
    userPrompt: string
    history?: GatewayMessage[]
    taskType?: TaskType
    temperature?: number
    /** Optional bot/persona name — used purely to pick a starting provider offset. */
    botName?: string
    env?: EnvStore
    thinkingDepth?: ThinkingDepth
    skipFamilies?: ProviderFamily[]
}): Promise<GenerateResult | GenerateFailure> {
    const started = Date.now()
    const runtimeEnv = params.env ?? getRuntimeEnv()
    const taskType = params.taskType ?? 'community_reply'
    const deadline = started + GATEWAY_TOTAL_TIMEOUT_MS
    const systemPrompt = params.systemPrompt.slice(0, MAX_SYSTEM_PROMPT_CHARS)
    const userPrompt = params.userPrompt.slice(0, MAX_USER_PROMPT_CHARS)
    const familyParams = { ...params, systemPrompt, userPrompt, deadline }
    const attempts: string[] = []
    const configured = getProviderKeyFlags(runtimeEnv)

    // Support all common CF Dashboard naming conventions for key sets
    const groqRaw = envFrom(
        runtimeEnv,
        'GROQ_API_KEYS',   // CF Dashboard exact name (comma-separated)
        'GROQ_API_KEY',
        'GROQ_KEYS',
        'GROQ_KEY',
    )
    const groqModel = envFrom(runtimeEnv, 'GROQ_MODEL', 'GROQ_PRIMARY_MODEL', 'QWEN_MODEL') || 'qwen/qwen3.6-27b'
    const openRouterKey = envFrom(runtimeEnv, 'OPENROUTER_API_KEY', 'OPEN_ROUTER_API_KEY', 'OPENROUTER_KEY')
    const openaiKey = envFrom(runtimeEnv, 'OPENAI_API_KEY', 'OPENAI_KEY')
    const geminiRaw = envFrom(
        runtimeEnv,
        'GEMINI_API_KEYS',              // CF Dashboard exact name (comma-separated)
        'GEMINI_API_KEY',
        'GEMINI_KEYS',
        'GEMINI_KEY',
        'GOOGLE_GENERATIVE_AI_API_KEY',
        'GOOGLE_API_KEY',
        'GOOGLE_AI_API_KEY',
        'GOOGLE_GEMINI_API_KEY',
    )
    const huggingFaceRaw = envFrom(
        runtimeEnv,
        'HUGGINGFACE_API_KEYS',
        'HUGGINGFACE_API_KEY',   // CF Dashboard exact name
        'HF_API_KEY',
        'HF_TOKEN',
    )
    // All keys as arrays — failover through each one
    const groqKeys = splitKeys(groqRaw)   // e.g. ['gsk_aaa', 'gsk_bbb', 'gsk_ccc']
    const geminiKeys = splitKeys(geminiRaw) // e.g. ['AIza...1', 'AIza...2']
    const huggingFaceKeys = splitKeys(huggingFaceRaw)

    for (const family of getFamilyOrder(params.skipFamilies)) {
        if (Date.now() >= deadline) {
            attempts.push(`gateway: total timeout after ${GATEWAY_TOTAL_TIMEOUT_MS}ms`)
            break
        }
        let result: FamilySuccess | null = null
        if (family === 'groq') {
            result = await tryGroqFamily(groqKeys, groqModel, familyParams, attempts)
            if (!result && groqModel !== 'llama-3.3-70b-versatile' && Date.now() < deadline) {
                result = await tryGroqFamily(groqKeys, 'llama-3.3-70b-versatile', familyParams, attempts)
            }
        }
        else if (family === 'openrouter') result = await tryOpenRouterFamily(openRouterKey, taskType, runtimeEnv, familyParams, attempts)
        else if (family === 'gemini') result = await tryGeminiFamily(geminiKeys, familyParams, attempts)
        else if (family === 'huggingface') result = await tryHuggingFaceFamily(huggingFaceKeys, familyParams, attempts)

        if (result) {
            if (family === 'groq' && usesNativeQwenReasoning(params.thinkingDepth)) {
                markFamilyCooling('groq', HEAVY_THINKING_COOLDOWN_MS)
            }
            return {
                ok: true,
                text: result.text,
                provider: result.provider,
                latencyMs: Date.now() - started,
                ...(result.trace ? { trace: result.trace } : {}),
            }
        }
    }

    // OpenAI via AI SDK — last-resort bonus provider, outside the family rotation
    // (not currently configured on Cloudflare; kept for optional local/dev use).
    if (openaiKey && Date.now() < deadline) {
        try {
            const { createOpenAI } = await import('@ai-sdk/openai')
            const { generateText } = await import('ai')
            const openai = createOpenAI({ apiKey: openaiKey })
            const { text } = await generateText({
                model: openai('gpt-4o-mini'),
                system: params.systemPrompt,
                prompt: params.userPrompt,
                temperature: params.temperature ?? 0.7,
                maxOutputTokens: 1800,
            })
            if (text) {
                return {
                    ok: true,
                    text,
                    provider: 'openai-sdk',
                    latencyMs: Date.now() - started,
                }
            }
            attempts.push('openai-sdk: empty')
        } catch (e: any) {
            attempts.push(`openai-sdk: ${e?.message || 'error'}`)
        }
    }

    const anyConfigured =
        configured.groq || configured.openrouter || configured.openai || configured.gemini || configured.huggingface

    return {
        ok: false,
        provider: 'none',
        attempts: attempts.slice(0, 12),
        configured,
        error: anyConfigured
            ? 'All AI providers failed. Check attempts[] and Cloudflare Function logs.'
            : 'No AI keys visible to this Function. Bind GROQ_API_KEYS, OPENROUTER_API_KEY, GEMINI_API_KEYS, and/or HUGGINGFACE_API_KEY on Cloudflare Pages Production.',
        latencyMs: Date.now() - started,
    }
}

export async function streamWithGateway(params: {
    systemPrompt: string
    userPrompt: string
    history?: GatewayMessage[]
    taskType?: TaskType
    temperature?: number
    botName?: string
    env?: EnvStore
    thinkingDepth?: ThinkingDepth
    skipFamilies?: ProviderFamily[]
}): Promise<StreamResult | GenerateFailure> {
    const started = Date.now()
    const runtimeEnv = params.env ?? getRuntimeEnv()
    const deadline = started + GATEWAY_TOTAL_TIMEOUT_MS
    const attempts: string[] = []
    const configured = getProviderKeyFlags(runtimeEnv)

    const systemPrompt = params.systemPrompt.slice(0, MAX_SYSTEM_PROMPT_CHARS)
    const userPrompt = params.userPrompt.slice(0, MAX_USER_PROMPT_CHARS)

    const groqRaw = envFrom(runtimeEnv, 'GROQ_API_KEYS', 'GROQ_API_KEY', 'GROQ_KEYS', 'GROQ_KEY')
    const groqModel = envFrom(runtimeEnv, 'GROQ_MODEL', 'GROQ_PRIMARY_MODEL', 'QWEN_MODEL') || 'qwen/qwen3.6-27b'
    const openRouterKey = envFrom(runtimeEnv, 'OPENROUTER_API_KEY', 'OPEN_ROUTER_API_KEY', 'OPENROUTER_KEY')
    const hfRaw = envFrom(runtimeEnv, 'HUGGINGFACE_API_KEYS', 'HUGGINGFACE_API_KEY', 'HF_API_KEY', 'HF_TOKEN')
    const geminiRaw = envFrom(
        runtimeEnv,
        'GEMINI_API_KEYS',
        'GEMINI_API_KEY',
        'GEMINI_KEYS',
        'GEMINI_KEY',
        'GOOGLE_GENERATIVE_AI_API_KEY',
        'GOOGLE_API_KEY',
        'GOOGLE_AI_API_KEY',
        'GOOGLE_GEMINI_API_KEY',
    )

    const groqKeys = splitKeys(groqRaw)
    const hfKeys = splitKeys(hfRaw)
    const geminiKeys = splitKeys(geminiRaw)
    const openRouterModel =
        envFrom(runtimeEnv, 'OPENROUTER_MODEL') || TASK_OPENROUTER[params.taskType || 'community_reply'] || OPENROUTER_MODELS[0]

    const familyParams: FamilyParams = {
        systemPrompt,
        userPrompt,
        history: params.history,
        temperature: params.temperature,
        deadline,
        thinkingDepth: params.thinkingDepth,
    }

    for (const family of getFamilyOrder(params.skipFamilies)) {
        if (Date.now() >= deadline) {
            attempts.push(`gateway: total timeout after ${GATEWAY_TOTAL_TIMEOUT_MS}ms`)
            break
        }

        if (family === 'groq' && groqKeys.length > 0) {
            let sawRateLimit = false
            const groqModels = groqModel === 'llama-3.3-70b-versatile'
                ? [groqModel]
                : [groqModel, 'llama-3.3-70b-versatile']
            groqLoop:
            for (const model of groqModels) {
                for (const key of groqKeys) {
                    if (Date.now() >= deadline) break
                    const r = await chatCompletionsStream(
                        'https://api.groq.com/openai/v1/chat/completions',
                        key,
                        model,
                        systemPrompt,
                        userPrompt,
                        params.temperature,
                        {},
                        deadline,
                        params.history,
                        params.thinkingDepth,
                    )
                    if (r.ok) {
                        if (usesNativeQwenReasoning(params.thinkingDepth) && isQwen36(model)) {
                            markFamilyCooling('groq', HEAVY_THINKING_COOLDOWN_MS)
                        }
                        return { ok: true, provider: 'groq', stream: r.stream, attempts, configured }
                    }
                    if (isRateLimitDetail(r.detail)) sawRateLimit = true
                    attempts.push(`groq(${model}): ${r.detail}`)
                    if (isRequestTooLarge(r.detail)) break groqLoop
                }
            }
            if (sawRateLimit) markFamilyCooling('groq')
            continue
        }

        if (family === 'gemini' && geminiKeys.length > 0) {
            // Gemini has no token stream in this gateway; use the same generate family so
            // a configured Gemini key is not skipped during streaming chat.
            const result = await tryGeminiFamily(geminiKeys, familyParams, attempts)
            if (result) {
                const text = result.text
                const oneShot = async function* (): AsyncIterableIterator<string> {
                    yield text
                }
                return { ok: true, provider: result.provider, stream: oneShot(), attempts, configured }
            }
            continue
        }

        if (family === 'huggingface' && hfKeys.length > 0) {
            let sawRateLimit = false
            for (const key of hfKeys) {
                if (Date.now() >= deadline) break
                const r = await chatCompletionsStream(
                    'https://router.huggingface.co/v1/chat/completions',
                    key,
                    HUGGINGFACE_MODEL,
                    systemPrompt,
                    userPrompt,
                    params.temperature,
                    {},
                    deadline,
                    params.history,
                    params.thinkingDepth,
                )
                if (r.ok) return { ok: true, provider: 'huggingface', stream: r.stream, attempts, configured }
                if (isRateLimitDetail(r.detail)) sawRateLimit = true
                attempts.push(`huggingface: ${r.detail}`)
            }
            if (sawRateLimit) markFamilyCooling('huggingface')
            continue
        }

        if (family === 'openrouter' && openRouterKey) {
            let sawRateLimit = false
            const r = await chatCompletionsStream(
                'https://openrouter.ai/api/v1/chat/completions',
                openRouterKey,
                openRouterModel,
                systemPrompt,
                userPrompt,
                params.temperature,
                {
                    'HTTP-Referer':
                        envFrom(runtimeEnv, 'NEXT_PUBLIC_SITE_URL') || 'https://worldinmaking.com',
                    'X-Title': 'WorldInMaking Philosopher Bots',
                },
                deadline,
                params.history,
                params.thinkingDepth,
            )
            if (r.ok) return { ok: true, provider: 'openrouter', stream: r.stream, attempts, configured }
            if (isRateLimitDetail(r.detail)) sawRateLimit = true
            attempts.push(`openrouter: ${r.detail}`)
            if (sawRateLimit) markFamilyCooling('openrouter')
        }
    }

    return {
        ok: false,
        provider: 'none',
        attempts,
        configured,
        error: 'All streaming providers failed.',
        latencyMs: Date.now() - started,
    }
}
