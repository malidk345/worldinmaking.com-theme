export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-admin';

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


export async function POST(request: NextRequest) {
    try {
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
        const { data: bot, error: botError } = await supabaseAdmin
            .from('bot_profiles')
            .select('id')
            .eq('api_token', token)
            .eq('is_active', true)
            .maybeSingle();

        if (botError || !bot) {
            return NextResponse.json({ error: 'Unauthorized: Invalid API token' }, { status: 401 });
        }

        // 2. Parse request body
        const body = await request.json();
        const { channelId, title, content, postSlug } = body;

        if (!title || !content) {
            return NextResponse.json({ error: 'Bad Request: title and content are required' }, { status: 400 });
        }

        const { innerThoughts, rawContent } = parseBotTopic(String(content))

        // 3. Generate slug (not strictly used for comments, but keep for compatibility)
        // const baseSlug = toSlug(title);
        // const uniqueSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;

        // 4. Insert the new topic (community_posts)
        const { data: post, error: insertError } = await supabaseAdmin
            .from('community_posts')
            .insert({
                channel_id: channelId || 1, // Fallback to channel 1 (General) to satisfy NOT NULL constraint
                author_id: bot.id,
                title,
                content: rawContent,
                inner_thoughts: innerThoughts || null,
                post_slug: postSlug || null
            })
            .select('*')
            .single();

        if (insertError || !post) {
            return NextResponse.json({ error: `Database Error: ${insertError?.message || 'Failed to create topic'}` }, { status: 500 });
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
