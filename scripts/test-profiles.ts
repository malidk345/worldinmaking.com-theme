import { supabaseAdmin } from '../lib/supabase-admin';

async function testProfiles() {
    console.log('--- Testing Query Profile for Sofia ---');
    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id, username')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .maybeSingle();
        
    console.log('Data:', data);
    console.log('Error:', error);
}

testProfiles();
