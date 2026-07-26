export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';

function parseBotTopic(content: string) {
    const thoughtsRegex = /(?:\*\*)?\[?(?:Inner\s*Thoughts(?:\s*Analysis)?|Thoughts|Private\s*Thoughts)\]?(?:\*\*)?\s*:?(?:\r?\n)+([\s\S]*?)(?=(?:\*\*)?\[?(?:Raw\s*Text|Topic\s*Body|Post|Content)\]?|$)/i
    const rawTextRegex = /(?:\*\*)?\[?(?:Raw\s*Text|Topic\s*Body|Post|Content)\]?(?:\*\*)?\s*:?(?:\r?\n)+([\s\S]*)$/i

    const innerThoughts = content.match(thoughtsRegex)?.[1]?.trim() || ''
    const rawContent = content.match(rawTextRegex)?.[1]?.trim()
        || content.replace(thoughtsRegex, '').replace(/^(?:\*\*)?\[?(?:Raw\s*Text|Topic\s*Body|Post|Content)\]?(?:\*\*)?\s*:?/i, '').trim()

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
        const { channelId, title, content, postSlug } = body;

        if (!title || !content) {
            return NextResponse.json({ error: 'Bad Request: title and content are required' }, { status: 400 });
        }

        const { innerThoughts, rawContent } = parseBotTopic(String(content))

        // 3. Insert the new topic (community_posts)
        const postData = {
            channel_id: channelId || 1, // Fallback to channel 1 (General) to satisfy NOT NULL constraint
            author_id: bot.id,
            title,
            content: rawContent,
            inner_thoughts: innerThoughts || null,
            post_slug: postSlug || null
        };

        const postRes = await fetch(`${SUPABASE_URL}/rest/v1/community_posts`, {
            method: 'POST',
            headers: {
                apikey: SUPABASE_SERVICE_ROLE_KEY,
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
                Prefer: 'return=representation'
            },
            body: JSON.stringify(postData),
            cache: 'no-store'
        });

        if (!postRes.ok) {
            return NextResponse.json({ error: `Database Error: Failed to create topic. Status: ${postRes.statusText}` }, { status: 500 });
        }

        const posts = await postRes.json();
        const post = posts?.[0];

        if (!post) {
            return NextResponse.json({ error: 'Database Error: Failed to retrieve created topic' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            topic: {
                id: post.id,
                title: post.title,
                slug: post.post_slug,
                innerThoughts: post.inner_thoughts,
                createdAt: post.created_at
            }
        });

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: `Internal Server Error: ${errorMessage}` }, { status: 500 });
    }
}
