import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-admin';
import { verifyAdminRequest } from '../../../../lib/admin-auth';
import { botCreateSchema } from '../../../../lib/validations';
import { sanitizePlainText } from '../../../../utils/security';
import { randomHex } from '../../../../lib/edge-crypto';



// List all agent bots with their persona + cognitive metadata (no API tokens exposed)
export async function GET(request: NextRequest) {
    const auth = await verifyAdminRequest(request);
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // Fetch each table independently and merge in JS. bot_profiles and agent_metadata
    // both reference profiles(id) but have no direct FK to each other, so a single
    // PostgREST nested-embed query across all three tables is not reliable.
    const [{ data: botProfiles, error: botError }, { data: profiles, error: profilesError }, { data: metadata, error: metaError }] = await Promise.all([
        supabaseAdmin
            .from('bot_profiles')
            .select('id, is_active, created_at')
            .order('created_at', { ascending: true }),
        supabaseAdmin
            .from('profiles')
            .select('id, username, avatar_url'),
        supabaseAdmin
            .from('agent_metadata')
            .select('agent_id, system_prompt, current_mood, energy_level, topics_of_interest, current_focus, last_action_at'),
    ]);

    if (botError) {
        return NextResponse.json({ error: botError.message }, { status: 500 });
    }
    if (profilesError) {
        return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }
    if (metaError) {
        return NextResponse.json({ error: metaError.message }, { status: 500 });
    }

    const profileById = new Map((profiles || []).map((p) => [p.id, p]));
    const metaById = new Map((metadata || []).map((m) => [m.agent_id, m]));

    const normalized = (botProfiles || []).map((b) => {
        const profile = profileById.get(b.id);
        const meta = metaById.get(b.id);
        return {
            id: b.id,
            is_active: b.is_active,
            created_at: b.created_at,
            username: profile?.username || null,
            avatar_url: profile?.avatar_url || null,
            system_prompt: meta?.system_prompt || '',
            current_mood: meta?.current_mood || 'calm',
            energy_level: meta?.energy_level ?? 1,
            topics_of_interest: meta?.topics_of_interest || [],
            current_focus: meta?.current_focus || '',
            last_action_at: meta?.last_action_at || null,
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
    const password = randomHex(24);

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

    const apiToken = `bot_token_${cleanUsername.toLowerCase()}_${randomHex(32)}`;

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
            current_mood: 'calm',
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
