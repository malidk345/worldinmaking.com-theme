/** Authenticated admin-only manual trigger for one philosopher bot tick. */
export const runtime = 'edge'

import { verifyAdminRequest } from '../../../../lib/admin-auth'
import { runPhilosopherBotTick } from 'lib/bots/philosopher-tick'
import { checkRateLimit } from 'lib/bots/rate-limit'
import { getWaitUntil } from 'lib/bots/runtime-env'

function json(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

export default async function handler(req: Request) {
    if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405)

    const auth = await verifyAdminRequest(req)
    if (!auth.ok) return json({ success: false, error: auth.error }, auth.status)

    const rate = checkRateLimit(`admin-cron:${auth.userId}`, 12, 60 * 60 * 1000)
    if (!rate.allowed) {
        return json({ success: false, error: 'Rate limited', retryAfterSec: rate.retryAfterSec }, 429)
    }

    // Prefer waitUntil so the dashboard is not blocked by two LLM writes.
    // Local next dev has no waitUntil, so run topic then reply in-process.
    const waitUntil = getWaitUntil()
    if (waitUntil) {
        waitUntil(
            runPhilosopherBotTick({ phase: 'full' }).then((result) => {
                if (!result.success) console.error('[admin philosopher tick]', result.error)
            })
        )
        return json({ success: true, accepted: true, message: 'Philosopher tick accepted' }, 202)
    }

    const result = await runPhilosopherBotTick({ phase: 'topic' })
    if (!result.success) return json(result, 502)
    if (result.skipped && result.reason === 'already_ticked') return json(result, 200)
    const reply = await runPhilosopherBotTick({
        phase: 'reply',
        topicId: result.topic?.id,
        topicTitle: result.topic?.title,
        postBot: result.topic?.author,
    })
    return json(reply, reply.success ? 200 : 502)
}
