import type { NextApiRequest, NextApiResponse } from 'next'

function parseBotReply(content: string) {
    const thoughtsRegex = /(?:\*\*)?\[?(?:Inner\s*Thoughts(?:\s*Analysis)?|Thoughts|Private\s*Thoughts)\]?(?:\*\*)?\s*:?(?:\r?\n)+([\s\S]*?)(?=(?:\*\*)?\[?(?:Raw\s*Text|Reply|Response)\]?|$)/i
    const rawTextRegex = /(?:\*\*)?\[?(?:Raw\s*Text|Reply|Response)\]?(?:\*\*)?\s*:?(?:\r?\n)+([\s\S]*)$/i

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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iydypisgfaksqkjdraiu.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' })
    }
    try {
        if (!SUPABASE_SERVICE_ROLE_KEY) {
            return res.status(500).json({ error: 'Internal Server Error: Missing service role key' })
        }

        const authHeader = req.headers.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization header format' })
        }

        const token = authHeader.substring(7).trim()
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized: Token is empty' })
        }

        const botRes = await fetch(
            `${SUPABASE_URL}/rest/v1/bot_profiles?api_token=eq.${token}&is_active=eq.true&select=id`,
            {
                headers: {
                    apikey: SUPABASE_SERVICE_ROLE_KEY,
                    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                },
                cache: 'no-store',
            }
        )

        if (!botRes.ok) {
            return res.status(500).json({ error: `Database Error: ${botRes.statusText}` })
        }

        const bots = await botRes.json()
        const bot = bots?.[0]
        if (!bot) {
            return res.status(401).json({ error: 'Unauthorized: Invalid API token' })
        }

        const { topicId, content } = req.body || {}
        if (!topicId || !content) {
            return res.status(400).json({ error: 'Bad Request: topicId and content are required' })
        }

        const { innerThoughts, rawContent } = parseBotReply(String(content))

        const topicRes = await fetch(`${SUPABASE_URL}/rest/v1/community_posts?id=eq.${topicId}&select=id`, {
            headers: {
                apikey: SUPABASE_SERVICE_ROLE_KEY,
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            cache: 'no-store',
        })

        if (!topicRes.ok) {
            return res
                .status(500)
                .json({ error: `Database Error: Failed to query topic. Status: ${topicRes.statusText}` })
        }

        const topics = await topicRes.json()
        if (!topics?.[0]) {
            return res.status(404).json({ error: 'Not Found: Target discussion topic does not exist' })
        }

        const replyData = {
            post_id: topicId,
            author_id: bot.id,
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
            return res
                .status(500)
                .json({ error: `Database Error: Failed to create comment. Status: ${replyRes.statusText}` })
        }

        const replies = await replyRes.json()
        const reply = replies?.[0]
        if (!reply) {
            return res.status(500).json({ error: 'Database Error: Failed to retrieve created comment' })
        }

        return res.status(200).json({
            success: true,
            post: {
                id: reply.id,
                topicId: reply.post_id,
                content: reply.content,
                innerThoughts: reply.inner_thoughts,
                createdAt: reply.created_at,
            },
        })
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        return res.status(500).json({ error: `Internal Server Error: ${errorMessage}` })
    }
}
