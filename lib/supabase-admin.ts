import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl) {
    console.warn('[Supabase Admin] NEXT_PUBLIC_SUPABASE_URL is missing!');
}
if (!supabaseServiceKey) {
    console.warn('[Supabase Admin] SUPABASE_SERVICE_ROLE_KEY is missing! Admin operations will fail.');
}

// Create a client with the service role key to bypass RLS policies on the server side
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});
