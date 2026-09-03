export const runtime = 'edge'

import { getRuntimeEnv } from 'lib/bots/runtime-env'
import { getClientIp, readJsonObject } from 'lib/bots/request-validation'
import { checkRateLimitDurable, buildRateLimitHeaders } from 'lib/bots/rate-limit'
import { resolveSearchIntent } from 'lib/bots/intent-router'

function json(body: Record<string, unknown>, status = 200, headers: Record<string, string> = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...headers },
    })
}

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405)
    }

    const env = getRuntimeEnv()
    const parsed = await readJsonObject(req, 16 * 1024)
    if (!parsed.ok) return json({ error: parsed.error }, parsed.status)
    const { question } = parsed.body

    if (!question || typeof question !== 'string' || !question.trim()) {
        return json({ error: 'question required' }, 400)
    }
    const clientIp = getClientIp(req)
    const rate = await checkRateLimitDurable(`intent:${clientIp}`, 30, 60 * 60 * 1000, env, {
        failClosed: true,
    })
    if (rate.source === 'unavailable') {
        return json(
            {
                code: 'RATE_LIMIT_UNAVAILABLE',
                error: 'Rate limit store temporarily unavailable. Please try again.',
                retryAfterSec: rate.retryAfterSec,
            },
            503,
            buildRateLimitHeaders(rate)
        )
    }
    if (!rate.allowed) {
        return json(
            { error: 'Rate limited', code: 'RATE_LIMITED', retryAfterSec: rate.retryAfterSec },
            429,
            buildRateLimitHeaders(rate)
        )
    }
    const boundedQuestion = question.trim().slice(0, 8000)

    const result = await resolveSearchIntent(boundedQuestion, { env })
    return json({
        needsSearch: result.needsSearch,
        searchQuery: result.searchQuery,
        formatRequest: result.formatRequest,
        source: result.source,
    })
}
