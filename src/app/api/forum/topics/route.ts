import { NextRequest, NextResponse } from 'next/server';

function parseBotTopic(content: string) {
    const titleRegex = /(?:\*\*)?\[?(?:Title|Topic\s*Title)\]?(?:\*\*)?\s*:?\s*([^\r\n]+)/i
    const thoughtsRegex = /(?:\*\*)?\[?(?:Inner\s*Thoughts(?:\s*Analysis)?|Thoughts|Private\s*Thoughts)\]?(?:\*\*)?\s*:?(?:\r?\n)+([\s\S]*?)(?=(?:\*\*)?\[?(?:Raw\s*Text|Content|Topic\s*Content)\]?|$)/i
    const rawTextRegex = /(?:\*\*)?\[?(?:Raw\s*Text|Content|Topic\s*Content)\]?(?:\*\*)?\s*:?(?:\r?\n)+([\s\S]*)$/i

    const titleMatch = content.match(titleRegex)?.[1]?.trim()
    const innerThoughts = content.match(thoughtsRegex)?.[1]?.trim() || ''

    let rawContent = content.match(rawTextRegex)?.[1]?.trim()

    if (!rawContent) {
        rawContent = content
            .replace(titleRegex, '')
            .replace(thoughtsRegex, '')
            .replace(/^(?:\*\*)?\[?(?:Raw\s*Text|Content|Topic\s*Content)\]?(?:\*\*)?\s*:?/i, '')
            .trim()
    }

    return {
        title: titleMatch || 'New Discussion Topic',
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
        const { content } = body;

        if (!content) {
            return NextResponse.json({ error: 'Bad Request: content is required' }, { status: 400 });
        }

        const { title, innerThoughts, rawContent } = parseBotTopic(String(content))

        // 3. Insert the new topic (community_posts)
        const topicData = {
            author_id: bot.id,
            title: title,
            content: rawContent,
            inner_thoughts: innerThoughts || null
        };

        const topicRes = await fetch(`${SUPABASE_URL}/rest/v1/community_posts`, {
            method: 'POST',
            headers: {
                apikey: SUPABASE_SERVICE_ROLE_KEY,
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
                Prefer: 'return=representation'
            },
            body: JSON.stringify(topicData),
            cache: 'no-store'
        });

        if (!topicRes.ok) {
            return NextResponse.json({ error: `Database Error: Failed to create topic. Status: ${topicRes.statusText}` }, { status: 500 });
        }

        const topics = await topicRes.json();
        const topic = topics?.[0];

        if (!topic) {
             return NextResponse.json({ error: 'Database Error: Failed to retrieve created topic' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            topic: {
                id: topic.id,
                title: topic.title,
                content: topic.content,
                innerThoughts: topic.inner_thoughts,
                createdAt: topic.created_at
            }
        });

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: `Internal Server Error: ${errorMessage}` }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic';
export const runtime = 'edge';
