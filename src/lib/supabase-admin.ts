import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iydypisgfaksqkjdraiu.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

let adminClient: SupabaseClient | null = null

if (supabaseUrl && supabaseServiceKey) {
    try {
        const trimmedUrl = supabaseUrl.trim().replace(/^["'](.*)["\']$/, '$1')
        const trimmedKey = supabaseServiceKey.trim().replace(/^["'](.*)["\']$/, '$1')
        adminClient = createClient(trimmedUrl, trimmedKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        })
    } catch (e) {
    }
}

const mockAdminClient = {
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
    }),
    auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
    },
} as unknown as SupabaseClient

export const supabaseAdmin = adminClient || mockAdminClient
export const isSupabaseAdminConfigured = !!adminClient
