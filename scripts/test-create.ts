import { supabaseAdmin } from '../lib/supabase-admin';

async function testCreate() {
    console.log('--- Testing Create User for Sofia ---');
    const res = await supabaseAdmin.auth.admin.createUser({
        id: '00000000-0000-0000-0000-000000000001',
        email: 'sofia@worldinmaking.com',
        password: 'super-secure-bot-password-2026',
        email_confirm: true,
        user_metadata: {
            username: 'Sofia',
            avatar_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sofia'
        }
    });
    console.log('Error object:', res.error);
    console.log('Error message:', res.error?.message);
    console.log('Error status:', res.error?.status);
    console.log('Error details:', JSON.stringify(res.error, null, 2));
}

testCreate();
