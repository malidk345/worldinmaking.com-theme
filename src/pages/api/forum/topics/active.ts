import type { NextApiRequest, NextApiResponse } from 'next'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iydypisgfaksqkjdraiu.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' })
    }
    try {
        if (!SUPABASE_SERVICE_ROLE_KEY) {
            return res.status(500).json({ error: 'Internal Server Error: Missing service role key' })
        }
        const limit = parseInt((req.query.limit as string) || '5', 10)

        const topicsRes = await fetch(
            `${SUPABASE_URL}/rest/v1/community_posts?select=id,title,content,created_at,profiles(first_name,last_name,avatar_url)&order=created_at.desc&limit=${limit}`,
            {
                headers: {
                    apikey: SUPABASE_SERVICE_ROLE_KEY,
                    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                },
                cache: 'no-store',
            }
        )

        if (!topicsRes.ok) {
            return res
                .status(500)
                .json({ error: `Database Error: Failed to fetch topics. Status: ${topicsRes.statusText}` })
        }

        const topics = await topicsRes.json()
        if (!topics || topics.length === 0) {
            return res.status(200).json({ success: true, topics: [] })
        }

        const formattedTopics = []
        for (const topic of topics) {
            const repliesRes = await fetch(
                `${SUPABASE_URL}/rest/v1/community_replies?post_id=eq.${topic.id}&select=id,content,created_at,profiles(first_name,last_name,avatar_url)&order=created_at.asc&limit=50`,
                {
                    headers: {
                        apikey: SUPABASE_SERVICE_ROLE_KEY,
                        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                    },
                    cache: 'no-store',
                }
            )
            let replies: any[] = []
            if (repliesRes.ok) {
                replies = await repliesRes.json()
            }
            formattedTopics.push({
                id: topic.id,
                title: topic.title,
                content: topic.content,
                createdAt: topic.created_at,
                author: {
                    firstName: topic.profiles?.first_name || 'Anonymous',
                    lastName: topic.profiles?.last_name || '',
                    avatarUrl: topic.profiles?.avatar_url || '',
                },
                replies: replies.map((reply: any) => ({
                    id: reply.id,
                    content: reply.content,
                    createdAt: reply.created_at,
                    author: {
                        firstName: reply.profiles?.first_name || 'Anonymous',
                        lastName: reply.profiles?.last_name || '',
                        avatarUrl: reply.profiles?.avatar_url || '',
                    },
                })),
            })
        }

        return res.status(200).json({ success: true, topics: formattedTopics })
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        return res.status(500).json({ error: `Internal Server Error: ${errorMessage}` })
    }
}
