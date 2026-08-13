/**
 * Edge-safe multi-provider AI gateway (plain fetch only).
 * Used by chat, /api/bots/act, and future forum/paper workers.
 */
import type { TaskType } from 'lib/persona-engine'
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
    configured: Record<GatewayProvider, boolean>
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
const MAX_SYSTEM_PROMPT_CHARS = 30_000
const MAX_USER_PROMPT_CHARS = 16_000

function isFamilyCooling(name: string): boolean {
    const coolUntil = PROVIDER_COOLDOWNS.get(name)
    if (!coolUntil) return false
    if (Date.now() > coolUntil) {
        PROVIDER_COOLDOWNS.delete(name)
        return false
    }
    return true
}

function markFamilyCooling(name: string): void {
    PROVIDER_COOLDOWNS.set(name, Date.now() + COOLDOWN_MS)
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
type ProviderFamily = (typeof PROVIDER_FAMILY_ORDER)[number]

/** Consistent per-bot starting offset — same roster/hashing scheme used across the app. */
const BOT_ROTATION_INDEX: Record<string, number> = {
    marx: 0, nietzsche: 1, deleuze: 2, sartre: 3,
    spinoza: 0, althusser: 1, heidegger: 2, hegel: 3,
    baudrillard: 0, weber: 1, adorno: 2, zizek: 3,
    derrida: 0, lenin: 1, arendt: 2, rand: 3,
}

/**
 * Orders provider families for this request. Spreads bots across families via a
 * consistent per-bot offset (so a burst of simultaneous requests, e.g. a cron-triggered
 * round of forum replies across 16 bots, doesn't all hammer Groq first) and pushes any
 * currently-cooling family to the end instead of skipping it entirely.
 */
function getFamilyOrder(botName?: string): ProviderFamily[] {
    const name = (botName || '').toLowerCase().trim()
    const offset = name
        ? BOT_ROTATION_INDEX[name] ?? (name.charCodeAt(0) % PROVIDER_FAMILY_ORDER.length)
        : 0
    const rotated: ProviderFamily[] = []
    for (let i = 0; i < PROVIDER_FAMILY_ORDER.length; i++) {
        rotated.push(PROVIDER_FAMILY_ORDER[(offset + i) % PROVIDER_FAMILY_ORDER.length])
    }
    const active = rotated.filter((f) => !isFamilyCooling(f))
    const cooling = rotated.filter((f) => isFamilyCooling(f))
    return [...active, ...cooling]
}

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


async function chatCompletionsStream(
    url: string,
    apiKey: string,
    model: string,
    systemPrompt: string,
    userPrompt: string,
    temperature?: number,
    extraHeaders: Record<string, string> = {},
    deadline?: number,
): Promise<{ ok: true; stream: AsyncIterableIterator<string> } | { ok: false; detail: string }> {
    try {
        const timeoutMs = deadline
            ? Math.max(1, Math.min(PROVIDER_REQUEST_TIMEOUT_MS, deadline - Date.now()))
            : PROVIDER_REQUEST_TIMEOUT_MS

        const fetchRes = await fetchWithTimeout(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                ...extraHeaders,
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                temperature: temperature ?? 0.7,
                max_tokens: 1800,
                stream: true
            }),
        }, timeoutMs)

        if (!fetchRes.ok) {
            const raw = await fetchRes.text()
            return { ok: false, detail: `${fetchRes.status} ${raw.slice(0, 200)}` }
        }

        if (!fetchRes.body) {
            return { ok: false, detail: 'No response body' }
        }

        async function* streamGenerator(): AsyncIterableIterator<string> {
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
                                
                                if (delta?.reasoning_content) {
                                    if (!hasStartedReasoning) {
                                        hasStartedReasoning = true
                                        yield '<think>'
                                    }
                                    yield delta.reasoning_content
                                } else if (delta?.content) {
                                    if (hasStartedReasoning && !hasFinishedReasoning) {
                                        hasFinishedReasoning = true
                                        yield '</think>'
                                    }
                                    yield delta.content
                                }
                            } catch {
                                // Ignore parse errors in stream
                            }
                        }
                    }
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
): Promise<{ ok: true; text: string } | { ok: false; detail: string }> {
    try {
        const timeoutMs = deadline
            ? Math.max(1, Math.min(PROVIDER_REQUEST_TIMEOUT_MS, deadline - Date.now()))
            : PROVIDER_REQUEST_TIMEOUT_MS
        const fetchRes = await fetchWithTimeout(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                ...extraHeaders,
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                temperature: temperature ?? 0.7,
                max_tokens: 1800,
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
        const message = data?.choices?.[0]?.message
        const visibleContent = message?.content
        const nativeReasoning = message?.reasoning_content || message?.reasoning
        const text = nativeReasoning && typeof nativeReasoning === 'string' && !String(visibleContent || '').includes('<think>')
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
                contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
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

/** Groq — rotate through all configured keys, first success wins. */
async function tryGroqFamily(
    groqKeys: string[],
    model: string,
    params: { systemPrompt: string; userPrompt: string; temperature?: number; deadline: number },
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
    }
    if (groqKeys.length > 0 && sawRateLimit) markFamilyCooling('groq')
    return null
}

/** OpenRouter — skip remaining models immediately on 402 (no credits). */
async function tryOpenRouterFamily(
    openRouterKey: string,
    taskType: TaskType,
    runtimeEnv: EnvStore,
    params: { systemPrompt: string; userPrompt: string; temperature?: number; deadline: number },
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
    params: { systemPrompt: string; userPrompt: string; temperature?: number; deadline: number },
    attempts: string[]
): Promise<FamilySuccess | null> {
    let sawRateLimit = false
    for (const key of geminiKeys) {
        if (Date.now() >= params.deadline) return null
        const keyIdx = geminiKeys.indexOf(key) + 1
        for (const model of GEMINI_MODELS) {
            if (Date.now() >= params.deadline) return null
            const r = await withRetry(
                () => geminiGenerate(key, model, params.systemPrompt, params.userPrompt, params.temperature, params.deadline),
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
    params: { systemPrompt: string; userPrompt: string; temperature?: number; deadline: number },
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
 * Family order (Groq / OpenRouter / Gemini / HuggingFace) rotates per bot name so a burst
 * of simultaneous requests doesn't all hammer the same provider first; OpenAI SDK is an
 * always-last bonus provider outside the rotation (rarely configured).
 */
export async function generateWithGateway(params: {
    systemPrompt: string
    userPrompt: string
    taskType?: TaskType
    temperature?: number
    /** Optional bot/persona name — used purely to pick a starting provider offset. */
    botName?: string
    env?: EnvStore
}): Promise<GenerateResult | GenerateFailure> {
    const started = Date.now()
    const runtimeEnv = params.env ?? getRuntimeEnv()
    const taskType = params.taskType ?? 'community_reply'
    const deadline = started + GATEWAY_TOTAL_TIMEOUT_MS
    const familyParams = { ...params, deadline }
    const attempts: string[] = []
    const configured = getProviderKeyFlags(runtimeEnv)

    if (params.systemPrompt.length > MAX_SYSTEM_PROMPT_CHARS || params.userPrompt.length > MAX_USER_PROMPT_CHARS) {
        return {
            ok: false,
            provider: 'none',
            attempts: [],
            configured,
            error: `Prompt too large (system max ${MAX_SYSTEM_PROMPT_CHARS}, user max ${MAX_USER_PROMPT_CHARS} characters).`,
            latencyMs: Date.now() - started,
        }
    }

    // Support all common CF Dashboard naming conventions for key sets
    const groqRaw = envFrom(
        runtimeEnv,
        'GROQ_API_KEYS',   // CF Dashboard exact name (comma-separated)
        'GROQ_API_KEY',
        'GROQ_KEYS',
        'GROQ_KEY',
    )
    const groqModel = envFrom(runtimeEnv, 'GROQ_MODEL', 'GROQ_PRIMARY_MODEL', 'QWEN_MODEL') || 'llama-3.3-70b-versatile'
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

    for (const family of getFamilyOrder(params.botName)) {
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
    taskType?: TaskType
    temperature?: number
    botName?: string
    env?: EnvStore
}): Promise<StreamResult | GenerateFailure> {
    const started = Date.now()
    const runtimeEnv = params.env ?? getRuntimeEnv()
    const deadline = started + GATEWAY_TOTAL_TIMEOUT_MS
    const attempts: string[] = []
    const configured = getProviderKeyFlags(runtimeEnv)

    if (params.systemPrompt.length > MAX_SYSTEM_PROMPT_CHARS || params.userPrompt.length > MAX_USER_PROMPT_CHARS) {
        return {
            ok: false,
            provider: 'none',
            attempts: [],
            configured,
            error: `Prompt too large.`,
            latencyMs: Date.now() - started,
        }
    }

    const groqRaw = envFrom(runtimeEnv, 'GROQ_API_KEYS', 'GROQ_API_KEY')
    const groqModel = envFrom(runtimeEnv, 'GROQ_MODEL', 'QWEN_MODEL') || 'llama-3.3-70b-versatile'
    const openRouterKey = envFrom(runtimeEnv, 'OPENROUTER_API_KEY')

    const openRouterKeys = splitKeys(openRouterKey)
    const groqKeys = splitKeys(groqRaw)

    // 1. Try Groq Streaming
    if (groqKeys.length > 0 && !isFamilyCooling('groq')) {
        let sawRateLimit = false
        for (const key of groqKeys) {
            if (Date.now() >= deadline) break
            const r = await chatCompletionsStream(
                'https://api.groq.com/openai/v1/chat/completions',
                key,
                groqModel,
                params.systemPrompt,
                params.userPrompt,
                params.temperature,
                {},
                deadline,
            )
            if (r.ok) return { ok: true, provider: 'groq', stream: r.stream, attempts, configured }
            if (isRateLimitDetail(r.detail)) sawRateLimit = true
            attempts.push(`groq: ${r.detail}`)
        }
        if (sawRateLimit) markFamilyCooling('groq')
    }

    // 2. Try OpenRouter Streaming
    if (openRouterKeys.length > 0 && !isFamilyCooling('openrouter')) {
        let sawRateLimit = false
        for (const key of openRouterKeys) {
            if (Date.now() >= deadline) break
            const r = await chatCompletionsStream(
                'https://openrouter.ai/api/v1/chat/completions',
                key,
                'qwen/qwen-2.5-72b-instruct',
                params.systemPrompt,
                params.userPrompt,
                params.temperature,
                {
                    'HTTP-Referer': 'https://worldinmaking.com',
                    'X-Title': 'Ask AI',
                },
                deadline,
            )
            if (r.ok) return { ok: true, provider: 'openrouter', stream: r.stream, attempts, configured }
            if (isRateLimitDetail(r.detail)) sawRateLimit = true
            attempts.push(`openrouter: ${r.detail}`)
        }
        if (sawRateLimit) markFamilyCooling('openrouter')
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
