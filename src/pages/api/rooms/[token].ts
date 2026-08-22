/**
 * GET /api/rooms/:token — public unlisted world snapshot.
 */
export const runtime = 'edge'

import { supabaseAdmin } from '../../../../lib/supabase-admin'
import { parseWorldSnapshot } from '../../../lib/world-snapshot'

function json(body: Record<string, unknown>, status = 200, cache = false) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': cache ? 's-maxage=30, stale-while-revalidate=300' : 'no-store',
        },
    })
}

function tokenFromUrl(url: URL): string {
    const parts = url.pathname.replace(/\/+$/, '').split('/')
    const token = parts[parts.length - 1] || ''
    if (!token || token === 'rooms') return ''
    return decodeURIComponent(token)
}

export default async function handler(req: Request) {
    if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405)
    const token = tokenFromUrl(new URL(req.url))
    if (!token || token.length < 8 || token.length > 40) return json({ error: 'Room token required' }, 400)

    const { data, error } = await supabaseAdmin
        .from('world_rooms')
        .select('token, title, snapshot, created_at')
        .eq('token', token)
        .maybeSingle()

    if (error) {
        if (/schema cache|does not exist|relation/i.test(error.message || '')) {
            return json({ error: 'Rooms table not ready', code: 'MIGRATION_REQUIRED' }, 503)
        }
        return json({ error: 'Lookup failed' }, 500)
    }
    if (!data) return json({ error: 'Not found' }, 404)

    const snapshot = parseWorldSnapshot(data.snapshot)
    if (!snapshot) return json({ error: 'Not found' }, 404)

    return json(
        {
            token: data.token,
            title: data.title,
            createdAt: data.created_at,
            snapshot,
        },
        200,
        true
    )
}
