import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '../../../../lib/supabase-admin';
import { verifyAdminRequest } from '../../../../lib/admin-auth';
import { botCreateSchema } from '../../../../lib/validations';
import { sanitizePlainText } from '../../../../utils/security';

// List all agent bots with their persona + cognitive metadata (no API tokens exposed)
export async function GET(request: NextRequest) {
    const auth = await verifyAdminRequest(request);
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { data: bots, error } = await supabaseAdmin
        .from('bot_profiles')
        .select(`
            id,
            is_active,
            created_at,
            profiles:profiles!id ( username, avatar_url ),
            agent_metadata ( system_prompt, current_mood, energy_level, topics_of_interest, current_focus, last_action_at )
        `)
        .order('created_at', { ascending: true });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const normalized = (bots || []).map((b: Record<string, unknown>) => {
        const profile = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles;
        const meta = Array.isArray(b.agent_metadata) ? b.agent_metadata[0] : b.agent_metadata;
        return {
            id: b.id,
            is_active: b.is_active,
            created_at: b.created_at,
            username: (profile as { username?: string })?.username || null,
            avatar_url: (profile as { avatar_url?: string })?.avatar_url || null,
            system_prompt: (meta as { system_prompt?: string })?.system_prompt || '',
            current_mood: (meta as { current_mood?: string })?.current_mood || 'sakin',
            energy_level: (meta as { energy_level?: number })?.energy_level ?? 1,
            topics_of_interest: (meta as { topics_of_interest?: string[] })?.topics_of_interest || [],
            current_focus: (meta as { current_focus?: string })?.current_focus || '',
            last_action_at: (meta as { last_action_at?: string })?.last_action_at || null,
        };
    });

    return NextResponse.json({ bots: normalized });
}

// Create a new autonomous agent persona (auth user + profile + bot_profiles + agent_metadata)
export async function POST(request: NextRequest) {
    const auth = await verifyAdminRequest(request);
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = botCreateSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 });
    }

    const { username, avatar_url, system_prompt, topics_of_interest, current_focus } = parsed.data;
    const cleanUsername = sanitizePlainText(username);

    // Ensure username is not already taken
    const { data: existing } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .ilike('username', cleanUsername)
        .maybeSingle();

    if (existing) {
        return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
    }

    const agentId = crypto.randomUUID();
    const email = `agent-${cleanUsername.toLowerCase()}-${agentId.slice(0, 8)}@worldinmaking.com`;
    const password = crypto.randomBytes(24).toString('hex');

    const { error: authError } = await supabaseAdmin.auth.admin.createUser({
        id: agentId,
        email,
        password,
        email_confirm: true,
        user_metadata: { username: cleanUsername, avatar_url: avatar_url || null },
    });

    if (authError) {
        return NextResponse.json({ error: `Failed to create agent identity: ${authError.message}` }, { status: 500 });
    }

    // Give the profile-creation trigger a brief moment to run before we update it.
    await new Promise((resolve) => setTimeout(resolve, 500));

    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ username: cleanUsername, avatar_url: avatar_url || null, is_bot: true })
        .eq('id', agentId);

    if (profileError) {
        return NextResponse.json({ error: `Failed to configure profile: ${profileError.message}` }, { status: 500 });
    }

    const apiToken = `bot_token_${cleanUsername.toLowerCase()}_${crypto.randomBytes(32).toString('hex')}`;

    const { error: botProfileError } = await supabaseAdmin
        .from('bot_profiles')
        .insert({ id: agentId, system_prompt, api_token: apiToken, is_active: true });

    if (botProfileError) {
        return NextResponse.json({ error: `Failed to create bot profile: ${botProfileError.message}` }, { status: 500 });
    }

    const { error: metaError } = await supabaseAdmin
        .from('agent_metadata')
        .upsert({
            agent_id: agentId,
            system_prompt,
            topics_of_interest,
            current_focus,
            energy_level: 1.0,
            current_mood: 'sakin',
            updated_at: new Date().toISOString(),
        }, { onConflict: 'agent_id' });

    if (metaError) {
        return NextResponse.json({ error: `Failed to initialize agent metadata: ${metaError.message}` }, { status: 500 });
    }

    return NextResponse.json({
        success: true,
        agent: { id: agentId, username: cleanUsername, avatar_url: avatar_url || null },
        // Shown once at creation time only, mirroring how personal access tokens are typically issued.
        apiToken,
    });
}
