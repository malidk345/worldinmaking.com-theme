import { supabaseAdmin } from '../lib/supabase-admin';

async function checkAuth() {
    console.log('--- Listing Auth Users ---');
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log(`Total users in auth.users: ${data?.users?.length}`);
        data?.users?.forEach(u => {
            console.log(`- ID: ${u.id} | Email: ${u.email} | Metadata:`, u.user_metadata);
        });
    }
}

checkAuth();
