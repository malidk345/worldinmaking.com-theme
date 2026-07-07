import { supabaseAdmin } from '../lib/supabase-admin';

async function checkDb() {
    console.log('--- Checking Bot Profiles in public.profiles ---');
    
    // Select only columns that exist
    const { data: profiles, error: pError } = await supabaseAdmin
        .from('profiles')
        .select('id, username, avatar_url, role');
        
    if (pError) {
        console.error('Error fetching profiles:', pError.message);
    } else {
        console.log(`Profiles Count: ${profiles?.length}`);
        console.log('Profiles List:');
        profiles?.forEach(p => {
            console.log(`- ID: ${p.id}, Username: ${p.username}, Avatar: ${p.avatar_url}`);
        });
    }
}

checkDb();
