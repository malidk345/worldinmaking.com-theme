/**
 * Philosopher bot chat API (Cloudflare Pages / next-on-pages edge).
 *
 * Cloudflare secrets live on getRequestContext().env — process.env is often empty
 * on Workers. "Vercel AI SDK" is just a library; the host is Cloudflare.
 * Prefer plain fetch (Groq / OpenRouter / Gemini) on Workers.
 */
export const runtime = 'edge'

import { extractPersona, buildPersonaHeader, BotPersona, TaskType } from 'lib/persona-engine'
import { getRequestContext } from '@cloudflare/next-on-pages'

const FORBIDDEN_AI_WORDS = [
    'certainly',
    'of course',
    'absolutely',
    'great question',
    'excellent point',
    'as an ai',
    'i must note',
    'it is worth noting',
    'it is important to note',
    'fascinating',
    "i'd be happy to",
    "i'm here to",
    "let's explore",
    'in conclusion',
    'to summarize',
    'in summary',
    'in essence',
    'needless to say',
    'it goes without saying',
]

function cleanAIOutput(text: string): string {
    if (!text) return ''
    let cleaned = text
    for (const word of FORBIDDEN_AI_WORDS) {
        cleaned = cleaned.replace(new RegExp(`\\b${word}\\b`, 'gi'), '')
    }
    return cleaned.replace(/\n{3,}/g, '\n\n').trim()
}

function parseThoughtAndReply(rawText: string): { thought: string; reply: string } {
    const match = rawText.match(/<thought>([\s\S]*?)<\/thought>/i)
    if (match) {
        return {
            thought: cleanAIOutput(match[1].trim()),
            reply: cleanAIOutput(rawText.replace(/<thought>[\s\S]*?<\/thought>/i, '').trim()),
        }
    }
    return { thought: '', reply: cleanAIOutput(rawText) }
}

/**
 * Merge process.env (local) + Cloudflare request context env (production).
 * Keys already exist in the CF dashboard — this is how the Worker actually sees them.
 * getRequestContext() throws outside a Cloudflare request (e.g. local next dev).
 */
function getRuntimeEnv(): Record<string, string | undefined> {
    const base: Record<string, string | undefined> = {
        ...(process.env as Record<string, string | undefined>),
    }

    try {
        const ctx = getRequestContext()
        if (ctx?.env && typeof ctx.env === 'object') {
            for (const [k, v] of Object.entries(ctx.env)) {
                if (v === undefined || v === null) continue
                if (typeof v === 'string' && v.length > 0) {
                    base[k] = v
                }
            }
        }
    } catch {
        /* local next dev — process.env / .env.local only */
    }

    return base
}

function envFrom(store: Record<string, string | undefined>, ...names: string[]): string {
    for (const name of names) {
        const v = store[name]
        if (v && String(v).trim()) return String(v).trim()
    }
    return ''
}

function splitKeys(raw: string): string[] {
    return raw
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean)
}

function json(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
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

/** Google Generative Language API via plain fetch (Workers-friendly). */
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
        const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join('')
        if (!text) return { ok: false, detail: 'empty content' }
        return { ok: true, text }
    } catch (e: any) {
        return { ok: false, detail: e?.message || 'fetch error' }
    }
}

function successPayload(persona: BotPersona, thought: string, reply: string, provider: string) {
    return {
        success: true,
        philosopher: persona.name,
        epistemicStance: persona.epistemicStance,
        thought,
        reply,
        provider,
        confident: true,
    }
}

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405)
    }

    let body: any = {}
    try {
        body = await req.json()
    } catch {
        body = {}
    }

    const {
        question,
        philosopher = 'Nietzsche',
        mood = 'calm',
        taskType = 'community_reply',
    }: {
        question: string
        philosopher?: string
        mood?: string
        taskType?: TaskType
    } = body

    if (!question || typeof question !== 'string') {
        return json({ error: 'Question string is required', success: false }, 400)
    }

    const runtimeEnv = getRuntimeEnv()
    const persona: BotPersona = extractPersona('', philosopher)
    const systemPrompt = `${buildPersonaHeader(persona, mood)}\n\nIMPORTANT FORMATTING INSTRUCTION:\nFirst, enclose your internal philosophical reasoning & thought process step-by-step inside <thought>...</thought> tags. Describe how your persona evaluates the premises and formulates the argument. Then, provide your final persona response outside the <thought> tags.`
    const userPrompt = `TASK TYPE: ${taskType}\nQUESTION / TOPIC:\n${question}\n\nProvide your response adhering strictly to your epistemic stance, thought process formatting, and style rules.`

    const groqRaw = envFrom(runtimeEnv, 'GROQ_API_KEY', 'GROQ_KEYS', 'GROQ_KEY')
    const openRouterKey = envFrom(runtimeEnv, 'OPENROUTER_API_KEY', 'OPEN_ROUTER_API_KEY')
    const openaiKey = envFrom(runtimeEnv, 'OPENAI_API_KEY')
    const geminiKey = envFrom(
        runtimeEnv,
        'GEMINI_API_KEY',
        'GOOGLE_GENERATIVE_AI_API_KEY',
        'GOOGLE_API_KEY',
        'GOOGLE_AI_API_KEY'
    )

    let cfContext = false
    try {
        getRequestContext()
        cfContext = true
    } catch {
        cfContext = false
    }

    const configured = {
        groq: !!groqRaw,
        openrouter: !!openRouterKey,
        openai: !!openaiKey,
        gemini: !!geminiKey,
        cfContext,
        envSource: cfContext ? 'cloudflare+process' : 'process-only',
    }

    const attempts: string[] = []

    // 1) Groq — primary on Cloudflare (plain fetch)
    for (const key of splitKeys(groqRaw)) {
        const r = await chatCompletions(
            'https://api.groq.com/openai/v1/chat/completions',
            key,
            'llama-3.3-70b-versatile',
            systemPrompt,
            userPrompt
        )
        if (r.ok) {
            const { thought, reply } = parseThoughtAndReply(r.text)
            return json(successPayload(persona, thought, reply, 'groq'))
        }
        attempts.push(`groq: ${r.detail}`)
    }

    // 2) OpenRouter
    if (openRouterKey) {
        const r = await chatCompletions(
            'https://openrouter.ai/api/v1/chat/completions',
            openRouterKey,
            'google/gemini-2.0-flash-001',
            systemPrompt,
            userPrompt,
            {
                'HTTP-Referer':
                    envFrom(runtimeEnv, 'NEXT_PUBLIC_SITE_URL') || 'https://worldinmaking.com',
                'X-Title': 'WorldInMaking Philosopher Bots',
            }
        )
        if (r.ok) {
            const { thought, reply } = parseThoughtAndReply(r.text)
            return json(successPayload(persona, thought, reply, 'openrouter'))
        }
        attempts.push(`openrouter: ${r.detail}`)
    }

    // 3) Gemini — plain fetch (Workers-friendly; no AI SDK bundle risk)
    if (geminiKey) {
        for (const model of ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash']) {
            const r = await geminiGenerate(geminiKey, model, systemPrompt, userPrompt)
            if (r.ok) {
                const { thought, reply } = parseThoughtAndReply(r.text)
                return json(successPayload(persona, thought, reply, `gemini-fetch:${model}`))
            }
            attempts.push(`gemini(${model}): ${r.detail}`)
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
                system: systemPrompt,
                prompt: userPrompt,
            })
            if (text) {
                const { thought, reply } = parseThoughtAndReply(text)
                return json(successPayload(persona, thought, reply, 'openai-sdk'))
            }
            attempts.push('openai-sdk: empty')
        } catch (e: any) {
            console.error('[PhilosopherBot] OpenAI SDK:', e?.message || e)
            attempts.push(`openai-sdk: ${e?.message || 'error'}`)
        }
    }

    const anyConfigured = configured.groq || configured.openrouter || configured.openai || configured.gemini
    return json(
        {
            success: false,
            error: anyConfigured
                ? 'All AI providers failed. Check attempts[] and Cloudflare Function logs.'
                : 'No AI keys visible to this Function. Dashboard secrets must be bound to the Pages project (Production) with exact names: GROQ_API_KEY, OPENROUTER_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY.',
            philosopher: persona.name,
            epistemicStance: persona.epistemicStance,
            reply: anyConfigured
                ? 'The philosopher network is unavailable right now (provider error).'
                : 'The philosopher network cannot see API keys on this Cloudflare deployment.',
            thought: '',
            provider: 'none',
            confident: false,
            host: 'cloudflare-pages-edge',
            configured,
            attempts: attempts.slice(0, 8),
        },
        503
    )
}
