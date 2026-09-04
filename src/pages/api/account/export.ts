export const runtime = 'edge'

import { getSupabaseUserFromRequest } from '../../../../lib/api-authz'
import { supabaseRest } from '../../../lib/bots/supabase-edge'
import { getRuntimeEnv, type EnvStore } from '../../../lib/bots/runtime-env'

function json(body: Record<string, unknown>, status = 200, filename?: string) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (filename) {
        headers['Content-Disposition'] = `attachment; filename="${filename}"`
    }
    return new Response(JSON.stringify(body), { status, headers })
}

async function rows<T = Record<string, unknown>>(path: string, env: EnvStore): Promise<T[]> {
    const result = await supabaseRest<T[]>(path, { env })
    if (!result.ok || !Array.isArray(result.data)) return []
    return result.data
}

export default async function handler(req: Request) {
    if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405)

    const user = await getSupabaseUserFromRequest(req)
    if (!user) return json({ error: 'sign in required' }, 401)

    const env = getRuntimeEnv()
    const uid = encodeURIComponent(String(user.id))
    const owner = encodeURIComponent(String(user.id))

    const [profile, subscriptions, notebooks, chats, posts, bookmarks] = await Promise.all([
        rows(`profiles?id=eq.${uid}&limit=1`, env),
        rows(
            `subscriptions?user_id=eq.${uid}&select=status,plan,current_period_end,variant_id,updated_at&limit=5`,
            env
        ),
        rows(
            `wim_notebooks?or=(auth_user_id.eq.${owner},owner_key.eq.${owner})&deleted_at=is.null&select=id,short_id,title,content,created_at,updated_at,is_published,publish&order=updated_at.desc&limit=100`,
            env
        ),
        rows(
            `wim_chats?or=(auth_user_id.eq.${owner},owner_key.eq.${owner})&deleted_at=is.null&select=id,title,created_at,updated_at,model_id,is_shared&order=updated_at.desc&limit=80`,
            env
        ),
        rows(
            `community_posts?author_id=eq.${uid}&select=id,title,content,created_at&order=created_at.desc&limit=200`,
            env
        ),
        rows(`user_saved_posts?user_id=eq.${uid}&limit=200`, env),
    ])

    const chatIds = chats
        .map((row) => (row && typeof row === 'object' && 'id' in row ? String((row as { id?: unknown }).id || '') : ''))
        .filter((id) => /^[a-zA-Z0-9_-]+$/.test(id))
        .slice(0, 80)
    const messages = chatIds.length
        ? await rows(
              `wim_chat_messages?chat_id=in.(${chatIds.join(',')})&select=id,chat_id,role,content,created_at,model_used&order=created_at.asc&limit=2000`,
              env
          )
        : []

    const day = new Date().toISOString().slice(0, 10)
    return json(
        {
            exported_at: new Date().toISOString(),
            site: 'https://worldinmaking.com',
            account: {
                id: user.id,
                email: user.email || null,
                created_at: user.created_at || null,
            },
            profile: profile[0] || null,
            subscriptions,
            notebooks,
            chats,
            chat_messages: messages,
            posts,
            bookmarks,
        },
        200,
        `worldinmaking-export-${day}.json`
    )
}
