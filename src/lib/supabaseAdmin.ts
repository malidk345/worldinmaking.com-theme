import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()

let adminClient: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error(
            'Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
        )
    }
    if (!adminClient) {
        const trimmedUrl = supabaseUrl.replace(/^["'](.*)["']$/, '$1')
        const trimmedKey = supabaseServiceKey.replace(/^["'](.*)["']$/, '$1')

        adminClient = createClient(trimmedUrl, trimmedKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        })
    }
    return adminClient
}
