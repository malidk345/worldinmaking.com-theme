/**
 * Philosopher bot chat API — Cloudflare Pages edge + local Next.js compatible.
 * Reads secrets from getRequestContext().env (CF) with process.env fallback (local).
 */
export const runtime = 'edge'

import type { TaskType } from 'lib/persona-engine'
import { runBotTurn, type ThinkingDepth } from 'lib/bots'
import { checkRateLimit } from 'lib/bots/rate-limit'

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
        thinkingDepth,
        context,
    }: {
        question: string
        philosopher?: string
        mood?: string
        taskType?: TaskType
        thinkingDepth?: ThinkingDepth
        context?: string
    } = body

    if (!question || typeof question !== 'string') {
        return json({ error: 'Question string is required', success: false }, 400)
    }

    const rlKey = `chat:${philosopher.toLowerCase()}`
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

    const result = await runBotTurn({
        question,
        philosopher,
        mood,
        taskType,
        thinkingDepth,
        context,
    })

    if (!result.success) {
        // Include debug info so we can diagnose key visibility in CF Pages logs
        console.error('[philosopher-bot] Provider failure:', {
            philosopher: result.philosopher,
            configured: result.configured,
            attempts: result.attempts,
            error: result.error,
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
