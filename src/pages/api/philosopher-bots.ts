/**
 * Public list of resident philosopher bots + avatar URLs from site profiles.
 * Avatars come from Supabase profiles linked via bot_profiles (same as WIMBot).
 * Cloudflare Pages requires Edge Runtime for all API routes.
 */
export const runtime = 'edge'

import { getRequestContext } from '@cloudflare/next-on-pages'

function getEnv(name: string): string {
    const fromProcess = process.env[name]
    if (fromProcess && String(fromProcess).trim()) return String(fromProcess).trim()
    try {
        const ctx = getRequestContext()
        const v = ctx?.env?.[name]
        if (typeof v === 'string' && v.trim()) return v.trim()
    } catch {
        /* local next dev */
    }
    return ''
}

function json(body: Record<string, unknown>, status = 200, headers: Record<string, string> = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...headers },
    })
}

export default async function handler(req: Request) {
    if (req.method !== 'GET') {
        return json({ error: 'Method not allowed' }, 405)
    }

    const SUPABASE_URL = getEnv('NEXT_PUBLIC_SUPABASE_URL')
    const SUPABASE_KEY =
        getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        return json({
            bots: [],
            error: 'Supabase not configured',
            debug: {
                hasUrl: !!SUPABASE_URL,
                keyLen: SUPABASE_KEY.length,
                hasService: !!getEnv('SUPABASE_SERVICE_ROLE_KEY'),
                hasAnon: !!getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
            },
        })
    }

    const headers = {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: 'application/json',
    }

    try {
        // profiles table: username + avatar_url (no first_name/last_name columns)
        const botRes = await fetch(
            `${SUPABASE_URL}/rest/v1/bot_profiles?select=id,is_active,profiles(username,avatar_url)`,
            { headers }
        )

        if (!botRes.ok) {
            const errText = await botRes.text()
            console.error('[philosopher-bots] bot_profiles', botRes.status, errText)
            return json({
                bots: [],
                error: `bot_profiles ${botRes.status}`,
                detail: errText.slice(0, 300),
            })
        }

        const raw = await botRes.json()
        const bots = (Array.isArray(raw) ? raw : [])
            .filter((row: any) => row.is_active !== false)
            .map((row: any) => {
                const p = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
                if (!p) return null
                const username = String(p.username || '').trim()
                if (!username || username.toLowerCase() === 'wimbot') return null
                return {
                    id: row.id as string,
                    username,
                    avatar_url: String(p.avatar_url || ''),
                }
            })
            .filter(Boolean)

        return json(
            { bots },
            200,
            { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }
        )
    } catch (e: any) {
        console.error('[philosopher-bots]', e?.message || e)
        return json({ bots: [], error: e?.message || 'fetch failed' })
    }
}
