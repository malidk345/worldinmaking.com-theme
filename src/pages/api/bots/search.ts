export const runtime = 'edge'

import { checkRateLimit } from 'lib/bots/rate-limit'
import { getClientIp, readJsonObject } from 'lib/bots/request-validation'
import { searchDuckDuckGo } from 'lib/bots/web-search'

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

    const parsed = await readJsonObject(req, 16 * 1024)
    if (!parsed.ok) return json({ error: parsed.error }, parsed.status)
    const { query } = parsed.body

    if (!query || typeof query !== 'string' || !query.trim()) {
        return json({ error: 'query required' }, 400)
    }
    const rate = checkRateLimit(`web-search:${getClientIp(req)}`, 30, 60 * 60 * 1000)
    if (!rate.allowed) return json({ error: 'Rate limited', retryAfterSec: rate.retryAfterSec }, 429)

    const resultsText = await searchDuckDuckGo(query.trim().slice(0, 500))

    return json({
        success: true,
        results: resultsText || 'No recent web results found.'
    })
}
