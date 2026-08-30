export const runtime = 'edge'

import { createCheckoutSession } from '../../../lib/wim-billing'
import { getSupabaseUserFromRequest } from '../../../../lib/api-authz'

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

    try {
        const user = await getSupabaseUserFromRequest(req)
        if (!user) {
            return json({ error: 'Please sign in to upgrade to Pro.' }, 401)
        }

        const body = (await req.json().catch(() => ({}))) as Record<string, any>
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
            isTestMode: session.isTestMode || false,
        }, 200)
    } catch (err: any) {
        return json({ error: err?.message || 'Checkout initiation failed' }, 500)
    }
}
