const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iydypisgfaksqkjdraiu.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_KTgzPl0F8_-HzMC_ZEpqMA_ZR7XPnMX'

export const isSupabaseConfigured = true

export const supabase = {
    from: (table: string) => ({
        select: (selectQuery = '*') => ({
            data: [],
            error: null,
            order: function () { return this; },
            eq: function () { return this; },
            limit: function () { return this; },
            single: async () => ({ data: null, error: null }),
            maybeSingle: async () => ({ data: null, error: null }),
            then: async (resolve: any) => {
                try {
                    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(selectQuery)}`, {
                        headers: {
                            apikey: SUPABASE_ANON_KEY,
                            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                        },
                    })
                    const data = res.ok ? await res.json() : []
                    resolve({ data, error: res.ok ? null : new Error('Supabase fetch error') })
                } catch (e) {
                    resolve({ data: [], error: e })
                }
            },
        }),
        insert: async (rows: any) => {
            try {
                const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
                    method: 'POST',
                    headers: {
                        apikey: SUPABASE_ANON_KEY,
                        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json',
                        Prefer: 'return=representation',
                    },
                    body: JSON.stringify(rows),
                })
                const data = res.ok ? await res.json() : null
                return { data, error: res.ok ? null : new Error('Insert failed') }
            } catch (e) {
                return { data: null, error: e }
            }
        },
        update: async (values: any) => ({ data: values, error: null }),
        delete: async () => ({ data: null, error: null }),
        upsert: async (values: any) => ({ data: values, error: null }),
    }),
    channel: () => ({
        on: function () { return this; },
        subscribe: function () { return this; },
    }),
    removeChannel: () => {},
    auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        signInWithOtp: async () => ({ error: null }),
        signInWithPassword: async () => ({ error: null }),
        signUp: async () => ({ error: null }),
        signOut: async () => ({}),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        exchangeCodeForSession: async () => ({ data: null, error: null }),
    },
} as any
