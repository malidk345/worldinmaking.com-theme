/**
 * Philosopher bot chat API.
 * Reads CF secrets directly in the handler (getRequestContext MUST be called
 * inside the handler, not in a library module) and injects them into runBotTurn.
 */
export const runtime = 'edge'

import { runBotTurn, type ThinkingDepth } from 'lib/bots'
import { checkRateLimit } from 'lib/bots/rate-limit'
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

function json(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405)
    }

    // Runtime bindings must be read per request on Cloudflare Pages.
    const env = getRuntimeEnv()
    const parsed = await readJsonObject(req, 32 * 1024)
    if (!parsed.ok) return json({ error: parsed.error, success: false }, parsed.status)
    const body = parsed.body

    const philosopher = normalizeBotName(body.philosopher, 'Nietzsche')
    if (!philosopher) return json({ error: 'Unknown philosopher bot', success: false }, 400)

    const mood = parseBotMood(body.mood)
    const taskType = parseTaskType(body.taskType)
    const thinkingDepth = parseThinkingDepth(body.thinkingDepth) as ThinkingDepth | undefined | null
    if (!mood || !taskType || thinkingDepth === null) {
        return json({ error: 'Invalid mood, taskType, or thinkingDepth', success: false }, 400)
    }

    const rawQuestion = body.question
    if (typeof rawQuestion !== 'string' || !rawQuestion.trim()) {
        return json({ error: 'Question string is required', success: false }, 400)
    }
    const question = rawQuestion.trim()
    if (question.length > 8000) {
        return json({ error: 'Question too long (max 8000 chars)', success: false }, 400)
    }

    const context = readOptionalString(body.context, 12000)
    if (context === null) return json({ error: 'context must be a string', success: false }, 400)

    const clientIp = getClientIp(req)
    const aggregate = checkRateLimit(`llm:${clientIp}`, 60, 60 * 60 * 1000)
    const rl = checkRateLimit(`chat:${clientIp}:${philosopher.toLowerCase()}`, 30, 60 * 60 * 1000)
    if (!aggregate.allowed || !rl.allowed) {
        const retryAfterSec = Math.max(aggregate.retryAfterSec, rl.retryAfterSec)
        return json(
            {
                success: false,
                error: `Rate limit exceeded for philosopher ${philosopher}. Retry in ${retryAfterSec}s`,
                retryAfterSec,
            },
            429
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
        return json({ success: false, error: 'Philosopher network unavailable' }, 503)
    }

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
                error: 'Philosopher network unavailable',
                philosopher: result.philosopher,
                epistemicStance: result.epistemicStance,
                reply: result.reply,
                thought: result.thought,
                thinking: result.thinking,
                provider: result.provider,
                confident: false,
                host: result.host,
                configured: result.configured,
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
