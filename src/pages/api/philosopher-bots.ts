/**
 * Public list of resident philosopher bots + avatar URLs from site profiles.
 * Avatars come from Supabase profiles linked via bot_profiles (same as WIMBot).
 *
 * Cloudflare Pages (next-on-pages) requires Edge Runtime.
 */
export const runtime = 'edge'

import { envFrom, getRuntimeEnv } from 'lib/bots/runtime-env'
import { resolvePhilosopherAvatar } from 'lib/philosopher-avatar'

function json(body: Record<string, unknown>, status = 200, cache?: string) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (cache) headers['Cache-Control'] = cache
    return new Response(JSON.stringify(body), { status, headers })
}

export default async function handler(req: Request) {
    if (req.method !== 'GET') {
        return json({ error: 'Method not allowed' }, 405)
    }

    const env = getRuntimeEnv()
    const supabaseUrl = envFrom(env, 'NEXT_PUBLIC_SUPABASE_URL').replace(/\/$/, '')
    const supabaseKey = envFrom(env, 'SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseKey) {
        return json({
            bots: [],
            error: 'Supabase not configured',
        }, 503)
    }

    const headers = {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Accept: 'application/json',
    }

    try {
        const botRes = await fetch(
            `${supabaseUrl}/rest/v1/bot_profiles?select=id,name,is_active`,
            { headers, cache: 'no-store' }
        )

        if (!botRes.ok) {
            // Support the legacy relation while deployments migrate to the master schema.
            const legacyRes = await fetch(
                `${supabaseUrl}/rest/v1/bot_profiles?select=id,is_active,profiles(username,avatar_url)`,
                { headers, cache: 'no-store' }
            )
            if (!legacyRes.ok) {
                console.error('[philosopher-bots] bot_profiles lookup failed', botRes.status, legacyRes.status)
                return json({ bots: [], error: 'Bot roster unavailable' }, 503)
            }
            const legacyRaw = await legacyRes.json()
            return json({ bots: mapLegacyBots(legacyRaw) }, 200, 'public, s-maxage=300, stale-while-revalidate=600')
        }

        const raw = await botRes.json()
        const bots = (Array.isArray(raw) ? raw : [])
            .filter((row: any) => row.is_active !== false)
            .map((row: any) => {
                const username = String(row.name || '').trim()
                if (!username || username.toLowerCase() === 'wimbot') return null
                return {
                    id: row.id as string,
                    username,
                    avatar_url: resolvePhilosopherAvatar(username, ''),
                }
            })
            .filter(Boolean)

        return json({ bots }, 200, 'public, s-maxage=300, stale-while-revalidate=600')
    } catch (e: any) {
        console.error('[philosopher-bots]', e?.message || e)
        return json({ bots: [], error: 'Bot roster unavailable' }, 503)
    }
}

function mapLegacyBots(raw: unknown) {
    return (Array.isArray(raw) ? raw : [])
        .filter((row: any) => row?.is_active !== false)
        .map((row: any) => {
            const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
            const username = String(profile?.username || '').trim()
            if (!username || username.toLowerCase() === 'wimbot') return null
            return {
                id: row.id as string,
                username,
                avatar_url: resolvePhilosopherAvatar(username, profile?.avatar_url),
            }
        })
        .filter(Boolean)
}
