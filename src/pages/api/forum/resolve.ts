/** Author or staff can mark / unmark a forum reply as the solution. */
export const runtime = 'edge'

import { supabaseAdmin } from '../../../../lib/supabase-admin'
import { verifyAdminRequest } from '../../../../lib/admin-auth'
import { checkRateLimitDurable, buildRateLimitHeaders } from 'lib/bots/rate-limit'
import { getRuntimeEnv } from 'lib/bots/runtime-env'

function json(body: Record<string, unknown>, status = 200, headers: Record<string, string> = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...headers },
    })
}

export default async function handler(req: Request) {
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
    if (!token) return json({ error: 'Missing Authorization header' }, 401)

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !userData?.user) return json({ error: 'Invalid or expired session' }, 401)

    const env = getRuntimeEnv()
    const rate = await checkRateLimitDurable(
        `forum-resolve:${userData.user.id}`,
        40,
        60 * 60 * 1000,
        env,
        { failClosed: true }
    )
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
            { error: 'Rate limited', code: 'RATE_LIMITED', retryAfterSec: rate.retryAfterSec },
            429,
            buildRateLimitHeaders(rate)
        )
    }

    const body = await req.json().catch(() => null)
    const postId = String((body as { postId?: unknown })?.postId || '').trim()
    if (!postId) return json({ error: 'postId required' }, 400)
    const rawReply = (body as { replyId?: unknown })?.replyId
    const replyId = rawReply == null || rawReply === '' ? null : Number(rawReply)
    if (replyId != null && !Number.isFinite(replyId)) return json({ error: 'Invalid replyId' }, 400)

    const { data: post, error: postError } = await supabaseAdmin
        .from('community_posts')
        .select('id, author_id')
        .eq('id', postId)
        .maybeSingle()
    if (postError) return json({ error: postError.message }, 500)
    if (!post) return json({ error: 'Thread not found' }, 404)

    const staff = await verifyAdminRequest(req)
    const isAuthor = String(post.author_id) === userData.user.id
    if (!isAuthor && !staff.ok) return json({ error: 'Only the author or staff can resolve this thread' }, 403)

    if (replyId != null) {
        const { data: reply } = await supabaseAdmin
            .from('community_replies')
            .select('id, post_id')
            .eq('id', replyId)
            .maybeSingle()
        if (!reply || String(reply.post_id) !== String(post.id)) {
            return json({ error: 'Reply does not belong to this thread' }, 400)
        }
    }

    const { error } = await supabaseAdmin.from('community_posts').update({ resolved_reply_id: replyId }).eq('id', postId)
    if (error) return json({ error: error.message }, 500)
    return json({ success: true })
}
