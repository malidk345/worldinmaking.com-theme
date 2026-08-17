/**
 * POST /api/account/claim
 * Move this device's unsigned chats/notebooks onto the signed-in account.
 */
export const runtime = 'edge'

import { getSupabaseUserFromRequest } from '../../../../lib/api-authz'
import { claimDeviceAccount, isSafeOwnerKey } from '../../../lib/account-claim'

function json(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

export default async function handler(req: Request) {
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

    const body = (await req.json().catch(() => ({}))) as { previous_owner_key?: string }
    const previous = typeof body.previous_owner_key === 'string' ? body.previous_owner_key.trim() : ''
    if (!isSafeOwnerKey(previous)) return json({ error: 'previous_owner_key required' }, 400)

    const headerKey = (req.headers.get('x-wim-owner-key') || '').trim()
    if (!headerKey || headerKey !== previous) {
        return json({ error: 'X-WIM-Owner-Key must match previous_owner_key' }, 401)
    }

    const user = await getSupabaseUserFromRequest(req)
    if (!user) return json({ error: 'Sign in required to claim this device' }, 401)

    try {
        const claimed = await claimDeviceAccount(previous, user.id)
        return json({ ok: true, claimed, auth: { via: 'jwt' } })
    } catch (err) {
        const message = err && typeof err === 'object' && 'message' in err ? String((err as { message?: string }).message) : 'Claim failed'
        return json({ error: message }, 500)
    }
}
