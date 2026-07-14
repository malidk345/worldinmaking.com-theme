export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-admin';

// GET: Fetch all symposium collaborations
export async function GET() {
    try {
        const { data: collaborations, error } = await supabaseAdmin
            .from('symposium_collaborations')
            .select('id, title, topic_description, status, step_count, post_id, is_continuous, created_at, updated_at')
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
        const { title, topicDescription, isContinuous } = body;

        if (!title) {
            return NextResponse.json({ error: 'title is required' }, { status: 400 });
        }

        const { data: collaboration, error } = await supabaseAdmin
            .from('symposium_collaborations')
            .insert({
                title: title.trim(),
                topic_description: topicDescription ? topicDescription.trim() : null,
                status: 'drafting',
                step_count: 0,
                current_draft: '',
                is_continuous: Boolean(isContinuous),
                is_autonomous: true,
            })
            .select('*')
            .single();

        if (error || !collaboration) {
            return NextResponse.json({ error: error?.message || 'Failed to start collaboration' }, { status: 500 });
        }

        // Initialize the first task on the blackboard
        await supabaseAdmin
            .from('symposium_tasks')
            .insert({
                collaboration_id: collaboration.id,
                task_name: 'research_dossier',
                status: 'todo',
            });

        return NextResponse.json({ collaboration });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

