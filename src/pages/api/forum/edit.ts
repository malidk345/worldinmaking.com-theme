/** Secure forum post/reply editing endpoint for authors and staff. */
export const runtime = 'edge'

import { supabaseAdmin } from '../../../../lib/supabase-admin'
import { verifyAdminRequest } from '../../../../lib/admin-auth'
import { checkRateLimitDurable } from 'lib/bots/rate-limit'
import { getRuntimeEnv } from 'lib/bots/runtime-env'

function json(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

export default async function handler(req: Request) {
    if (req.method !== 'POST' && req.method !== 'PUT') return json({ error: 'Method not allowed' }, 405)

    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
    if (!token) return json({ error: 'Missing Authorization header' }, 401)

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !userData?.user) return json({ error: 'Invalid or expired session' }, 401)

    const rate = await checkRateLimitDurable(`forum-edit:${userData.user.id}`, 60, 60 * 60 * 1000, getRuntimeEnv())
    if (!rate.allowed) return json({ error: 'Rate limited' }, 429)

    const body = await req.json().catch(() => null)
    if (!body) return json({ error: 'Invalid JSON payload' }, 400)

    const type = body.type === 'reply' ? 'reply' : 'question'
    const id = String(body.id || '').trim()
    const content = String(body.content || body.body || '').trim()
    const title = body.title ? String(body.title).trim() : undefined

    if (!id) return json({ error: 'ID is required' }, 400)
    if (!content) return json({ error: 'Content cannot be empty' }, 400)

    const staff = await verifyAdminRequest(req)

    if (type === 'question') {
        const { data: post, error: postError } = await supabaseAdmin
            .from('community_posts')
            .select('id, author_id, title')
            .eq('id', id)
            .maybeSingle()

        if (postError) return json({ error: postError.message }, 500)
        if (!post) return json({ error: 'Thread not found' }, 404)

        const isAuthor = String(post.author_id) === userData.user.id
        if (!isAuthor && !staff.ok) {
            return json({ error: 'Only the author or staff can edit this thread' }, 403)
        }

        const updatePayload: Record<string, unknown> = {
            content,
            updated_at: new Date().toISOString(),
        }
        if (title) {
            updatePayload.title = title
        }

        const { error: updateError } = await supabaseAdmin
            .from('community_posts')
            .update(updatePayload)
            .eq('id', id)

        if (updateError) return json({ error: updateError.message }, 500)
        return json({ success: true })
    } else {
        const { data: reply, error: replyError } = await supabaseAdmin
            .from('community_replies')
            .select('id, author_id')
            .eq('id', id)
            .maybeSingle()

        if (replyError) return json({ error: replyError.message }, 500)
        if (!reply) return json({ error: 'Reply not found' }, 404)

        const isAuthor = String(reply.author_id) === userData.user.id
        if (!isAuthor && !staff.ok) {
            return json({ error: 'Only the author or staff can edit this reply' }, 403)
        }

        const { error: updateError } = await supabaseAdmin
            .from('community_replies')
            .update({ content })
            .eq('id', id)

        if (updateError) return json({ error: updateError.message }, 500)
        return json({ success: true })
    }
}
