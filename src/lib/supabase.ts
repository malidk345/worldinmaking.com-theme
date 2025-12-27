import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient;

// Debug: Log environment variable status (not the actual values for security)
if (typeof window !== 'undefined') {
    console.log('[Supabase] URL defined:', !!supabaseUrl);
    console.log('[Supabase] Key defined:', !!supabaseKey);
    if (supabaseUrl) {
        console.log('[Supabase] URL starts with:', supabaseUrl.substring(0, 30) + '...');
    }
}

if (supabaseUrl && supabaseKey) {
    try {
        // Trim whitespace just in case user copied with spaces
        const trimmedUrl = supabaseUrl.trim().replace(/^["'](.*)["\']$/, '$1'); // Remove quotes if present
        const trimmedKey = supabaseKey.trim().replace(/^["'](.*)["\']$/, '$1');

        // Validate URL format
        if (!trimmedUrl.includes('supabase.co')) {
            console.error('[Supabase] Invalid URL format. Expected supabase.co domain.');
        }

        client = createClient(trimmedUrl, trimmedKey, {
            auth: {
                detectSessionInUrl: true,
                flowType: 'pkce',
                autoRefreshToken: true,
                persistSession: true,
                storage: typeof window !== 'undefined' ? window.localStorage : undefined,
            }
        });
        console.log('[Supabase] Client initialized successfully with auth options');
    } catch (e) {
        console.error('[Supabase] Init failed:', e);
        // Fallback dummy - will cause auth to fail but won't crash
        client = createClient('https://example.supabase.co', 'public-anon-key');
    }
} else {
    console.error('[Supabase] Environment variables missing!');
    console.error('[Supabase] Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set');
    console.error('[Supabase] In Cloudflare: Settings → Environment Variables');
    // Fallback dummy
    client = createClient('https://example.supabase.co', 'public-anon-key');
}

export const supabase = client;
