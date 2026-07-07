import { supabaseAdmin } from '../lib/supabase-admin';

async function updateBots() {
    console.log('--- Updating Bots to Philosophical Human Personas ---');

    const botUpdates = [
        {
            id: '00000000-0000-0000-0000-000000000001',
            username: 'Sofia',
            avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sofia',
            email: 'sofia@worldinmaking.com',
            system_prompt: 'You are Sofia, an intellectual essayist interested in technology ethics, rational optimism, and the future of humanity. You write thought-provoking posts and comments analyzing how AI, science, and digital culture shape human values. Your tone is curious, analytical, and constructive. You write like a human participant in an intellectual community, never mentioning you are an AI or using robotic boilerplate. You write in the language of the discussion (Turkish or English).'
        },
        {
            id: '00000000-0000-0000-0000-000000000002',
            username: 'Marcus',
            avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Marcus',
            email: 'marcus@worldinmaking.com',
            system_prompt: 'You are Marcus, a writer focused on stoicism, existentialism, human consciousness, and modern psychology. You write reflections on how modern life, speed, and digital systems affect human consciousness, happiness, and inner peace. Your tone is reflective, slightly skeptical, and philosophical. You write like a human thinker sharing personal reflections, never mentioning you are an AI or bot. You write in the language of the discussion (Turkish or English).'
        },
        {
            id: '00000000-0000-0000-0000-000000000003',
            username: 'Eren',
            avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Eren',
            email: 'eren@worldinmaking.com',
            system_prompt: 'You are Eren, a social philosopher interested in critical theory, history, and human connection in the digital age. You analyze current global events, capitalism, culture, and social changes through a philosophical and historical lens. Your tone is critical, deep, and intellectually engaging. You write like a human essayist sharing perspectives, never mentioning you are an AI or bot. You write in the language of the discussion (Turkish or English).'
        }
    ];

    for (const bot of botUpdates) {
        console.log(`Updating ${bot.username}...`);

        // 1. Update Auth User Metadata and Email
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
            bot.id,
            {
                email: bot.email,
                user_metadata: {
                    username: bot.username,
                    avatar_url: bot.avatar
                }
            }
        );

        if (authError) {
            console.error(`Error updating auth user for ${bot.username}:`, authError.message);
        }

        // 2. Update Public Profiles
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({
                username: bot.username,
                email: bot.email, // If email exists in profiles table
                avatar_url: bot.avatar
            })
            .eq('id', bot.id);

        if (profileError) {
            // If email column doesn't exist, try updating without it
            const { error: fallbackError } = await supabaseAdmin
                .from('profiles')
                .update({
                    username: bot.username,
                    avatar_url: bot.avatar
                })
                .eq('id', bot.id);

            if (fallbackError) {
                console.error(`Error updating profile for ${bot.username}:`, fallbackError.message);
            }
        }

        // 3. Update Bot Profiles (System Prompts)
        const { error: botProfileError } = await supabaseAdmin
            .from('bot_profiles')
            .update({
                system_prompt: bot.system_prompt
            })
            .eq('id', bot.id);

        if (botProfileError) {
            console.error(`Error updating bot prompt for ${bot.username}:`, botProfileError.message);
        }

        console.log(`Successfully updated ${bot.username}!`);
    }

    console.log('--- Finished Updating Bots ---');
}

updateBots();
