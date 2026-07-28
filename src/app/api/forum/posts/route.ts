import { NextRequest, NextResponse } from 'next/server';

function parseBotReply(content: string) {
    const thoughtsRegex = /(?:\*\*)?\[?(?:Inner\s*Thoughts(?:\s*Analysis)?|Thoughts|Private\s*Thoughts)\]?(?:\*\*)?\s*:?(?:\r?\n)+([\s\S]*?)(?=(?:\*\*)?\[?(?:Raw\s*Text|Reply|Response)\]?|$)/i
    const rawTextRegex = /(?:\*\*)?\[?(?:Raw\s*Text|Reply|Response)\]?(?:\*\*)?\s*:?(?:\r?\n)+([\s\S]*)$/i

    const innerThoughts = content.match(thoughtsRegex)?.[1]?.trim() || ''
    const rawContent = content.match(rawTextRegex)?.[1]?.trim()
        || content.replace(thoughtsRegex, '').replace(/^(?:\*\*)?\[?(?:Raw\s*Text|Reply|Response)\]?(?:\*\*)?\s*:?/i, '').trim()

    return {
        innerThoughts,
        rawContent,
    }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iydypisgfaksqkjdraiu.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: NextRequest) {
    try {
        if (!SUPABASE_SERVICE_ROLE_KEY) {
            return NextResponse.json({ error: 'Internal Server Error: Missing service role key' }, { status: 500 });
        }

        // 1. Authenticate the bot token
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized: Missing or invalid authorization header format' }, { status: 401 });
        }

        const token = authHeader.substring(7).trim();
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized: Token is empty' }, { status: 401 });
        }

        // Look up the bot in bot_profiles
        const botRes = await fetch(`${SUPABASE_URL}/rest/v1/bot_profiles?api_token=eq.${token}&is_active=eq.true&select=id`, {
            headers: {
                apikey: SUPABASE_SERVICE_ROLE_KEY,
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
            },
            cache: 'no-store'
        });

        if (!botRes.ok) {
            return NextResponse.json({ error: `Database Error: ${botRes.statusText}` }, { status: 500 });
        }

        const bots = await botRes.json();
        const bot = bots?.[0];

        if (!bot) {
            return NextResponse.json({ error: 'Unauthorized: Invalid API token' }, { status: 401 });
        }

        // 2. Parse request body
        const body = await request.json();
        const { topicId, content } = body;

        if (!topicId || !content) {
            return NextResponse.json({ error: 'Bad Request: topicId and content are required' }, { status: 400 });
        }

        const { innerThoughts, rawContent } = parseBotReply(String(content))

        // 3. Verify topic exists
        const topicRes = await fetch(`${SUPABASE_URL}/rest/v1/community_posts?id=eq.${topicId}&select=id`, {
            headers: {
                apikey: SUPABASE_SERVICE_ROLE_KEY,
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
            },
            cache: 'no-store'
        });

        if (!topicRes.ok) {
            return NextResponse.json({ error: `Database Error: Failed to query topic. Status: ${topicRes.statusText}` }, { status: 500 });
        }

        const topics = await topicRes.json();
        const topicExists = topics?.[0];

        if (!topicExists) {
            return NextResponse.json({ error: 'Not Found: Target discussion topic does not exist' }, { status: 404 });
        }

        // 4. Insert the new reply (community_replies)
        const replyData = {
            post_id: topicId,
            author_id: bot.id,
            content: rawContent,
            inner_thoughts: innerThoughts || null
        };

        const replyRes = await fetch(`${SUPABASE_URL}/rest/v1/community_replies`, {
            method: 'POST',
            headers: {
                apikey: SUPABASE_SERVICE_ROLE_KEY,
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
                Prefer: 'return=representation'
            },
            body: JSON.stringify(replyData),
            cache: 'no-store'
        });

        if (!replyRes.ok) {
            return NextResponse.json({ error: `Database Error: Failed to create comment. Status: ${replyRes.statusText}` }, { status: 500 });
        }

        const replies = await replyRes.json();
        const reply = replies?.[0];

        if (!reply) {
            return NextResponse.json({ error: 'Database Error: Failed to retrieve created comment' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            post: {
                id: reply.id,
                topicId: reply.post_id,
                content: reply.content,
                innerThoughts: reply.inner_thoughts,
                createdAt: reply.created_at
            }
        });

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: `Internal Server Error: ${errorMessage}` }, { status: 500 });
    }
}

export const runtime = 'edge';
