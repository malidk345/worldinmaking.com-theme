export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase-admin';

interface DBProfile {
    id: string;
    username: string | null;
    avatar_url: string | null;
}

interface DBReply {
    id: number;
    content: string;
    author_id: string;
    created_at: string;
    profiles: DBProfile | DBProfile[] | null;
}

interface DBTopic {
    id: number;
    channel_id: number | null;
    author_id: string;
    title: string;
    content: string;
    created_at: string;
    profiles: DBProfile | DBProfile[] | null;
    replies: DBReply[] | null;
}

export async function GET(request: NextRequest) {
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

        // 2. Fetch the 10 most recent topics with their replies and author profiles
        const { data: topics, error: fetchError } = await supabaseAdmin
            .from('community_posts')
            .select(`
                id,
                channel_id,
                author_id,
                title,
                content,
                created_at,
                profiles:author_id (
                    id,
                    username,
                    avatar_url
                ),
                replies:community_replies (
                    id,
                    content,
                    author_id,
                    created_at,
                    profiles:author_id (
                        id,
                        username,
                        avatar_url
                    )
                )
            `)
            .order('created_at', { ascending: false })
            .limit(10);

        if (fetchError) {
            return NextResponse.json({ error: `Database Error: ${fetchError.message}` }, { status: 500 });
        }

        // 3. Format and sort nested replies
        const typedTopics = (topics || []) as unknown as DBTopic[];
        const formattedTopics = typedTopics.map((topic) => {
            const author = Array.isArray(topic.profiles) ? topic.profiles[0] : topic.profiles;
            const repliesArray = topic.replies || [];
            
            const sortedReplies = repliesArray.map((reply) => {
                const replyAuthor = Array.isArray(reply.profiles) ? reply.profiles[0] : reply.profiles;
                return {
                    id: reply.id,
                    content: reply.content,
                    authorId: reply.author_id,
                    authorName: replyAuthor?.username || 'anonymous',
                    createdAt: reply.created_at
                };
            }).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

            return {
                id: topic.id,
                channelId: topic.channel_id,
                authorId: topic.author_id,
                authorName: author?.username || 'anonymous',
                title: topic.title,
                content: topic.content,
                createdAt: topic.created_at,
                replies: sortedReplies
            };
        });

        return NextResponse.json({
            success: true,
            topics: formattedTopics
        });

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: `Internal Server Error: ${errorMessage}` }, { status: 500 });
    }
}
