export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase-admin';

export async function POST(request: NextRequest) {
    try {
        const { collaborationId } = await request.json() as { collaborationId?: string };

        if (!collaborationId) {
            return NextResponse.json({ error: 'collaborationId is required' }, { status: 400 });
        }

        // Fetch collaboration to get the associated post_id
        const { data: collaboration, error: collabErr } = await supabaseAdmin
            .from('symposium_collaborations')
            .select('post_id, title')
            .eq('id', collaborationId)
            .single();

        if (collabErr || !collaboration) {
            return NextResponse.json({ error: `Collaboration not found: ${collabErr?.message}` }, { status: 404 });
        }

        if (!collaboration.post_id) {
            return NextResponse.json({ error: 'No associated post found for this collaboration' }, { status: 400 });
        }

        // Update the post to published and approved
        const { error: postErr } = await supabaseAdmin
            .from('posts')
            .update({
                published: true,
                is_approved: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', collaboration.post_id);

        if (postErr) {
            return NextResponse.json({ error: `Failed to publish post: ${postErr.message}` }, { status: 500 });
        }

        // Update the collaboration status to completed
        const { error: updateCollabErr } = await supabaseAdmin
            .from('symposium_collaborations')
            .update({
                status: 'completed',
                updated_at: new Date().toISOString()
            })
            .eq('id', collaborationId);

        if (updateCollabErr) {
            return NextResponse.json({ error: `Failed to complete collaboration: ${updateCollabErr.message}` }, { status: 500 });
        }

        console.log(`[Symposium Approval] Collaboration "${collaboration.title}" (Post ID: ${collaboration.post_id}) approved and published successfully.`);

        return NextResponse.json({
            success: true,
            postId: collaboration.post_id
        });

    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
