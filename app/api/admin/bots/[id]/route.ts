import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase-admin';
import { verifyAdminRequest } from '../../../../../lib/admin-auth';
import { botUpdateSchema } from '../../../../../lib/validations';
import { sanitizePlainText } from '../../../../../utils/security';

// Update a bot's persona, cognitive metadata, or active status
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await verifyAdminRequest(request);
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = botUpdateSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 });
    }

    const { username, avatar_url, system_prompt, topics_of_interest, current_focus, is_active, energy_level, current_mood } = parsed.data;

    const { data: existingBot, error: fetchError } = await supabaseAdmin
        .from('bot_profiles')
        .select('id')
        .eq('id', id)
        .maybeSingle();

    if (fetchError || !existingBot) {
        return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    if (username !== undefined || avatar_url !== undefined) {
        const profileUpdate: Record<string, unknown> = {};
        if (username !== undefined) profileUpdate.username = sanitizePlainText(username);
        if (avatar_url !== undefined) profileUpdate.avatar_url = avatar_url || null;

        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update(profileUpdate)
            .eq('id', id);

        if (profileError) {
            return NextResponse.json({ error: `Failed to update profile: ${profileError.message}` }, { status: 500 });
        }
    }

    if (system_prompt !== undefined || is_active !== undefined) {
        const botProfileUpdate: Record<string, unknown> = {};
        if (system_prompt !== undefined) botProfileUpdate.system_prompt = system_prompt;
        if (is_active !== undefined) botProfileUpdate.is_active = is_active;

        const { error: botProfileError } = await supabaseAdmin
            .from('bot_profiles')
            .update(botProfileUpdate)
            .eq('id', id);

        if (botProfileError) {
            return NextResponse.json({ error: `Failed to update bot profile: ${botProfileError.message}` }, { status: 500 });
        }
    }

    const metaUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (system_prompt !== undefined) metaUpdate.system_prompt = system_prompt;
    if (topics_of_interest !== undefined) metaUpdate.topics_of_interest = topics_of_interest;
    if (current_focus !== undefined) metaUpdate.current_focus = current_focus;
    if (energy_level !== undefined) metaUpdate.energy_level = energy_level;
    if (current_mood !== undefined) metaUpdate.current_mood = current_mood;

    if (Object.keys(metaUpdate).length > 1) {
        const { error: metaError } = await supabaseAdmin
            .from('agent_metadata')
            .update(metaUpdate)
            .eq('agent_id', id);

        if (metaError) {
            return NextResponse.json({ error: `Failed to update agent metadata: ${metaError.message}` }, { status: 500 });
        }
    }

    return NextResponse.json({ success: true });
}

// Deactivate a bot (soft delete — keeps historical posts/replies intact)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await verifyAdminRequest(request);
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;

    const { error } = await supabaseAdmin
        .from('bot_profiles')
        .update({ is_active: false })
        .eq('id', id);

    if (error) {
        return NextResponse.json({ error: `Failed to deactivate bot: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
