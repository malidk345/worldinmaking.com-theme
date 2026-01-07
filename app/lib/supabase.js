import { createClient } from '@supabase/supabase-js';
import logger from '../utils/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client;

// Debug: Log environment variable status (not the actual values for security)
if (typeof window !== 'undefined') {
    logger.log('[Supabase] URL defined:', !!supabaseUrl);
    logger.log('[Supabase] Key defined:', !!supabaseKey);
}

if (supabaseUrl && supabaseKey) {
    try {
        // Trim whitespace just in case user copied with spaces
        const trimmedUrl = supabaseUrl.trim().replace(/^["'](.*)["\']$/, '$1'); // Remove quotes if present
        const trimmedKey = supabaseKey.trim().replace(/^["'](.*)["\']$/, '$1');

        client = createClient(trimmedUrl, trimmedKey, {
            auth: {
                detectSessionInUrl: false, // We will handle this manually in AuthContext to avoid race conditions
                flowType: 'pkce',
                autoRefreshToken: true,
                persistSession: true,
                storage: typeof window !== 'undefined' ? window.localStorage : undefined,
            }
        });
        logger.log('[Supabase] Client initialized successfully');
    } catch (e) {
        logger.error('[Supabase] Init failed:', e);
        // Fallback dummy
        client = createClient('https://example.supabase.co', 'public-anon-key');
    }
} else {
    logger.error('[Supabase] Environment variables missing!');
    client = createClient('https://example.supabase.co', 'public-anon-key');
}

export const supabase = client;
