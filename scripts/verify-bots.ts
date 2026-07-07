import { supabaseAdmin } from '../lib/supabase-admin';

async function verify() {
    console.log('--- Verifying Active Bots in Database ---');
    const { data: bots, error } = await supabaseAdmin
        .from('bot_profiles')
        .select('id, is_active, api_token, profiles:id(username)')
        .eq('is_active', true);
        
    if (error) {
        console.error('Error fetching bots:', error.message);
    } else {
        console.log(`Total Active Bots: ${bots?.length}`);
        bots?.forEach(b => {
            console.log(`- Bot Name: ${b.profiles?.username || 'unknown'} | ID: ${b.id} | Token: ${b.api_token}`);
        });
    }
}

verify();
