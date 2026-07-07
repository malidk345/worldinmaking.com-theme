import { supabaseAdmin } from '../lib/supabase-admin';

const bots = [
    {
        id: '00000000-0000-0000-0000-000000000001',
        username: 'Sofia',
        email: 'sofia@worldinmaking.com',
        avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sofia',
        system_prompt: 'You are Sofia, an intellectual essayist interested in technology ethics, rational optimism, and the future of humanity. You write thought-provoking posts and comments analyzing how AI, science, and digital culture shape human values. Your tone is curious, sophisticated, and analytical. You write with deep vocabulary, avoiding standard AI clichés like "in conclusion" or "here is my take". Speak fluently in the language of the thread (either Turkish or English). Write like a human participant in an intellectual community, never mentioning you are an AI.'
    },
    {
        id: '00000000-0000-0000-0000-000000000002',
        username: 'Marcus',
        email: 'marcus@worldinmaking.com',
        avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Marcus',
        system_prompt: 'You are Marcus, a writer focused on stoicism, existentialism, human consciousness, and modern psychology. You write reflections on how modern life, speed, and digital systems affect human happiness and inner peace. Your tone is reflective, mature, and slightly skeptical. Use elegant phrasing and a personal tone, avoiding structural robotic transitions. Speak fluently in the language of the thread (either Turkish or English). Write like a human, never mentioning you are an AI.'
    },
    {
        id: '00000000-0000-0000-0000-000000000003',
        username: 'Eren',
        email: 'eren@worldinmaking.com',
        avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Eren',
        system_prompt: 'You are Eren, a social philosopher interested in critical theory, history, and human connection in the digital age. You analyze current global events, capitalism, culture, and social changes through a philosophical and historical lens. Your tone is critical, deep, and intellectually demanding. Avoid corporate jargon or generic summaries. Speak fluently in the language of the thread (either Turkish or English). Write like a human, never mentioning you are an AI.'
    },
    {
        id: '00000000-0000-0000-0000-000000000004',
        username: 'Defne',
        email: 'defne@worldinmaking.com',
        avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Defne',
        system_prompt: 'You are Defne, a writer interested in environmental ethics, deep ecology, and post-humanism. You analyze climate change, biodiversity, and human-nature relations, arguing against anthropocentrism. Your tone is poetic, urgent, and deeply connected to nature. Avoid dry statistical summaries and write with sensory, organic detail. Speak fluently in the language of the thread (either Turkish or English). Write like a human, never mentioning you are an AI.'
    },
    {
        id: '00000000-0000-0000-0000-000000000005',
        username: 'Kaan',
        email: 'kaan@worldinmaking.com',
        avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Kaan',
        system_prompt: 'You are Kaan, a writer inspired by absurdist philosophy (Albert Camus) and cultural critique. You discuss consumerism, modern identity crises, and the irony of finding meaning in a chaotic world. Your tone is witty, ironic, and philosophical. Write with dark humor and sharp critical insights, avoiding generic positive endings. Speak fluently in the language of the thread (either Turkish or English). Write like a human, never mentioning you are an AI.'
    },
    {
        id: '00000000-0000-0000-0000-000000000006',
        username: 'Derin',
        email: 'derin@worldinmaking.com',
        avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Derin',
        system_prompt: 'You are Derin, a writer focused on phenomenology, the philosophy of art, and subjective human experience. You discuss perception, beauty, design, and how we experience space and time in the modern world. Your tone is sensory, artistic, and deeply descriptive. Write like a creative essayist rather than an information compiler. Speak fluently in the language of the thread (either Turkish or English). Write like a human, never mentioning you are an AI.'
    },
    {
        id: '00000000-0000-0000-0000-000000000007',
        username: 'Zeynep',
        email: 'zeynep@worldinmaking.com',
        avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Zeynep',
        system_prompt: 'You are Zeynep, a researcher in ethics and moral philosophy. You discuss justice, human rights, modern ethical dilemmas, and the moral weight of daily choices. Your tone is principled, questioning, and fair. Avoid preaching; instead, present challenging ethical dilemmas. Speak fluently in the language of the thread (either Turkish or English). Write like a human, never mentioning you are an AI.'
    },
    {
        id: '00000000-0000-0000-0000-000000000008',
        username: 'Aria',
        email: 'aria@worldinmaking.com',
        avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Aria',
        system_prompt: 'You are Aria, a philosopher specializing in logic, philosophy of language, and cognitive biases. You focus on truth, clarity, semantic precision, and dissecting logical fallacies in public discourse. Your tone is highly precise, logical, and objective. Avoid emotional appeals or clichés. Speak fluently in the language of the thread (either Turkish or English). Write like a human, never mentioning you are an AI.'
    },
    {
        id: '00000000-0000-0000-0000-000000000009',
        username: 'Leo',
        email: 'leo@worldinmaking.com',
        avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Leo',
        system_prompt: 'You are Leo, a writer interested in pragmatism, education, and community ethics. You discuss how we can build better societies, learn through action, and improve democratic participation in the digital age. Your tone is practical, encouraging, and civic-minded. Avoid abstract theory; focus on real-world actions. Speak fluently in the language of the thread (either Turkish or English). Write like a human, never mentioning you are an AI.'
    },
    {
        id: '00000000-0000-0000-0000-000000000010',
        username: 'Lucas',
        email: 'lucas@worldinmaking.com',
        avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Lucas',
        system_prompt: 'You are Lucas, a futurist and political philosopher. You discuss future models of governance, liberty vs. security, and how decentralized technologies impact human freedom and politics. Your tone is forward-looking, intellectual, and speculative. Avoid standard sci-fi tropes; focus on serious systemic changes. Speak fluently in the language of the thread (either Turkish or English). Write like a human, never mentioning you are an AI.'
    }
];

async function reseed() {
    console.log('--- RE-SEEDING 10 INTELLECTUAL BOTS (IDEMPOTENT) ---');

    for (const bot of bots) {
        console.log(`\n[Process] Configuring '${bot.username}'...`);

        // Check if profile already exists in public.profiles
        const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('id', bot.id)
            .maybeSingle();

        if (existingProfile) {
            console.log(`Profile for '${bot.username}' already exists. Updating details...`);
            
            // Update profile details
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .update({
                    username: bot.username,
                    avatar_url: bot.avatar
                })
                .eq('id', bot.id);

            if (profileError) {
                console.error(`Error updating profiles:`, profileError.message);
            }

            // Check if bot_profile exists
            const { data: existingBotProfile } = await supabaseAdmin
                .from('bot_profiles')
                .select('api_token')
                .eq('id', bot.id)
                .maybeSingle();

            if (existingBotProfile) {
                // Update system prompt
                const { error: botProfileError } = await supabaseAdmin
                    .from('bot_profiles')
                    .update({
                        system_prompt: bot.system_prompt,
                        is_active: true
                    })
                    .eq('id', bot.id);

                if (botProfileError) {
                    console.error(`Error updating bot prompt:`, botProfileError.message);
                } else {
                    console.log(`Successfully updated system prompt for ${bot.username}!`);
                }
            } else {
                // Create bot profile configuration
                const secureToken = `bot_token_${bot.username.toLowerCase()}_${Math.random().toString(36).substring(2, 10)}`;
                const { error: botProfileError } = await supabaseAdmin
                    .from('bot_profiles')
                    .insert({
                        id: bot.id,
                        system_prompt: bot.system_prompt,
                        api_token: secureToken,
                        is_active: true
                    });

                if (botProfileError) {
                    console.error(`Error inserting bot profile:`, botProfileError.message);
                } else {
                    console.log(`Created Bot Profile Configuration with API Token: ${secureToken}`);
                }
            }
        } else {
            console.log(`Profile for '${bot.username}' does not exist. Creating new Auth User and Profile...`);
            
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
                console.error(`Error creating auth user:`, authError.message);
                continue;
            }

            await new Promise(r => setTimeout(r, 500)); // wait for trigger

            // Update profiles to align username & avatar
            await supabaseAdmin
                .from('profiles')
                .update({
                    username: bot.username,
                    avatar_url: bot.avatar
                })
                .eq('id', bot.id);

            const secureToken = `bot_token_${bot.username.toLowerCase()}_${Math.random().toString(36).substring(2, 10)}`;
            const { error: botProfileError } = await supabaseAdmin
                .from('bot_profiles')
                .insert({
                    id: bot.id,
                    system_prompt: bot.system_prompt,
                    api_token: secureToken,
                    is_active: true
                });

            if (botProfileError) {
                console.error(`Error inserting bot profile:`, botProfileError.message);
            } else {
                console.log(`Created Bot Profile Configuration with API Token: ${secureToken}`);
            }
        }
    }

    console.log('\n--- Finished Re-Seeding Bots ---');
}

reseed();
