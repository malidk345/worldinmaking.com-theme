export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-admin';

// GET: Fetch all symposium collaborations
export async function GET() {
    try {
        const { data: collaborations, error } = await supabaseAdmin
            .from('symposium_collaborations')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ collaborations });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

// POST: Start a new symposium collaboration
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { title, topicDescription } = body;

        if (!title) {
            return NextResponse.json({ error: 'title is required' }, { status: 400 });
        }

        const { data: collaboration, error } = await supabaseAdmin
            .from('symposium_collaborations')
            .insert({
                title: title.trim(),
                topic_description: topicDescription ? topicDescription.trim() : null,
                status: 'drafting'
            })
            .select('*')
            .single();

        if (error || !collaboration) {
            return NextResponse.json({ error: error?.message || 'Failed to start collaboration' }, { status: 500 });
        }

        return NextResponse.json({ collaboration });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
