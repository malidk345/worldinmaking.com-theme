export const runtime = 'edge'

import { checkRateLimitDurable, buildRateLimitHeaders } from 'lib/bots/rate-limit'
import { getRuntimeEnv } from 'lib/bots/runtime-env'
import { getClientIp, readJsonObject } from 'lib/bots/request-validation'
import { searchDuckDuckGo } from 'lib/bots/web-search'

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

    const parsed = await readJsonObject(req, 16 * 1024)
    if (!parsed.ok) return json({ error: parsed.error }, parsed.status)
    const { query } = parsed.body

    if (!query || typeof query !== 'string' || !query.trim()) {
        return json({ error: 'query required' }, 400)
    }
    const env = getRuntimeEnv()
    const rate = await checkRateLimitDurable(`web-search:${getClientIp(req)}`, 30, 60 * 60 * 1000, env, {
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

    const resultsText = await searchDuckDuckGo(query.trim().slice(0, 500))

    return json({
        success: true,
        results: resultsText || 'No recent web results found.',
    })
}
