/**
 * Philosopher bot chat API.
 * Reads CF secrets directly in the handler (getRequestContext MUST be called
 * inside the handler, not in a library module) and injects them into runBotTurn.
 */
export const runtime = 'edge'

import { getRequestContext } from '@cloudflare/next-on-pages'
import type { TaskType } from 'lib/persona-engine'
import { runBotTurn, type ThinkingDepth } from 'lib/bots'
import { checkRateLimit } from 'lib/bots/rate-limit'

function json(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

/** Read ALL env/secrets from CF context + process.env merged together. */
function readEnv(): Record<string, string> {
    const base: Record<string, string> = {}

    // 1) process.env (build-time vars, local .env.local)
    for (const [k, v] of Object.entries(process.env)) {
        if (typeof v === 'string' && v.length > 0) base[k] = v
    }

    // 2) CF runtime secrets (overwrite — these are authoritative in production)
    //    getRequestContext() MUST be called here, inside the handler scope.
    try {
        const { env } = getRequestContext()
        for (const [k, v] of Object.entries(env as Record<string, unknown>)) {
            if (typeof v === 'string' && v.length > 0) base[k] = v
        }
    } catch {
        // Local dev — CF context not available, process.env already loaded above
    }

    return base
}

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405)
    }

    // Read env RIGHT HERE — must be inside the request handler
    const env = readEnv()

    let body: any = {}
    try {
        body = await req.json()
    } catch {
        body = {}
    }

    // Guard against JSON `null` / scalars — destructuring them throws
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        body = {}
    }

    const {
        philosopher = 'Nietzsche',
        mood = 'calm',
        taskType = 'community_reply',
        thinkingDepth,
    }: {
        philosopher?: string
        mood?: string
        taskType?: TaskType
        thinkingDepth?: ThinkingDepth
    } = body

    const rawQuestion = body.question
    if (typeof rawQuestion !== 'string' || !rawQuestion.trim()) {
        return json({ error: 'Question string is required', success: false }, 400)
    }
    const question = rawQuestion.trim()
    if (question.length > 8000) {
        return json({ error: 'Question too long (max 8000 chars)', success: false }, 400)
    }

    const context =
        typeof body.context === 'string' && body.context.trim()
            ? body.context.slice(0, 12000)
            : undefined

    // Scope rate limit per client IP so a caller cannot bypass it by
    // rotating philosopher names (in-memory buckets reset on isolate recycle).
    const clientIp =
        req.headers.get('cf-connecting-ip') ||
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        'local'
    const rlKey = `chat:${clientIp}:${philosopher.toLowerCase()}`
    const rl = checkRateLimit(rlKey, 30, 60 * 60 * 1000)
    if (!rl.allowed) {
        return json(
            {
                success: false,
                error: `Rate limit exceeded for philosopher ${philosopher}. Retry in ${rl.retryAfterSec}s`,
                retryAfterSec: rl.retryAfterSec,
            },
            429
        )
    }

    // Inject the env directly so runBotTurn doesn't need to call getRuntimeEnv()
    const result = await runBotTurn({
        question,
        philosopher,
        mood,
        taskType,
        thinkingDepth,
        context,
        _env: env,
    } as any)

    if (!result.success) {
        console.error('[philosopher-bot] FAILED', {
            philosopher: result.philosopher,
            configured: result.configured,
            attempts: result.attempts,
            error: result.error,
            groqKeysFound: !!(env['GROQ_API_KEYS'] || env['GROQ_API_KEY']),
            geminiKeysFound: !!(env['GEMINI_API_KEYS'] || env['GEMINI_API_KEY']),
        })

        return json(
            {
                success: false,
                error: result.error,
                philosopher: result.philosopher,
                epistemicStance: result.epistemicStance,
                reply: result.reply,
                thought: result.thought,
                thinking: result.thinking,
                provider: result.provider,
                confident: false,
                host: result.host,
                configured: result.configured,
                attempts: result.attempts,
                latencyMs: result.latencyMs,
                taskType: result.taskType,
            },
            503
        )
    }

    return json({
        success: true,
        philosopher: result.philosopher,
        epistemicStance: result.epistemicStance,
        thought: result.thought,
        thinking: result.thinking,
        reply: result.reply,
        provider: result.provider,
        confident: true,
        latencyMs: result.latencyMs,
        taskType: result.taskType,
    })
}
