export const runtime = 'edge'

import { createCheckoutSession } from '../../../lib/wim-billing'
import { getSupabaseUserFromRequest } from '../../../../lib/api-authz'
import { checkRateLimitDurable, buildRateLimitHeaders } from '../../../lib/bots/rate-limit'
import { getRuntimeEnv } from '../../../lib/bots/runtime-env'
import { readJsonObject } from '../../../lib/bots/request-validation'

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

    try {
        const user = await getSupabaseUserFromRequest(req)
        if (!user) {
            return json({ error: 'sign in to open study.' }, 401)
        }

        const env = getRuntimeEnv()
        const rate = await checkRateLimitDurable(`checkout:${user.id}`, 10, 60 * 60 * 1000, env, { failClosed: true })
        if (rate.source === 'unavailable') {
            return json({ error: 'Rate limit store temporarily unavailable.' }, 503, buildRateLimitHeaders(rate))
        }
        if (!rate.allowed) {
            return json({ error: 'Too many checkout attempts. Try again later.' }, 429, buildRateLimitHeaders(rate))
        }

        const parsed = await readJsonObject(req, 4096)
        if (!parsed.ok) return json({ error: parsed.error }, parsed.status)
        const body = parsed.body
        const { interval } = body || {}
        const planInterval = interval === 'year' ? 'year' : 'month'

        const meta = (user.user_metadata || {}) as Record<string, any>
        const userName = meta.first_name || meta.name || meta.full_name || user.email?.split('@')[0]

        const session = await createCheckoutSession({
            userId: user.id,
            userEmail: user.email || '',
            userName,
            planInterval,
        })

        if (!session.ok || !session.checkoutUrl) {
            return json({ error: session.error || 'Could not generate checkout session.' }, 400)
        }

        return json({
            success: true,
            checkoutUrl: session.checkoutUrl,
        }, 200)
    } catch (err: any) {
        return json({ error: err?.message || 'Checkout initiation failed' }, 500)
    }
}
