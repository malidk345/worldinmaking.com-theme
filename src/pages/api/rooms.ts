/**
 * POST /api/rooms  { snapshot, title? } → { token }
 */
export const runtime = 'edge'

import { supabaseAdmin } from '../../../lib/supabase-admin'
import { getSupabaseUserFromRequest } from '../../../lib/api-authz'
import { checkRateLimitDurable, buildRateLimitHeaders } from '../../lib/bots/rate-limit'
import { getRuntimeEnv } from '../../lib/bots/runtime-env'
import { getClientIp } from '../../lib/bots/request-validation'
import { createRoomToken, parseWorldSnapshot } from '../../lib/world-snapshot'

function json(body: Record<string, unknown>, status = 200, headers: Record<string, string> = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...headers },
    })
}

export default async function handler(req: Request) {
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

    const ip = getClientIp(req)
    const rate = await checkRateLimitDurable(`room-create:${ip}`, 20, 60 * 60 * 1000, getRuntimeEnv(), {
        failClosed: true,
    })
    if (rate.source === 'unavailable') {
        return json(
            {
                code: 'RATE_LIMIT_UNAVAILABLE',
                error: 'Rate limit store temporarily unavailable. Please try again.',
                retryAfterSec: rate.retryAfterSec,
            },
            503,
            buildRateLimitHeaders(rate)
        )
    }
    if (!rate.allowed) {
        return json(
            { error: 'Too many rooms. Try again later.', code: 'RATE_LIMITED', retryAfterSec: rate.retryAfterSec },
            429,
            buildRateLimitHeaders(rate)
        )
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
    const snapshot = parseWorldSnapshot(body?.snapshot)
    if (!snapshot) return json({ error: 'Invalid world snapshot' }, 400)

    const title =
        typeof body?.title === 'string' && body.title.trim()
            ? body.title.trim().slice(0, 80)
            : snapshot.windows[0]?.path
              ? `Room ${snapshot.windows[0].path}`
              : 'Shared room'

    const user = await getSupabaseUserFromRequest(req)
    const token = createRoomToken()

    const { error } = await supabaseAdmin.from('world_rooms').insert({
        token,
        owner_id: user?.id || null,
        title,
        snapshot,
    })
    if (error) {
        if (/schema cache|does not exist|relation/i.test(error.message || '')) {
            return json(
                {
                    error: 'Rooms table not ready',
                    code: 'MIGRATION_REQUIRED',
                    hint: 'Run supabase/migrations/20260822_user_worlds_and_rooms.sql',
                },
                503
            )
        }
        return json({ error: 'Could not create room' }, 500)
    }

    return json({ token, path: `/room/${token}` })
}
