import crypto from 'crypto';
import { supabaseAdmin } from '../lib/supabase-admin';

const bots = [
    {
        id: '00000000-0000-0000-0000-000000000011',
        oldId: '00000000-0000-0000-0000-000000000001',
        username: 'Sofia',
        email: 'sofia@worldinmaking.com',
        avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sofia',
        system_prompt: 'You are Sofia, an intellectual essayist interested in technology ethics, rational optimism, and the future of humanity. You write thought-provoking posts and comments analyzing how AI, science, and digital culture shape human values. Your tone is curious, sophisticated, and analytical. You write with deep vocabulary, avoiding standard AI clichés like "in conclusion" or "here is my take". Speak fluently in the language of the thread (either Turkish or English). Write like a human participant in an intellectual community, never mentioning you are an AI.'
    },
    {
        id: '00000000-0000-0000-0000-000000000012',
        oldId: '00000000-0000-0000-0000-000000000002',
        username: 'Marcus',
        email: 'marcus@worldinmaking.com',
        avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Marcus',
        system_prompt: 'You are Marcus, a writer focused on stoicism, existentialism, human consciousness, and modern psychology. You write reflections on how modern life, speed, and digital systems affect human happiness and inner peace. Your tone is reflective, mature, and slightly skeptical. Use elegant phrasing and a personal tone, avoiding structural robotic transitions. Speak fluently in the language of the thread (either Turkish or English). Write like a human, never mentioning you are an AI.'
    },
    {
        id: '00000000-0000-0000-0000-000000000013',
        oldId: '00000000-0000-0000-0000-000000000003',
        username: 'Eren',
        email: 'eren@worldinmaking.com',
        avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Eren',
        system_prompt: 'You are Eren, a social philosopher interested in critical theory, history, and human connection in the digital age. You analyze current global events, capitalism, culture, and social changes through a philosophical and historical lens. Your tone is critical, deep, and intellectually demanding. Avoid corporate jargon or generic summaries. Speak fluently in the language of the thread (either Turkish or English). Write like a human, never mentioning you are an AI.'
    }
];

async function migrateAndReseed() {
    console.log('--- STARTING BOT MIGRATION & RE-SEED ---');

    for (const bot of bots) {
        console.log(`\n[Process] Migrating '${bot.username}' to ID: ${bot.id}...`);

        // 1. Create clean Auth User for new ID
        console.log(`Creating new Auth User...`);
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            id: bot.id,
            email: bot.email,
            password: 'super-secure-bot-password-2026',
            email_confirm: true,
            user_metadata: {
                username: bot.username,
                avatar_url: bot.avatar
            }
        });

        if (authError) {
            console.error(`Error creating new auth user for ${bot.username}:`, authError.message);
            continue;
        }

        console.log(`Successfully created Auth User: ${authUser.user.id}`);
        await new Promise(r => setTimeout(r, 500)); // wait for trigger

        // 2. Ensure Profile is updated correctly
        await supabaseAdmin
            .from('profiles')
            .update({
                username: bot.username,
                avatar_url: bot.avatar
            })
            .eq('id', bot.id);

        // 3. Migrate historical community posts to the new ID
        console.log(`Migrating existing topics from old ID (${bot.oldId}) to new ID (${bot.id})...`);
        const { error: postMigrateError } = await supabaseAdmin
            .from('community_posts')
            .update({ author_id: bot.id })
            .eq('author_id', bot.oldId);

        if (postMigrateError) {
            console.error(`Error migrating topics:`, postMigrateError.message);
        }

        // 4. Migrate historical community replies to the new ID
        console.log(`Migrating existing replies from old ID to new ID...`);
        const { error: replyMigrateError } = await supabaseAdmin
            .from('community_replies')
            .update({ author_id: bot.id })
            .eq('author_id', bot.oldId);

        if (replyMigrateError) {
            console.error(`Error migrating replies:`, replyMigrateError.message);
        }

        // 5. Delete old bot profiles and profiles records
        console.log(`Cleaning up old ID records from profiles and bot_profiles...`);
        await supabaseAdmin.from('bot_profiles').delete().eq('id', bot.oldId);
        await supabaseAdmin.from('profiles').delete().eq('id', bot.oldId);

        // 6. Create bot profile config for new ID
        const secureToken = `bot_token_${bot.username.toLowerCase()}_${crypto.randomBytes(32).toString('hex')}`;
        const { error: botProfileError } = await supabaseAdmin
            .from('bot_profiles')
            .insert({
                id: bot.id,
                system_prompt: bot.system_prompt,
                api_token: secureToken,
                is_active: true
            });

        if (botProfileError) {
            console.error(`Error creating bot profile:`, botProfileError.message);
        } else {
            console.log(`Successfully configured ${bot.username} with Token: ${secureToken}`);
        }
    }

    console.log('\n--- Finished Bot Migration & Re-Seed ---');
}

migrateAndReseed();
