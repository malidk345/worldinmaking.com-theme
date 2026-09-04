export const runtime = 'edge'

import { getSupabaseUserFromRequest } from '../../../../lib/api-authz'
import { supabaseRest } from '../../../lib/bots/supabase-edge'
import { getRuntimeEnv } from '../../../lib/bots/runtime-env'
import { cancelLemonSubscription, subscriptionEntitlement } from '../../../lib/wim-billing'

function json(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

export default async function handler(req: Request) {
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

    const user = await getSupabaseUserFromRequest(req)
    if (!user) return json({ error: 'sign in required' }, 401)

    const env = getRuntimeEnv()
    const found = await supabaseRest<Array<Record<string, any>>>(
        `subscriptions?user_id=eq.${encodeURIComponent(user.id)}&select=subscription_id,status,current_period_end&limit=1`,
        { env }
    )
    const sub = found.ok && Array.isArray(found.data) ? found.data[0] : null
    if (!sub?.subscription_id) {
        return json({ error: 'no study subscription on this account' }, 404)
    }

    const cancelled = await cancelLemonSubscription(sub.subscription_id, env)
    if (!cancelled.ok) return json({ error: cancelled.error || 'could not cancel study' }, 502)

    const periodEnd = cancelled.endsAt || sub.current_period_end || null
    const lemonStatus = cancelled.status || 'cancelled'
    const role = subscriptionEntitlement(lemonStatus, periodEnd)
    const profileRole = String(user.role || user.user_metadata?.role || '')
    const keepStaff = profileRole === 'admin' || profileRole === 'moderator'

    if (!keepStaff) {
        await supabaseRest(`profiles?id=eq.${encodeURIComponent(user.id)}`, {
            method: 'PATCH',
            body: JSON.stringify({ role, updated_at: new Date().toISOString() }),
            env,
        })
    }

    await supabaseRest(`subscriptions?user_id=eq.${encodeURIComponent(user.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({
            status: lemonStatus,
            plan: role === 'pro' ? 'pro' : 'free',
            current_period_end: periodEnd,
            updated_at: new Date().toISOString(),
        }),
        env,
    })

    return json({
        ok: true,
        desk: keepStaff || role === 'pro' ? 'study' : 'desk',
        status: lemonStatus,
        currentPeriodEnd: periodEnd,
        untilPeriodEnd: role === 'pro',
    })
}
