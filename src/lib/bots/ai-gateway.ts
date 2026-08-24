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
    readFamilyBindingValues,
} from './runtime-env'
import { collectApiKeys, rotateKeys } from './search-keys'
import { nextFamilyKeyStart, resetFamilyKeyCursor, setFamilyKeyStart } from './groq-key-cursor'

export const GATEWAY_TOTAL_TIMEOUT_MS = 28_000
export const FAILOVER_RESERVE_MS = 9_000

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
    | `gemini-fetch:${string}`
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
    user: 12_000,
    turns: 12,
    turnChars: 2_000,
}

const GEMINI_PROMPT_CAPS: PromptCaps = {
    system: 8_000,
    user: 20_000,
    turns: 16,
    turnChars: 2_500,
}

function buildCompletionMessages(
    systemPrompt: string,
    userPrompt: string,
    history?: GatewayMessage[],
    caps: PromptCaps = DEFAULT_PROMPT_CAPS,
): GatewayMessage[] {
    const messages: GatewayMessage[] = [{
        role: 'system',
        content: trimSystemKeepThinking(systemPrompt, caps.system),
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

const GEMINI_MODELS = [
    'gemini-3.1-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.6-flash',
] as const
const MAX_SYSTEM_PROMPT_CHARS = 8_000
const MAX_USER_PROMPT_CHARS = 24_000
const DEFAULT_MAX_TOKENS = 4096
/** Groq on_demand qwen/qwen3.6-27b: 8K TPM. Request size = input + max_tokens. */
export const GROQ_TPM_LIMIT = 8_000
const GROQ_TPM_SAFETY = 500
const MIN_GROQ_COMPLETION_TOKENS = 256
const HEAVY_THINKING_COOLDOWN_MS = 25_000

export function isRequestTooLarge(detail: string): boolean {
    const d = detail.toLowerCase()
    // 429 TPM/TPD is per-account quota — other Groq keys must still be tried.
    if (d.startsWith('429')) return false
    return d.startsWith('413') || d.includes('request too large')
}

function isQwen36(model: string): boolean {
    return /qwen3\.6|qwen\/qwen3\.6/i.test(model)
}

export function usesGeminiNativeThinking(_model: string, _depth?: ThinkingDepth): boolean {
    return false
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

function groqPromptCaps(_thinking: boolean, compact: boolean): PromptCaps {
    if (compact) {
        return { system: 3_200, user: 2_400, turns: 4, turnChars: 500 }
    }
    return { system: 3_600, user: 3_200, turns: 5, turnChars: 700 }
}

function wantedGroqMaxTokens(_model: string, _thinking: boolean, compact: boolean): number {
    return compact ? 1_024 : 2_048
}

function trimKeepEnds(text: string, budget: number): string {
    if (text.length <= budget) return text
    const head = Math.max(400, Math.floor(budget * 0.72))
    const tail = Math.max(120, budget - head - 40)
    return `${text.slice(0, head)}\n…\n${text.slice(-tail)}`
}

/** Keep the thinking-process block; shrink the earlier system text. */
export function trimSystemKeepThinking(text: string, budget: number): string {
    if (text.length <= budget) return text
    const mark = 'THINKING PROCESS'
    const at = text.lastIndexOf(mark)
    if (at < 0) return trimKeepEnds(text, budget)
    const thinking = text.slice(at)
    const headBudget = Math.max(500, budget - thinking.length - 8)
    return `${trimKeepEnds(text.slice(0, at).trim(), headBudget)}\n\n${thinking}`
}

/** Keep the live question; shrink only the context block above it. */
export function trimUserKeepQuery(text: string, budget: number): string {
    if (text.length <= budget) return text
    const marker = 'Query / Prompt:'
    const at = text.lastIndexOf(marker)
    if (at < 0) return trimKeepEnds(text, budget)
    const query = text.slice(at)
    const contextBudget = Math.max(200, budget - query.length)
    return `${trimKeepEnds(text.slice(0, at).trim(), contextBudget)}\n\n${query}`
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
        if (system && system.content.length > 1_800) {
            system.content = trimSystemKeepThinking(system.content, Math.floor(system.content.length * 0.8))
            continue
        }
        const user = fitted[fitted.length - 1]
        if (user && user.content.length > 900) {
            user.content = trimUserKeepQuery(user.content, Math.floor(user.content.length * 0.8))
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
    const rawMessages = buildCompletionMessages(options.systemPrompt, options.userPrompt, options.history, caps)
    const rawPromptTokens = estimateMessagesTokens(rawMessages)

    // Pre-flight check: If raw prompt alone exceeds 6,500 tokens (~22k chars),
    // Groq's 8k TPM cap cannot fit the prompt + completion without severe context destruction.
    // Skip Groq cleanly so Gemini takes over with its 1M+ context window.
    if (rawPromptTokens > 6_500) {
        return {
            messages: rawMessages,
            maxTokens: wanted,
            promptTokens: rawPromptTokens,
            skip: true,
        }
    }

    let messages = shrinkMessagesForTpm(rawMessages, Math.min(wanted, 768))
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
 * Medium/balanced and extended/deep request it so ThinkingBlock always has a live trace.
 */
function providerBodyExtras(model: string, thinkingDepth?: ThinkingDepth): Record<string, unknown> {
    if (!isQwen36(model)) return {}
    if (!usesNativeQwenReasoning(thinkingDepth)) {
        return { reasoning_effort: 'none' }
    }
    // raw keeps CoT inside <think> in content so ThinkingStreamDemux sees it.
    // Groq's default include_reasoning=true puts it on delta.reasoning instead,
    // which often never reaches the ticker.
    return { reasoning_effort: 'default', reasoning_format: 'raw' }
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

/**
 * Merge a provider delta into tagged text the demux can split.
 * Never emit raw `reasoning` as public content — that is the main leak path.
 */
export type ReasoningWrapState = {
    opened: boolean
    closed: boolean
}

const THINK_TAG_HINT = /<\/?think(?:ing)?\b/i

export function wrapReasoningContentChunk(
    state: ReasoningWrapState,
    reasoning: string,
    content: string
): string[] {
    const out: string[] = []
    const contentHasThinkTags = THINK_TAG_HINT.test(content)

    // If this content chunk already carries <think>, skip the parallel
    // reasoning field so we do not dump an unwrapped CoT into public.
    if (reasoning && !contentHasThinkTags) {
        if (!state.opened) {
            state.opened = true
            out.push('<think>')
        }
        out.push(reasoning)
    }

    if (content) {
        if (state.opened && !state.closed) {
            if (contentHasThinkTags || content.trim()) {
                state.closed = true
                out.push('</think>')
            }
        }
        out.push(content)
    }

    return out
}

export function closeReasoningWrap(state: ReasoningWrapState): string[] {
    if (state.opened && !state.closed) {
        state.closed = true
        return ['</think>']
    }
    return []
}

export function extractGeminiThoughtAndText(payload: unknown): { thought: string; text: string } {
    if (!payload || typeof payload !== 'object') return { thought: '', text: '' }
    const parts = (payload as { candidates?: Array<{ content?: { parts?: unknown } }> }).candidates?.[0]
        ?.content?.parts
    if (!Array.isArray(parts)) return { thought: '', text: '' }
    let thought = ''
    let text = ''
    for (const part of parts) {
        if (!part || typeof part !== 'object') continue
        const piece = part as { text?: unknown; thought?: unknown }
        const value = typeof piece.text === 'string' ? piece.text : ''
        if (!value) continue
        if (piece.thought === true) thought += value
        else text += value
    }
    return { thought, text }
}

export function mergeGeminiThoughtText(thought: string, text: string): string {
    if (thought && !THINK_TAG_HINT.test(text)) return `<think>${thought}</think>${text}`
    return text || (thought ? `<think>${thought}</think>` : '')
}

function geminiGenerationConfig(model: string, thinkingDepth?: ThinkingDepth, temperature?: number) {
    const thinking = usesGeminiNativeThinking(model, thinkingDepth)
    const config: Record<string, unknown> = {
        temperature: temperature ?? 0.7,
        maxOutputTokens: thinking ? 4096 : 1800,
    }
    if (thinking) {
        config.thinkingConfig = {
            thinkingBudget: thinkingDepth === 'deep' ? 2048 : 1024,
            includeThoughts: true,
        }
    }
    return config
}

const GEMINI_REQUEST_TIMEOUT_MS = 10_000

function geminiRequestTimeoutMs(model: string, thinkingDepth?: ThinkingDepth, deadline?: number): number {
    const desired = usesGeminiNativeThinking(model, thinkingDepth) ? 14_000 : GEMINI_REQUEST_TIMEOUT_MS
    if (!deadline) return desired
    return Math.max(1, Math.min(desired, deadline - Date.now()))
}

function isGeminiThinkingUnsupported(detail: string): boolean {
    const d = detail.toLowerCase()
    return d.includes('thinkingconfig') || d.includes('thinking_config') || d.includes('includethoughts')
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
        return usesNativeQwenReasoning(thinkingDepth) ? 4096 : 3072
    }
    if (/gemini/i.test(model)) {
        return 8192
    }
    return DEFAULT_MAX_TOKENS
}

function resolveRequestTimeoutMs(model: string, deadline?: number): number {
    const desired = isQwen36(model) ? 25_000 : PROVIDER_REQUEST_TIMEOUT_MS
    if (!deadline) return desired
    return Math.max(1, Math.min(desired, deadline - Date.now()))
}

const PROVIDER_COOLDOWNS = new Map<string, number>()
const COOLDOWN_MS = 60_000
const PROVIDER_REQUEST_TIMEOUT_MS = 18_000

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

function isAuthDetail(detail: string): boolean {
    const d = detail.toLowerCase()
    return (
        d.startsWith('401') ||
        d.startsWith('403') ||
        d.includes('invalid_api_key') ||
        d.includes('unauthorized') ||
        d.includes('forbidden')
    )
}

const PRIMARY_FAMILIES = ['groq', 'gemini'] as const
export type ProviderFamily = (typeof PRIMARY_FAMILIES)[number]

/** Alternate Groq/Gemini as the lead. Key rotation inside each family is separate. */
export function getFamilyOrder(skipFamilies: ProviderFamily[] = [], start = 0): ProviderFamily[] {
    const skip = new Set(skipFamilies)
    const ordered = rotateKeys(
        [...PRIMARY_FAMILIES],
        ((start % PRIMARY_FAMILIES.length) + PRIMARY_FAMILIES.length) % PRIMARY_FAMILIES.length,
    ).filter((family): family is ProviderFamily => !skip.has(family as ProviderFamily))
    const active = ordered.filter((family) => !isFamilyCooling(family))
    const cooling = ordered.filter((family) => isFamilyCooling(family))
    return [...active, ...cooling]
}

export function nextPrimaryFamilyStart(): number {
    return nextFamilyKeyStart('primary', PRIMARY_FAMILIES.length)
}

/** Next user turn starts on this family (used after the current family fails). */
export function preferPrimaryFamily(family: ProviderFamily): void {
    const index = PRIMARY_FAMILIES.indexOf(family)
    if (index < 0) return
    setFamilyKeyStart('primary', index)
}

export function resetProviderCooldowns(): void {
    PROVIDER_COOLDOWNS.clear()
    KEY_COOLDOWNS.clear()
    resetFamilyKeyCursor()
}

export { markFamilyCooling, markGroqKeyCooling, markFamilyKeyCooling, resetKeyCooldownStreak }

const KEY_COOLDOWNS = new Map<string, number>()
const KEY_FAILURE_STREAKS = new Map<string, number>()
const RATE_LIMIT_KEY_COOLDOWN_MS = HEAVY_THINKING_COOLDOWN_MS
const AUTH_KEY_COOLDOWN_MS = 30 * 60 * 1000

function keyId(key: string): string {
    return key.slice(-10)
}

function cooldownSlot(family: string, key: string): string {
    return `${family}:${keyId(key)}`
}

export function isFamilyKeyCooling(family: string, key: string): boolean {
    const slot = cooldownSlot(family, key)
    const until = KEY_COOLDOWNS.get(slot)
    if (!until) return false
    if (Date.now() > until) {
        KEY_COOLDOWNS.delete(slot)
        return false
    }
    return true
}

export function calculateExponentialCooldownWithJitter(family: string, key: string, baseMs: number, maxMs = 5 * 60 * 1000): number {
    const slot = cooldownSlot(family, key)
    const streak = (KEY_FAILURE_STREAKS.get(slot) || 0) + 1
    KEY_FAILURE_STREAKS.set(slot, streak)
    const jitter = Math.floor(Math.random() * 1000)
    const backoff = Math.min(maxMs, baseMs * Math.pow(1.8, streak - 1)) + jitter
    return backoff
}

function resetKeyCooldownStreak(family: string, key: string): void {
    const slot = cooldownSlot(family, key)
    KEY_FAILURE_STREAKS.delete(slot)
    KEY_COOLDOWNS.delete(slot)
}

function markFamilyKeyCooling(family: string, key: string, ms = RATE_LIMIT_KEY_COOLDOWN_MS, useExponential = true): void {
    const effectiveMs = useExponential ? calculateExponentialCooldownWithJitter(family, key, ms) : ms
    KEY_COOLDOWNS.set(cooldownSlot(family, key), Date.now() + effectiveMs)
}

export function isGroqKeyCooling(key: string): boolean {
    return isFamilyKeyCooling('groq', key)
}

function markGroqKeyCooling(key: string, ms = HEAVY_THINKING_COOLDOWN_MS, useExponential = true): void {
    markFamilyKeyCooling('groq', key, ms, useExponential)
}



function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

function backoffWithJitter(attempt: number, baseMs = 180, maxMs = 1200): Promise<void> {
    const exp = Math.min(maxMs, baseMs * Math.pow(1.8, attempt))
    const jitter = Math.random() * (baseMs * 0.5)
    return sleep(Math.floor(exp + jitter))
}

async function fetchWithTimeout(
    input: RequestInfo | URL,
    init: RequestInit,
    timeoutMs = PROVIDER_REQUEST_TIMEOUT_MS
): Promise<Response> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    const onAbort = () => controller.abort()
    if (init?.signal) {
        if (init.signal.aborted) {
            clearTimeout(timer)
            throw new Error('client request aborted')
        }
        init.signal.addEventListener('abort', onAbort, { once: true })
    }

    try {
        return await fetch(input, { ...init, signal: controller.signal })
    } catch (error: any) {
        if (init?.signal?.aborted) throw new Error('client request aborted')
        if (controller.signal.aborted) throw new Error(`provider request timeout after ${timeoutMs}ms`)
        throw error
    } finally {
        clearTimeout(timer)
        if (init?.signal) {
            init.signal.removeEventListener('abort', onAbort)
        }
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
    await backoffWithJitter(0, 200, 600)
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
        messages: buildCompletionMessages(systemPrompt, userPrompt, history, GEMINI_PROMPT_CAPS),
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
            
            const wrapState: ReasoningWrapState = { opened: false, closed: false }

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
                                for (const piece of wrapReasoningContentChunk(wrapState, reasoning, content)) {
                                    yield piece
                                }
                            } catch {
                                // Ignore parse errors in stream
                            }
                        }
                    }
                }
                for (const piece of closeReasoningWrap(wrapState)) {
                    yield piece
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
    thinkingDepth?: ThinkingDepth,
    disableNativeThinking = false,
): Promise<{ ok: true; text: string } | { ok: false; detail: string }> {
    try {
        const timeoutMs = geminiRequestTimeoutMs(model, disableNativeThinking ? 'brief' : thinkingDepth, deadline)
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
        const fetchRes = await fetchWithTimeout(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents: toGeminiContents(userPrompt, history),
                generationConfig: geminiGenerationConfig(
                    model,
                    disableNativeThinking ? 'brief' : thinkingDepth,
                    temperature,
                ),
            }),
        }, timeoutMs)
        const raw = await fetchRes.text()
        if (!fetchRes.ok) {
            const detail = `${fetchRes.status} ${raw.slice(0, 200)}`
            if (!disableNativeThinking && isGeminiThinkingUnsupported(detail)) {
                return geminiGenerate(
                    apiKey,
                    model,
                    systemPrompt,
                    userPrompt,
                    temperature,
                    deadline,
                    history,
                    thinkingDepth,
                    true,
                )
            }
            return { ok: false, detail }
        }
        let data: unknown
        try {
            data = JSON.parse(raw)
        } catch {
            return { ok: false, detail: 'invalid json' }
        }
        const extracted = extractGeminiThoughtAndText(data)
        const text = mergeGeminiThoughtText(extracted.thought, extracted.text)
        if (!text) return { ok: false, detail: 'empty content' }
        return { ok: true, text }
    } catch (e: any) {
        return { ok: false, detail: e?.message || 'fetch error' }
    }
}

async function geminiGenerateStream(
    apiKey: string,
    model: string,
    systemPrompt: string,
    userPrompt: string,
    temperature?: number,
    deadline?: number,
    history?: GatewayMessage[],
    thinkingDepth?: ThinkingDepth,
    disableNativeThinking = false,
): Promise<{ ok: true; stream: AsyncIterableIterator<string> } | { ok: false; detail: string }> {
    try {
        const timeoutMs = geminiRequestTimeoutMs(model, disableNativeThinking ? 'brief' : thinkingDepth, deadline)
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`
        const fetchRes = await fetchWithTimeout(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents: toGeminiContents(userPrompt, history),
                generationConfig: geminiGenerationConfig(
                    model,
                    disableNativeThinking ? 'brief' : thinkingDepth,
                    temperature,
                ),
            }),
        }, timeoutMs)
        if (!fetchRes.ok) {
            const raw = await fetchRes.text()
            const detail = `${fetchRes.status} ${raw.slice(0, 200)}`
            if (!disableNativeThinking && isGeminiThinkingUnsupported(detail)) {
                return geminiGenerateStream(
                    apiKey,
                    model,
                    systemPrompt,
                    userPrompt,
                    temperature,
                    deadline,
                    history,
                    thinkingDepth,
                    true,
                )
            }
            return { ok: false, detail }
        }
        if (!fetchRes.body) return { ok: false, detail: 'empty stream' }

        const reader = fetchRes.body.getReader()
        const streamGenerator = async function* (): AsyncIterableIterator<string> {
            const decoder = new TextDecoder()
            const wrapState: ReasoningWrapState = { opened: false, closed: false }
            let buffer = ''
            try {
                while (true) {
                    const { value, done } = await reader.read()
                    if (done) break
                    buffer += decoder.decode(value, { stream: true })
                    const lines = buffer.split('\n')
                    buffer = lines.pop() || ''
                    for (const line of lines) {
                        const trimmed = line.trim()
                        if (!trimmed.startsWith('data:')) continue
                        const payload = trimmed.slice(5).trim()
                        if (!payload || payload === '[DONE]') continue
                        try {
                            const extracted = extractGeminiThoughtAndText(JSON.parse(payload))
                            for (const piece of wrapReasoningContentChunk(
                                wrapState,
                                extracted.thought,
                                extracted.text,
                            )) {
                                yield piece
                            }
                        } catch {
                            // Ignore parse errors in stream
                        }
                    }
                }
                for (const piece of closeReasoningWrap(wrapState)) {
                    yield piece
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

type FamilySuccess = { ok: true; text: string; provider: GatewayProvider; trace?: 'qwen' }
type FamilyParams = {
    systemPrompt: string
    userPrompt: string
    history?: GatewayMessage[]
    temperature?: number
    deadline: number
    thinkingDepth?: ThinkingDepth
    switchBy?: number
    otherFamilyAvailable?: boolean
}

export function collectGroqKeys(store: EnvStore): string[] {
    const rawValues: Array<string | undefined> = readFamilyBindingValues(store, [
        'GROQ_API_KEY',
        'GROQ_KEY',
    ])
    if (store && typeof store === 'object') {
        for (const [k, v] of Object.entries(store)) {
            if (/^GROQ_?(API_?)?KEY(S|_\d+)?$/i.test(k) || /^GROQ_KEYS?(_\d+)?$/i.test(k)) {
                rawValues.push(v)
            }
        }
    }
    return collectApiKeys(...rawValues)
}

export function collectGeminiKeys(store: EnvStore): string[] {
    const rawValues: Array<string | undefined> = readFamilyBindingValues(store, [
        'GEMINI_API_KEY',
        'GEMINI_KEY',
        'GOOGLE_GENERATIVE_AI_API_KEY',
        'GOOGLE_API_KEY',
        'GOOGLE_AI_API_KEY',
        'GOOGLE_GEMINI_API_KEY',
    ])
    if (store && typeof store === 'object') {
        for (const [k, v] of Object.entries(store)) {
            if (
                /^GEMINI_?(API_?)?KEY(S|_\d+)?$/i.test(k) ||
                /^GOOGLE_?(API_?)?KEY(S|_\d+)?$/i.test(k) ||
                /^GOOGLE_GENERATIVE_AI_API_KEY(S|_\d+)?$/i.test(k) ||
                /^GOOGLE_AI_API_KEY(S|_\d+)?$/i.test(k)
            ) {
                rawValues.push(v)
            }
        }
    }
    return collectApiKeys(...rawValues)
}

/** Sequential: request 1 uses key 1, request 2 uses key 2, then wraps. Hot keys go last. */
export function takeFamilyKeyOrder(family: string, keys: string[], start?: number): string[] {
    if (keys.length <= 1) return keys
    const index = typeof start === 'number' ? start : nextFamilyKeyStart(family, keys.length)
    const rotated = rotateKeys(keys, index)
    const live = rotated.filter((key) => !isFamilyKeyCooling(family, key))
    const cooling = rotated.filter((key) => isFamilyKeyCooling(family, key))
    return live.length > 0 ? [...live, ...cooling] : rotated
}

export function takeGroqKeyOrder(keys: string[], start?: number): string[] {
    return takeFamilyKeyOrder('groq', keys, start)
}

export function takeGeminiKeyOrder(keys: string[], start?: number): string[] {
    return takeFamilyKeyOrder('gemini', keys, start)
}

const GROQ_FALLBACK_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'groq/compound'] as const

/** Groq — rotate through all configured keys. If all fail or rate-limit, failover to Gemini. */
async function tryGroqFamily(
    groqKeys: string[],
    model: string,
    params: FamilyParams,
    attempts: string[]
): Promise<FamilySuccess | null> {
    const modelsToTry = Array.from(new Set([model, ...GROQ_FALLBACK_MODELS].filter(Boolean)))
    for (const key of groqKeys) {
        if (Date.now() >= params.deadline) return null
        for (const curModel of modelsToTry) {
            if (Date.now() >= params.deadline) return null
            const r = await withRetry(() => chatCompletions(
                'https://api.groq.com/openai/v1/chat/completions',
                key,
                curModel,
                params.systemPrompt,
                params.userPrompt,
                params.temperature,
                {},
                params.deadline,
                params.history,
                params.thinkingDepth,
            ), params.deadline)
            if (r.ok) {
                resetKeyCooldownStreak('groq', key)
                console.info('[gateway] groq generate ok', {
                    model: curModel,
                    key: `${groqKeys.indexOf(key) + 1}/${groqKeys.length} …${keyId(key)}`,
                })
                return {
                    ok: true,
                    text: r.text,
                    provider: curModel.toLowerCase().includes('qwen') ? 'groq:qwen' : 'groq:llama',
                    ...(curModel.toLowerCase().includes('qwen') ? { trace: 'qwen' as const } : {}),
                }
            }
            if (isRateLimitDetail(r.detail)) {
                markGroqKeyCooling(key)
                attempts.push(`groq[${groqKeys.indexOf(key) + 1}/${groqKeys.length} …${keyId(key)}](${curModel}): ${r.detail}`)
                break
            }
            if (isAuthDetail(r.detail)) {
                markGroqKeyCooling(key, AUTH_KEY_COOLDOWN_MS, false)
                attempts.push(`groq[${groqKeys.indexOf(key) + 1}/${groqKeys.length} …${keyId(key)}](${curModel}): ${r.detail}`)
                break
            }
            attempts.push(`groq[${groqKeys.indexOf(key) + 1}/${groqKeys.length} …${keyId(key)}](${curModel}): ${r.detail}`)
        }
    }
    if (groqKeys.length > 0 && groqKeys.every((key) => isGroqKeyCooling(key))) {
        markFamilyCooling('groq')
    }
    return null
}

/** Gemini — rotate through all configured keys. If all fail or rate-limit, failover to Groq. */
async function tryGeminiFamily(
    geminiKeys: string[],
    params: FamilyParams,
    attempts: string[]
): Promise<FamilySuccess | null> {
    for (const key of geminiKeys) {
        if (Date.now() >= params.deadline) return null
        const keyIdx = geminiKeys.indexOf(key) + 1
        let skipRestOfKey = false
        for (const model of GEMINI_MODELS) {
            if (Date.now() >= params.deadline) return null
            if (skipRestOfKey) break
            const r = await withRetry(
                () =>
                    geminiGenerate(
                        key,
                        model,
                        params.systemPrompt,
                        params.userPrompt,
                        params.temperature,
                        params.deadline,
                        params.history,
                        params.thinkingDepth,
                    ),
                params.deadline,
            )
            if (r.ok) {
                resetKeyCooldownStreak('gemini', key)
                console.info('[gateway] gemini generate ok', {
                    model,
                    key: `${keyIdx}/${geminiKeys.length} …${keyId(key)}`,
                })
                return { ok: true, text: r.text, provider: `gemini-fetch:${model}` }
            }
            attempts.push(`gemini[${keyIdx}/${geminiKeys.length} …${keyId(key)}](${model}): ${r.detail}`)
            if (isRateLimitDetail(r.detail)) {
                markFamilyKeyCooling('gemini', key)
                skipRestOfKey = true
                continue
            }
            if (isAuthDetail(r.detail)) {
                markFamilyKeyCooling('gemini', key, AUTH_KEY_COOLDOWN_MS, false)
                skipRestOfKey = true
                continue
            }
        }
    }
    if (geminiKeys.length > 0 && geminiKeys.every((key) => isFamilyKeyCooling('gemini', key))) {
        markFamilyCooling('gemini')
    }
    return null
}

/**
 * Run system+user prompts through available providers (Groq ↔ Gemini).
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
    const deadline = started + GATEWAY_TOTAL_TIMEOUT_MS
    const systemPrompt = params.systemPrompt.slice(0, MAX_SYSTEM_PROMPT_CHARS)
    const userPrompt = params.userPrompt.slice(0, MAX_USER_PROMPT_CHARS)
    const familyParams = { ...params, systemPrompt, userPrompt, deadline }
    const attempts: string[] = []
    const configured = getProviderKeyFlags(runtimeEnv)

    const groqKeys = takeGroqKeyOrder(collectGroqKeys(runtimeEnv))
    const groqModel = envFrom(runtimeEnv, 'GROQ_MODEL', 'GROQ_PRIMARY_MODEL', 'QWEN_MODEL') || 'qwen/qwen3.6-27b'
    const geminiKeys = takeGeminiKeyOrder(collectGeminiKeys(runtimeEnv))
    console.info('[gateway] generate rotation', {
        groq: groqKeys.length,
        gemini: geminiKeys.length,
        groqLead: groqKeys[0] ? `…${keyId(groqKeys[0])}` : 'none',
    })
    const familyDeadline = (hasOther: boolean) =>
        hasOther ? Math.min(deadline, started + (GATEWAY_TOTAL_TIMEOUT_MS - FAILOVER_RESERVE_MS)) : deadline

    for (const family of getFamilyOrder(params.skipFamilies, nextPrimaryFamilyStart())) {
        if (Date.now() >= deadline) {
            attempts.push(`gateway: total timeout after ${GATEWAY_TOTAL_TIMEOUT_MS}ms`)
            break
        }
        let result: FamilySuccess | null = null
        if (family === 'groq') {
            result = await tryGroqFamily(groqKeys, groqModel, {
                ...familyParams,
                switchBy: familyDeadline(geminiKeys.length > 0),
                otherFamilyAvailable: geminiKeys.length > 0,
            }, attempts)
            if (!result && geminiKeys.length > 0) preferPrimaryFamily('gemini')
        } else if (family === 'gemini') {
            result = await tryGeminiFamily(geminiKeys, {
                ...familyParams,
                switchBy: familyDeadline(groqKeys.length > 0),
                otherFamilyAvailable: groqKeys.length > 0,
            }, attempts)
            if (!result && groqKeys.length > 0) preferPrimaryFamily('groq')
        }

        if (result) {
            return {
                ok: true,
                text: result.text,
                provider: result.provider,
                latencyMs: Date.now() - started,
                ...(result.trace ? { trace: result.trace } : {}),
            }
        }
    }

    const anyConfigured = configured.groq || configured.gemini

    return {
        ok: false,
        provider: 'none',
        attempts: attempts.slice(0, 12),
        configured,
        error: anyConfigured
            ? 'All AI providers failed. Check attempts[] and Cloudflare Function logs.'
            : 'No AI keys visible to this Function. Bind GROQ_API_KEYS and/or GEMINI_API_KEYS on Cloudflare Pages Production.',
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

    const groqKeys = takeGroqKeyOrder(collectGroqKeys(runtimeEnv))
    const groqModel = envFrom(runtimeEnv, 'GROQ_MODEL', 'GROQ_PRIMARY_MODEL', 'QWEN_MODEL') || 'qwen/qwen3.6-27b'
    const geminiKeys = takeGeminiKeyOrder(collectGeminiKeys(runtimeEnv))
    console.info('[gateway] stream rotation', {
        groq: groqKeys.length,
        gemini: geminiKeys.length,
        groqLead: groqKeys[0] ? `…${keyId(groqKeys[0])}` : 'none',
    })

    for (const family of getFamilyOrder(params.skipFamilies, nextPrimaryFamilyStart())) {
        if (Date.now() >= deadline) {
            attempts.push(`gateway: total timeout after ${GATEWAY_TOTAL_TIMEOUT_MS}ms`)
            break
        }

        if (family === 'groq' && groqKeys.length > 0) {
            for (const key of groqKeys) {
                if (Date.now() >= deadline) break
                const r = await chatCompletionsStream(
                    'https://api.groq.com/openai/v1/chat/completions',
                    key,
                    groqModel,
                    systemPrompt,
                    userPrompt,
                    params.temperature,
                    {},
                    deadline,
                    params.history,
                    params.thinkingDepth,
                )
                if (r.ok) {
                    resetKeyCooldownStreak('groq', key)
                    console.info('[gateway] groq stream ok', {
                        model: groqModel,
                        key: `${groqKeys.indexOf(key) + 1}/${groqKeys.length} …${keyId(key)}`,
                    })
                    return { ok: true, provider: 'groq', stream: r.stream, attempts, configured }
                }
                if (isRateLimitDetail(r.detail)) {
                    markGroqKeyCooling(key)
                } else if (isAuthDetail(r.detail)) {
                    markGroqKeyCooling(key, AUTH_KEY_COOLDOWN_MS)
                }
                attempts.push(`groq(${groqModel})[${groqKeys.indexOf(key) + 1}/${groqKeys.length} …${keyId(key)}]: ${r.detail}`)
            }
            if (groqKeys.length > 0 && groqKeys.every((key) => isGroqKeyCooling(key))) {
                markFamilyCooling('groq')
            }
            if (geminiKeys.length > 0) preferPrimaryFamily('gemini')
            continue
        }

        if (family === 'gemini' && geminiKeys.length > 0) {
            for (const key of geminiKeys) {
                if (Date.now() >= deadline) break
                const keyIdx = geminiKeys.indexOf(key) + 1
                let skipRestOfKey = false
                for (const model of GEMINI_MODELS) {
                    if (Date.now() >= deadline || skipRestOfKey) break
                    const r = await geminiGenerateStream(
                        key,
                        model,
                        systemPrompt,
                        userPrompt,
                        params.temperature,
                        deadline,
                        params.history,
                        params.thinkingDepth,
                    )
                    if (r.ok) {
                        resetKeyCooldownStreak('gemini', key)
                        console.info('[gateway] gemini stream ok', {
                            model,
                            key: `${keyIdx}/${geminiKeys.length} …${keyId(key)}`,
                        })
                        return { ok: true, provider: `gemini-fetch:${model}`, stream: r.stream, attempts, configured }
                    }
                    attempts.push(`gemini[${keyIdx}/${geminiKeys.length} …${keyId(key)}](${model}): ${r.detail}`)
                    if (isRateLimitDetail(r.detail)) {
                        markFamilyKeyCooling('gemini', key)
                        skipRestOfKey = true
                        continue
                    }
                    if (isAuthDetail(r.detail)) {
                        markFamilyKeyCooling('gemini', key, AUTH_KEY_COOLDOWN_MS)
                        skipRestOfKey = true
                    }
                }
            }
            if (geminiKeys.length > 0 && geminiKeys.every((key) => isFamilyKeyCooling('gemini', key))) {
                markFamilyCooling('gemini')
            }
            if (groqKeys.length > 0) preferPrimaryFamily('groq')
            continue
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
