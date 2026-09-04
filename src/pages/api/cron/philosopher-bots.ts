/**
 * Hourly (or on-demand) philosopher forum tick.
 * Auth + rate-limit only here; the tick itself lives in lib/bots/philosopher-tick
 * so GitHub Actions can run topic/reply as two short CF requests.
 */
export const runtime = 'edge'

import { checkRateLimitDurable } from 'lib/bots/rate-limit'
import { envFrom, getRuntimeEnv } from 'lib/bots/runtime-env'
import { parseTickRequest, runPhilosopherBotTick } from 'lib/bots/philosopher-tick'

function json(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
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
    // Mutating endpoint: only POST is allowed (a GET must never trigger writes).
    if (req.method !== 'POST') {
        return json({ success: false, error: 'Method not allowed' }, 405)
    }

    // Secret check: when CRON_SECRET is configured it is REQUIRED — missing or
    // mismatched headers are rejected, otherwise the tick would run publicly.
    const env = getRuntimeEnv()
    const secret = envFrom(env, 'CRON_SECRET', 'BOT_ACT_SECRET')
    if (!secret) {
        return json({ success: false, error: 'Cron secret is not configured' }, 503)
    }
    const header =
        req.headers.get('x-cron-secret') ||
        req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
        ''
    if (header !== secret) {
        return json({ success: false, error: 'Unauthorized: x-cron-secret required' }, 401)
    }

    // Two phases × retries × catch-up schedule can exceed the old 12/hour cap.
    const rl = await checkRateLimitDurable('cron:philosopher-bots', 24, 60 * 60 * 1000, env, { failClosed: true })
    if (rl.source === 'unavailable') {
        return json(
            {
                success: false,
                code: 'RATE_LIMIT_UNAVAILABLE',
                error: 'Rate limit store temporarily unavailable',
                retryAfterSec: rl.retryAfterSec,
            },
            503
        )
    }
    if (!rl.allowed) {
        return json(
            {
                success: false,
                error: 'Rate limited',
                retryAfterSec: rl.retryAfterSec,
            },
            429
        )
    }

    const url = new URL(req.url)
    const body = await readJsonBody(req)
    const tickReq = parseTickRequest(body, url)

    const isAsync =
        url.searchParams.get('async') === '1' ||
        url.searchParams.get('async') === 'true' ||
        req.headers.get('x-wim-async') === '1'

    if (isAsync) {
        const { enqueueBotTask, philosopherTickIdempotencyKey } = await import('lib/bots/bot-queue')
        const phase = String(tickReq.phase || 'full')
        const topicId = tickReq.topicId != null ? String(tickReq.topicId) : undefined
        const taskId = await enqueueBotTask(
            'philosopher_tick',
            { tickReq },
            philosopherTickIdempotencyKey(phase, topicId)
        )
        return json({ success: true, queued: true, taskId, phase }, 202)
    }

    try {
        const result = await runPhilosopherBotTick(tickReq)
        // Always 200 for tick outcomes. Cloudflare Pages rewrites HTTP 502
        // bodies to the literal text "error code: 502", which breaks the cron.
        return json(result, 200)
    } catch (err: any) {
        return json(
            {
                success: false,
                phase: tickReq.phase || 'full',
                error: err?.message || 'cron failed',
            },
            200
        )
    }
}


export { runPhilosopherBotTick } from 'lib/bots/philosopher-tick'
