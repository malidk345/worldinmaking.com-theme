import { NextRequest, NextResponse } from 'next/server';

interface DBProfile {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
}

interface DBReply {
    id: string;
    content: string;
    created_at: string;
    profiles: DBProfile | null;
}

interface DBTopic {
    id: string;
    title: string;
    content: string;
    created_at: string;
    profiles: DBProfile | null;
    community_replies: DBReply[];
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iydypisgfaksqkjdraiu.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request: NextRequest) {
    try {
        if (!SUPABASE_SERVICE_ROLE_KEY) {
            return NextResponse.json({ error: 'Internal Server Error: Missing service role key' }, { status: 500 });
        }

        const url = new URL(request.url);
        const limit = parseInt(url.searchParams.get('limit') || '5', 10);

        // Use a simpler query first to avoid complex PostgREST joins if they are slow or problematic
        // We'll fetch topics, then their replies manually to ensure we get what we need reliably

        // 1. Fetch recent topics
        const topicsRes = await fetch(`${SUPABASE_URL}/rest/v1/community_posts?select=id,title,content,created_at,profiles(first_name,last_name,avatar_url)&order=created_at.desc&limit=${limit}`, {
            headers: {
                apikey: SUPABASE_SERVICE_ROLE_KEY,
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
            },
            cache: 'no-store'
        });

        if (!topicsRes.ok) {
            return NextResponse.json({ error: `Database Error: Failed to fetch topics. Status: ${topicsRes.statusText}` }, { status: 500 });
        }

        const topics = await topicsRes.json();

        if (!topics || topics.length === 0) {
             return NextResponse.json({
                success: true,
                topics: []
            });
        }

        const formattedTopics = [];

        // 2. For each topic, fetch its latest replies
        for (const topic of topics) {
             const repliesRes = await fetch(`${SUPABASE_URL}/rest/v1/community_replies?post_id=eq.${topic.id}&select=id,content,created_at,profiles(first_name,last_name,avatar_url)&order=created_at.asc&limit=50`, {
                headers: {
                    apikey: SUPABASE_SERVICE_ROLE_KEY,
                    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
                },
                cache: 'no-store'
            });

            let replies = [];
            if (repliesRes.ok) {
                replies = await repliesRes.json();
            }
            
            formattedTopics.push({
                id: topic.id,
                title: topic.title,
                content: topic.content,
                createdAt: topic.created_at,
                author: {
                    firstName: topic.profiles?.first_name || 'Anonymous',
                    lastName: topic.profiles?.last_name || '',
                    avatarUrl: topic.profiles?.avatar_url || ''
                },
                replies: replies.map((reply: any) => ({
                    id: reply.id,
                    content: reply.content,
                    createdAt: reply.created_at,
                    author: {
                        firstName: reply.profiles?.first_name || 'Anonymous',
                        lastName: reply.profiles?.last_name || '',
                        avatarUrl: reply.profiles?.avatar_url || ''
                    }
                }))
            });
        }

        return NextResponse.json({
            success: true,
            topics: formattedTopics
        });

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: `Internal Server Error: ${errorMessage}` }, { status: 500 });
    }
}

export const runtime = 'edge';
