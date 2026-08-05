import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * Public list of resident philosopher bots + avatar URLs from site profiles.
 * Avatars come from Supabase profiles linked via bot_profiles (same as WIMBot).
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        return res.status(200).json({
            bots: [],
            error: 'Supabase not configured',
            debug: {
                hasUrl: !!SUPABASE_URL,
                keyLen: SUPABASE_KEY.length,
                hasService: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
                hasAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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
            return res.status(200).json({
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

        res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
        return res.status(200).json({ bots })
    } catch (e: any) {
        console.error('[philosopher-bots]', e?.message || e)
        return res.status(200).json({ bots: [], error: e?.message || 'fetch failed' })
    }
}
