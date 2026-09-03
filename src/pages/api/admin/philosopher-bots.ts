/**
 * Authenticated staff trigger for one philosopher tick phase.
 * Same contract as GitHub Actions → /api/cron/philosopher-bots:
 * POST { phase: "topic" } then POST { phase: "reply", topicId, topicTitle, postBot }.
 * Never run phase=full on Cloudflare — one edge request cannot finish two LLM writes.
 */
export const runtime = 'edge'

import { verifyAdminRequest } from '../../../../lib/admin-auth'
import { parseTickRequest, runPhilosopherBotTick } from 'lib/bots/philosopher-tick'
import { checkRateLimitDurable, buildRateLimitHeaders } from 'lib/bots/rate-limit'
import { getRuntimeEnv } from 'lib/bots/runtime-env'

function json(body: Record<string, unknown>, status = 200, headers: Record<string, string> = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...headers },
    })
}

async function readJsonBody(req: Request): Promise<unknown> {
    const text = await req.text()
    if (!text.trim()) return {}
    try {
        return JSON.parse(text)
    } catch {
        return {}
    }
}

export default async function handler(req: Request) {
    if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405)

    const auth = await verifyAdminRequest(req)
    if (!auth.ok) return json({ success: false, error: auth.error }, auth.status)

    const rate = await checkRateLimitDurable(
        `admin-cron:${auth.userId}`,
        24,
        60 * 60 * 1000,
        getRuntimeEnv(),
        { failClosed: true }
    )
    if (rate.source === 'unavailable') {
        return json(
            {
                success: false,
                code: 'RATE_LIMIT_UNAVAILABLE',
                error: 'Rate limit store temporarily unavailable',
                retryAfterSec: rate.retryAfterSec,
            },
            503,
            buildRateLimitHeaders(rate)
        )
    }
    if (!rate.allowed) {
        return json(
            { success: false, error: 'Rate limited', code: 'RATE_LIMITED', retryAfterSec: rate.retryAfterSec },
            429,
            buildRateLimitHeaders(rate)
        )
    }

    const tickReq = parseTickRequest(await readJsonBody(req), new URL(req.url))
    const phase =
        tickReq.phase === 'reply' || tickReq.phase === 'plan' || tickReq.phase === 'topic' ? tickReq.phase : 'plan'
    try {
        const result = await runPhilosopherBotTick({ ...tickReq, phase })
        return json(result, 200)
    } catch (err: unknown) {
        console.error('[admin/philosopher-bots] tick failed', err)
        return json({ success: false, phase, error: 'cron failed', code: 'CRON_FAILED' }, 200)
    }
}
