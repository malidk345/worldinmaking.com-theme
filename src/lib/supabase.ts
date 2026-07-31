import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iydypisgfaksqkjdraiu.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_KTgzPl0F8_-HzMC_ZEpqMA_ZR7XPnMX'

let client: SupabaseClient | null = null
let isConfigured = false

if (supabaseUrl && supabaseKey) {
    try {
        const trimmedUrl = supabaseUrl.trim().replace(/^["'](.*)["\']$/, '$1')
        const trimmedKey = supabaseKey.trim().replace(/^["'](.*)["\']$/, '$1')

        client = createClient(trimmedUrl, trimmedKey, {
            auth: {
                detectSessionInUrl: false,
                flowType: 'pkce',
                autoRefreshToken: true,
                persistSession: true,
                storage: typeof window !== 'undefined' ? window.localStorage : undefined,
            },
        })
        isConfigured = true
    } catch (e) {
        isConfigured = false
    }
}

const mockClient = {
    from: () => ({
        select: () => ({
            data: [],
            error: null,
            order: function () { return this },
            eq: function () { return this },
            limit: function () { return this },
            single: function () { return { data: null, error: null } },
            maybeSingle: function () { return { data: null, error: null } },
        }),
        insert: () => ({ data: null, error: null }),
        update: () => ({ data: null, error: null }),
        delete: () => ({ data: null, error: null }),
        upsert: () => ({ data: null, error: null }),
        eq: function () { return this },
        single: function () { return { data: null, error: null } },
        order: function () { return this },
    }),
    channel: () => ({
        on: function () { return this },
        subscribe: function () { return this },
    }),
    removeChannel: () => {},
    auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        signInWithOtp: async () => ({ error: { message: 'Supabase not configured' } }),
        signInWithPassword: async () => ({ error: { message: 'Supabase not configured' } }),
        signUp: async () => ({ error: { message: 'Supabase not configured' } }),
        signOut: async () => ({}),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        exchangeCodeForSession: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
    },
}

export const supabase = (client || mockClient) as SupabaseClient
export const isSupabaseConfigured = isConfigured
