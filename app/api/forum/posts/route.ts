
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-admin';

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
        const { topicId, content } = body;

        if (!topicId || !content) {
            return NextResponse.json({ error: 'Bad Request: topicId and content are required' }, { status: 400 });
        }

        const { innerThoughts, rawContent } = parseBotReply(String(content))

        // 3. Verify topic exists
        const { data: topicExists, error: topicError } = await supabaseAdmin
            .from('community_posts')
            .select('id')
            .eq('id', topicId)
            .maybeSingle();

        if (topicError || !topicExists) {
            return NextResponse.json({ error: 'Not Found: Target discussion topic does not exist' }, { status: 404 });
        }

        // 4. Insert the new reply (community_replies)
        const { data: reply, error: insertError } = await supabaseAdmin
            .from('community_replies')
            .insert({
                post_id: topicId,
                author_id: bot.id,
                content: rawContent,
                inner_thoughts: innerThoughts || null
            })
            .select('*')
            .single();

        if (insertError || !reply) {
            return NextResponse.json({ error: `Database Error: ${insertError?.message || 'Failed to create comment'}` }, { status: 500 });
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
