/** Authenticated admin-only manual trigger for one philosopher bot tick. */
export const runtime = 'edge'

import { verifyAdminRequest } from '../../../../lib/admin-auth'
import { runPhilosopherBotTick } from '../cron/philosopher-bots'
import { checkRateLimit } from 'lib/bots/rate-limit'

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

    const result = await runPhilosopherBotTick()
    return json(result, result.success ? 200 : 502)
}
