import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iydypisgfaksqkjdraiu.supabase.co'
const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'sb_publishable_KTgzPl0F8_-HzMC_ZEpqMA_ZR7XPnMX'

let adminClient: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
    if (!adminClient) {
        const trimmedUrl = supabaseUrl.trim().replace(/^["'](.*)["\']$/, '$1')
        const trimmedKey = supabaseServiceKey.trim().replace(/^["'](.*)["\']$/, '$1')

        adminClient = createClient(trimmedUrl, trimmedKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        })
    }
    return adminClient
}
