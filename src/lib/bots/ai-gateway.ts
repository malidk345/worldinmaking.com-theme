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

export type GatewayProvider =
    | 'groq'
    | 'openrouter'
    | `openrouter:${string}`
    | `gemini-fetch:${string}`
    | 'openai-sdk'
    | 'none'

export interface GenerateResult {
    ok: true
    text: string
    provider: GatewayProvider
    latencyMs: number
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

/** Task → preferred OpenRouter model (when OPENROUTER_MODEL not set). */
const TASK_OPENROUTER: Partial<Record<TaskType, string>> = {
    synthesis: 'meta-llama/llama-3.3-70b-instruct',
    paper_section: 'meta-llama/llama-3.3-70b-instruct',
    third_voice: 'meta-llama/llama-3.3-70b-instruct',
    community_reply: 'meta-llama/llama-3.1-8b-instruct',
    thread_init: 'meta-llama/llama-3.1-8b-instruct',
}

async function chatCompletions(
    url: string,
    apiKey: string,
    model: string,
    systemPrompt: string,
    userPrompt: string,
    extraHeaders: Record<string, string> = {}
): Promise<{ ok: true; text: string } | { ok: false; detail: string }> {
    try {
        const fetchRes = await fetch(url, {
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
                temperature: 0.7,
            }),
        })
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
        const text = data?.choices?.[0]?.message?.content
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
    userPrompt: string
): Promise<{ ok: true; text: string } | { ok: false; detail: string }> {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
        const fetchRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
                generationConfig: { temperature: 0.7 },
            }),
        })
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

/**
 * Run system+user prompts through available providers (Groq → OpenRouter → Gemini → OpenAI SDK).
 */
export async function generateWithGateway(params: {
    systemPrompt: string
    userPrompt: string
    taskType?: TaskType
    env?: EnvStore
}): Promise<GenerateResult | GenerateFailure> {
    const started = Date.now()
    const runtimeEnv = params.env ?? getRuntimeEnv()
    const taskType = params.taskType ?? 'community_reply'
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
    // All keys as arrays — failover through each one
    const groqKeys = splitKeys(groqRaw)   // e.g. ['gsk_aaa', 'gsk_bbb', 'gsk_ccc']
    const geminiKeys = splitKeys(geminiRaw) // e.g. ['AIza...1', 'AIza...2']

    // 1) Groq — rotate through all keys, first success wins
    for (const key of groqKeys) {
        const r = await chatCompletions(
            'https://api.groq.com/openai/v1/chat/completions',
            key,
            'llama-3.3-70b-versatile',
            params.systemPrompt,
            params.userPrompt
        )
        if (r.ok) {
            return {
                ok: true,
                text: r.text,
                provider: 'groq',
                latencyMs: Date.now() - started,
            }
        }
        attempts.push(`groq[${groqKeys.indexOf(key) + 1}/${groqKeys.length}]: ${r.detail}`)
    }

    // 2) OpenRouter
    if (openRouterKey) {
        const preferred =
            envFrom(runtimeEnv, 'OPENROUTER_MODEL') || TASK_OPENROUTER[taskType] || ''
        const models = [preferred, ...OPENROUTER_MODELS].filter(Boolean)
        const seen = new Set<string>()
        for (const model of models) {
            if (seen.has(model)) continue
            seen.add(model)
            const r = await chatCompletions(
                'https://openrouter.ai/api/v1/chat/completions',
                openRouterKey,
                model,
                params.systemPrompt,
                params.userPrompt,
                {
                    'HTTP-Referer':
                        envFrom(runtimeEnv, 'NEXT_PUBLIC_SITE_URL') || 'https://worldinmaking.com',
                    'X-Title': 'WorldInMaking Philosopher Bots',
                }
            )
            if (r.ok) {
                return {
                    ok: true,
                    text: r.text,
                    provider: `openrouter:${model}`,
                    latencyMs: Date.now() - started,
                }
            }
            attempts.push(`openrouter(${model}): ${r.detail}`)
        }
    }

    // 3) Gemini — rotate through all keys × all models, first success wins
    for (const key of geminiKeys) {
        const keyIdx = geminiKeys.indexOf(key) + 1
        for (const model of GEMINI_MODELS) {
            const r = await geminiGenerate(key, model, params.systemPrompt, params.userPrompt)
            if (r.ok) {
                return {
                    ok: true,
                    text: r.text,
                    provider: `gemini-fetch:${model}`,
                    latencyMs: Date.now() - started,
                }
            }
            attempts.push(`gemini[${keyIdx}/${geminiKeys.length}](${model}): ${r.detail}`)
        }
    }

    // 4) OpenAI via AI SDK (optional)
    if (openaiKey) {
        try {
            const { createOpenAI } = await import('@ai-sdk/openai')
            const { generateText } = await import('ai')
            const openai = createOpenAI({ apiKey: openaiKey })
            const { text } = await generateText({
                model: openai('gpt-4o-mini'),
                system: params.systemPrompt,
                prompt: params.userPrompt,
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
        configured.groq || configured.openrouter || configured.openai || configured.gemini

    return {
        ok: false,
        provider: 'none',
        attempts: attempts.slice(0, 12),
        configured,
        error: anyConfigured
            ? 'All AI providers failed. Check attempts[] and Cloudflare Function logs.'
            : 'No AI keys visible to this Function. Bind GROQ_API_KEY, OPENROUTER_API_KEY, GEMINI_API_KEY, and/or OPENAI_API_KEY on Cloudflare Pages Production.',
        latencyMs: Date.now() - started,
    }
}
