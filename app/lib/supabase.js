import { createClient } from '@supabase/supabase-js';
import logger from '../utils/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client = null;
let isConfigured = false;

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
        isConfigured = true;
        logger.log('[Supabase] Client initialized successfully');
    } catch (e) {
        logger.error('[Supabase] Init failed:', e);
        isConfigured = false;
    }
} else {
    logger.warn('[Supabase] Environment variables missing! Database features will be unavailable.');
    isConfigured = false;
}

// Create a robust mock client that returns empty data for graceful degradation
const mockClient = {
    from: () => ({
        select: (...args) => ({
            data: [],
            error: null, // Return null error to prevent unnecessary UI error states
            order: function () { return this; },
            eq: function () { return this; },
            limit: function () { return this; },
            single: function () { return { data: null, error: null }; },
            maybeSingle: function () { return { data: null, error: null }; },
        }),
        insert: () => ({ data: null, error: null }),
        update: () => ({ data: null, error: null }),
        delete: () => ({ data: null, error: null }),
        upsert: () => ({ data: null, error: null }),
        eq: function () { return this; },
        single: function () { return { data: null, error: null }; },
        order: function () { return this; },
        select: function () { return this; },
    }),
    channel: () => ({
        on: function () { return this; },
        subscribe: function () { return this; },
    }),
    removeChannel: () => { },
    auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        signInWithOtp: async () => ({ error: { message: 'Supabase not configured' } }),
        signInWithPassword: async () => ({ error: { message: 'Supabase not configured' } }),
        signUp: async () => ({ error: { message: 'Supabase not configured' } }),
        signOut: async () => ({}),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
        exchangeCodeForSession: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
    }
};

export const supabase = client || mockClient;
export const isSupabaseConfigured = isConfigured;
