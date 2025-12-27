import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client;

if (supabaseUrl && supabaseKey) {
    try {
        // Trim whitespace just in case user copied with spaces
        const trimmedUrl = supabaseUrl.trim().replace(/^["'](.*)["']$/, '$1'); // Remove quotes if present
        const trimmedKey = supabaseKey.trim().replace(/^["'](.*)["']$/, '$1');

        client = createClient(trimmedUrl, trimmedKey);
    } catch (e) {
        console.error('Supabase init failed:', e);
        // Fallback dummy
        client = createClient('https://example.supabase.co', 'public-anon-key');
    }
} else {
    if (typeof window !== 'undefined') {
        console.error('Supabase keys missing in .env.local.');
    }
    client = createClient('https://example.supabase.co', 'public-anon-key');
}

export const supabase = client;
