export const runtime = 'edge'

import { getSupabaseUserFromRequest } from '../../../../lib/api-authz'
import { supabaseRest } from '../../../lib/bots/supabase-edge'
import { getRuntimeEnv } from '../../../lib/bots/runtime-env'
import { getLemonCustomerPortalUrl, isUserPro, subscriptionEntitlement } from '../../../lib/wim-billing'

function json(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

export default async function handler(req: Request) {
    if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405)

    const user = await getSupabaseUserFromRequest(req)
    if (!user) return json({ error: 'sign in required' }, 401)

    const env = getRuntimeEnv()
    const row = await supabaseRest<Array<Record<string, any>>>(
        `subscriptions?user_id=eq.${encodeURIComponent(user.id)}&select=status,plan,current_period_end,subscription_id,variant_id&limit=1`,
        { env }
    )

    const sub = row.ok && Array.isArray(row.data) ? row.data[0] || null : null
    const role = typeof user.role === 'string' ? user.role : user.user_metadata?.role
    const study =
        isUserPro({
            email: user.email,
            role,
            profile: { role },
            app_metadata: user.app_metadata,
        }) || subscriptionEntitlement(sub?.status, sub?.current_period_end) === 'pro'

    const portalUrl = sub?.subscription_id ? await getLemonCustomerPortalUrl(String(sub.subscription_id), env) : null

    return json({
        desk: study ? 'study' : 'desk',
        email: user.email || null,
        subscription: sub
            ? {
                  status: sub.status || null,
                  plan: sub.plan || null,
                  currentPeriodEnd: sub.current_period_end || null,
                  hasLemonId: !!sub.subscription_id,
                  portalUrl,
              }
            : null,
    })
}
