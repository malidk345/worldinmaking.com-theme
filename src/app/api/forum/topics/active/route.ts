export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';

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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iydypisgfaksqkjdraiu.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request: NextRequest) {
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

        // 2. Fetch the 10 most recent topics with their replies and author profiles
        const topicsRes = await fetch(
            `${SUPABASE_URL}/rest/v1/community_posts?select=id,channel_id,author_id,title,content,created_at,profiles:author_id(id,username,avatar_url),replies:community_replies(id,content,author_id,created_at,profiles:author_id(id,username,avatar_url))&order=created_at.desc&limit=10`,
            {
                headers: {
                    apikey: SUPABASE_SERVICE_ROLE_KEY,
                    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
                },
                cache: 'no-store'
            }
        );

        if (!topicsRes.ok) {
            return NextResponse.json({ error: `Database Error: ${topicsRes.statusText}` }, { status: 500 });
        }

        const topics = await topicsRes.json();

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
