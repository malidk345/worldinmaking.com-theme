/**
 * After a human writes in the forum, one philosopher answers that thread.
 * One LLM + one persist. Always JSON 200 so Cloudflare does not rewrite the body.
 */
export const runtime = 'edge'

import { createForumReply } from 'lib/bots/actions/forum'
import { instructionForForumMove, pickForumMove } from 'lib/bots/forum-moves'
import { pickRespondent, shouldReactToHuman } from 'lib/bots/forum-react'
import { loadForumThread } from 'lib/bots/forum-thread'
import { checkRateLimit } from 'lib/bots/rate-limit'
import { getClientIp } from 'lib/bots/request-validation'

function json(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

export default async function handler(req: Request) {
    if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405)

    const ip = getClientIp(req)
    const burst = checkRateLimit(`forum-react:${ip}`, 20, 60 * 60 * 1000)
    if (!burst.allowed) {
        return json({ success: false, skipped: true, reason: 'rate_limited' }, 200)
    }

    const body = (await req.json().catch(() => null)) as { postId?: unknown } | null
    const postId = String(body?.postId || '').trim()
    if (!/^\d{1,20}$/.test(postId)) {
        return json({ success: false, error: 'postId required' }, 400)
    }

    const recent = checkRateLimit(`forum-react-post:${postId}`, 1, 6 * 60 * 1000)
    if (!recent.allowed) {
        return json({ success: true, skipped: true, reason: 'cooldown' }, 200)
    }

    const thread = await loadForumThread(postId)
    if (!thread) return json({ success: false, error: 'Thread not found' }, 404)

    const gate = shouldReactToHuman(thread)
    if (!gate.ok) {
        return json({ success: true, skipped: true, reason: gate.reason, topicId: thread.id }, 200)
    }

    const bot = pickRespondent(thread)
    const move = pickForumMove(thread.replies.length)
    const last = thread.replies[thread.replies.length - 1]
    const reply = await createForumReply({
        botUsername: bot,
        topicId: thread.id,
        question: last
            ? `Your role is ${move} in "${thread.title}". Latest speaker: @${last.author}. Keep the seminar going. Be yourself.`
            : `Oppose or take up the motion "${thread.title}" from @${thread.author}. Keep the seminar going. Be yourself.`,
        trustedInstruction: instructionForForumMove(move),
        mood: 'passionate',
        thinkingDepth: 'brief',
        dryRun: false,
    })

    if (!(reply as any).success || !(reply as any).persisted) {
        return json(
            {
                success: false,
                phase: (reply as any).phase || 'reply_failed',
                error: (reply as any).persistError || (reply as any).error || 'Failed to persist follow-up',
                topicId: thread.id,
            },
            200
        )
    }

    return json({
        success: true,
        topicId: thread.id,
        reply: {
            id: (reply as any).forumReply?.id,
            author: bot,
            persisted: true,
        },
    })
}
