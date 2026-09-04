export const runtime = 'edge'

import { getSupabaseUserFromRequest } from '../../../../lib/api-authz'
import { supabaseRest } from '../../../lib/bots/supabase-edge'
import { envFrom, getRuntimeEnv } from '../../../lib/bots/runtime-env'
import { cancelLemonSubscription } from '../../../lib/wim-billing'

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

    const body = (await req.json().catch(() => ({}))) as { confirm?: string }
    const confirm = String(body.confirm || '').trim().toLowerCase()
    const username = String(
        user.profile?.username || user.user_metadata?.username || user.username || ''
    )
        .trim()
        .toLowerCase()
    const email = String(user.email || '').trim().toLowerCase()
    const allowed = [username, email, 'delete'].filter(Boolean)
    if (!confirm || !allowed.includes(confirm)) {
        return json({ error: 'type your username or email to remove this membership' }, 400)
    }

    const env = getRuntimeEnv()
    const found = await supabaseRest<Array<Record<string, any>>>(
        `subscriptions?user_id=eq.${encodeURIComponent(user.id)}&select=subscription_id&limit=1`,
        { env }
    )
    const lemonId = found.ok && Array.isArray(found.data) ? found.data[0]?.subscription_id : null
    if (lemonId) {
        await cancelLemonSubscription(String(lemonId), env)
    }

    const base = envFrom(env, 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL').replace(/\/$/, '')
    const serviceKey = envFrom(env, 'SUPABASE_SERVICE_ROLE_KEY')
    if (!base || !serviceKey) return json({ error: 'server is missing supabase admin credentials' }, 500)

    const del = await fetch(`${base}/auth/v1/admin/users/${encodeURIComponent(user.id)}`, {
        method: 'DELETE',
        headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
        },
    })
    if (!del.ok) {
        const text = await del.text().catch(() => '')
        return json({ error: text.slice(0, 200) || `could not delete account (${del.status})` }, 502)
    }

    return json({ ok: true })
}
