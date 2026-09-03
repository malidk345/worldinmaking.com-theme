/**
 * Philosopher bot chat API.
 * Reads CF secrets directly in the handler (getRequestContext MUST be called
 * inside the handler, not in a library module) and injects them into runBotTurn.
 */
export const runtime = 'edge'

import { runBotTurn, type ThinkingDepth } from 'lib/bots'
import { checkRateLimitDurable, buildRateLimitHeaders } from 'lib/bots/rate-limit'
import { getRuntimeEnv } from 'lib/bots/runtime-env'
import {
    getClientIp,
    normalizeBotName,
    parseBotMood,
    parseTaskType,
    parseThinkingDepth,
    readJsonObject,
    readOptionalString,
} from 'lib/bots/request-validation'

function json(body: Record<string, unknown>, status = 200, headers: Record<string, string> = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...headers,
        },
    })
}

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405)
    }

    // Runtime bindings must be read per request on Cloudflare Pages.
    const env = getRuntimeEnv()
    const parsed = await readJsonObject(req, 32 * 1024)
    if (!parsed.ok) return json({ error: parsed.error, success: false, code: 'INVALID_JSON' }, parsed.status)
    const body = parsed.body

    const philosopher = normalizeBotName(body.philosopher, 'Nietzsche')
    if (!philosopher) return json({ error: 'Unknown philosopher bot', success: false, code: 'UNKNOWN_BOT' }, 400)

    const mood = parseBotMood(body.mood)
    const taskType = parseTaskType(body.taskType)
    const thinkingDepth = parseThinkingDepth(body.thinkingDepth) as ThinkingDepth | undefined | null
    if (!mood || !taskType || thinkingDepth === null) {
        return json({ error: 'Invalid mood, taskType, or thinkingDepth', success: false, code: 'INVALID_PARAMETERS' }, 400)
    }

    const rawQuestion = body.question
    if (typeof rawQuestion !== 'string' || !rawQuestion.trim()) {
        return json({ error: 'Question string is required', success: false, code: 'MISSING_QUESTION' }, 400)
    }
    const question = rawQuestion.trim()
    if (question.length > 8000) {
        return json({ error: 'Question too long (max 8000 chars)', success: false, code: 'QUESTION_TOO_LONG' }, 400)
    }

    const context = readOptionalString(body.context, 12000)
    if (context === null) return json({ error: 'context must be a string', success: false, code: 'INVALID_CONTEXT' }, 400)

    const clientIp = getClientIp(req)
    const aggregate = await checkRateLimitDurable(`llm:${clientIp}`, 60, 60 * 60 * 1000, env, { failClosed: true })
    const rl = await checkRateLimitDurable(
        `chat:${clientIp}:${philosopher.toLowerCase()}`,
        30,
        60 * 60 * 1000,
        env,
        { failClosed: true }
    )
    if (aggregate.source === 'unavailable' || rl.source === 'unavailable') {
        const blocked = aggregate.source === 'unavailable' ? aggregate : rl
        return json(
            {
                success: false,
                code: 'RATE_LIMIT_UNAVAILABLE',
                error: 'Rate limit store temporarily unavailable. Please try again.',
                retryAfterSec: blocked.retryAfterSec,
            },
            503,
            buildRateLimitHeaders(blocked)
        )
    }
    if (!aggregate.allowed || !rl.allowed) {
        const retryAfterSec = Math.max(aggregate.retryAfterSec, rl.retryAfterSec)
        const rlHeaders = buildRateLimitHeaders(!aggregate.allowed ? aggregate : rl)
        return json(
            {
                success: false,
                code: 'RATE_LIMITED',
                error: `Rate limit exceeded for philosopher ${philosopher}. Retry in ${retryAfterSec}s`,
                retryAfterSec,
            },
            429,
            rlHeaders
        )
    }

    let result
    try {
        result = await runBotTurn({
            question,
            philosopher,
            mood,
            taskType,
            thinkingDepth: thinkingDepth ?? undefined,
            context: context || undefined,
            env,
        })
    } catch (error) {
        console.error('[philosopher-bot] unexpected failure', error)
        return json({ success: false, error: 'Philosopher network unavailable', code: 'UNEXPECTED_FAILURE' }, 503)
    }

    const rlHeaders = buildRateLimitHeaders(rl)

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
                code: 'PROVIDER_UNAVAILABLE',
                error: 'Philosopher network unavailable',
                philosopher: result.philosopher,
                epistemicStance: result.epistemicStance,
                reply: result.reply,
                thought: result.thought,
                thinking: result.thinking,
                configured: result.configured,
            },
            503,
            rlHeaders
        )
    }

    return json(
        {
            success: true,
            philosopher: result.philosopher,
            epistemicStance: result.epistemicStance,
            reply: result.reply,
            thought: result.thought,
            thinking: result.thinking,
            provider: result.provider,
            latencyMs: result.latencyMs,
            taskType: result.taskType,
            persona: result.persona,
        },
        200,
        {
            ...rlHeaders,
            'X-WIM-AI-Provider': result.provider,
            'X-WIM-AI-Latency-Ms': String(result.latencyMs),
        }
    )
}
