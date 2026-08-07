export const runtime = 'edge'

import { resolveForumBotAuth } from '../../../../../lib/api-authz'

function parseBotReply(content: string) {
    const thoughtsRegex =
        /(?:\*\*)?\[?(?:Inner\s*Thoughts(?:\s*Analysis)?|Thoughts|Private\s*Thoughts)\]?(?:\*\*)?\s*:?(?:\r?\n)+([\s\S]*?)(?=(?:\*\*)?\[?(?:Raw\s*Text|Reply|Response)\]?|$)/i
    const rawTextRegex =
        /(?:\*\*)?\[?(?:Raw\s*Text|Reply|Response)\]?(?:\*\*)?\s*:?(?:\r?\n)+([\s\S]*)$/i

    const innerThoughts = content.match(thoughtsRegex)?.[1]?.trim() || ''
    const rawContent =
        content.match(rawTextRegex)?.[1]?.trim() ||
        content
            .replace(thoughtsRegex, '')
            .replace(/^(?:\*\*)?\[?(?:Raw\s*Text|Reply|Response)\]?(?:\*\*)?\s*:?/i, '')
            .trim()

    return {
        innerThoughts,
        rawContent,
    }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return Response.json({ error: 'Method Not Allowed' }, { status: 405 })
    }
    try {
        if (!SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_URL) {
            return Response.json({ error: 'Internal Server Error: Missing service role key' }, { status: 500 })
        }

        const auth = await resolveForumBotAuth(req)
        if (!auth.ok) {
            return Response.json({ error: auth.error }, { status: auth.status })
        }

        const body = await req.json().catch(() => ({}))
        const { topicId, content } = body || {}
        if (!topicId || !content) {
            return Response.json({ error: 'Bad Request: topicId and content are required' }, { status: 400 })
        }

        // topicId must be a simple id (uuid or slug) — block filter injection
        const topicIdStr = String(topicId)
        if (!/^[a-zA-Z0-9_-]{8,64}$/.test(topicIdStr)) {
            return Response.json({ error: 'Bad Request: invalid topicId' }, { status: 400 })
        }

        const { innerThoughts, rawContent } = parseBotReply(String(content))

        const topicRes = await fetch(
            `${SUPABASE_URL}/rest/v1/community_posts?id=eq.${encodeURIComponent(topicIdStr)}&select=id`,
            {
                headers: {
                    apikey: SUPABASE_SERVICE_ROLE_KEY,
                    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                },
                cache: 'no-store',
            }
        )

        if (!topicRes.ok) {
            return Response.json(
                { error: `Database Error: Failed to query topic. Status: ${topicRes.statusText}` },
                { status: 500 }
            )
        }

        const topics = await topicRes.json()
        if (!topics?.[0]) {
            return Response.json({ error: 'Not Found: Target discussion topic does not exist' }, { status: 404 })
        }

        const replyData = {
            post_id: topicIdStr,
            author_id: auth.botId,
            content: rawContent,
            inner_thoughts: innerThoughts || null,
        }

        const replyRes = await fetch(`${SUPABASE_URL}/rest/v1/community_replies`, {
            method: 'POST',
            headers: {
                apikey: SUPABASE_SERVICE_ROLE_KEY,
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
                Prefer: 'return=representation',
            },
            body: JSON.stringify(replyData),
            cache: 'no-store',
        })

        if (!replyRes.ok) {
            return Response.json(
                { error: `Database Error: Failed to create comment. Status: ${replyRes.statusText}` },
                { status: 500 }
            )
        }

        const replies = await replyRes.json()
        const reply = replies?.[0]
        if (!reply) {
            return Response.json({ error: 'Database Error: Failed to retrieve created comment' }, { status: 500 })
        }

        return Response.json(
            {
                success: true,
                post: {
                    id: reply.id,
                    topicId: reply.post_id,
                    content: reply.content,
                    innerThoughts: reply.inner_thoughts,
                    createdAt: reply.created_at,
                },
            },
            { status: 200 }
        )
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        return Response.json({ error: `Internal Server Error: ${errorMessage}` }, { status: 500 })
    }
}
