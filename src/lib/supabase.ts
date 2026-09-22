import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { createGuardedRealtimeDecode } from './realtime-decode'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

let client: SupabaseClient | null = null
let isConfigured = false

// Holds the realtime client so the guarded decoder can reuse its serializer.
let realtimeClient: { serializer?: { decode: RealtimeSerializerDecode } } | null = null
type RealtimeSerializerDecode = (rawPayload: unknown, callback: (message: unknown) => void) => void
type SupabaseRealtimeDecode = NonNullable<NonNullable<Parameters<typeof createClient>[2]>['realtime']>['decode']

// Running count of malformed realtime frames we dropped. A truncated frame
// throws inside the socket `onmessage` callback; the guard below swallows it so
// the channel survives, and this counter keeps that recovery visible instead of
// silent.
let droppedRealtimeFrames = 0

const guardedRealtimeDecode = createGuardedRealtimeDecode(
    (rawPayload) => {
        // Reuse realtime-js's own serializer so string and binary frames decode
        // exactly as the library expects; we only add a guard around the parse.
        let decoded: unknown
        realtimeClient?.serializer?.decode(rawPayload, (message) => {
            decoded = message
        })
        return decoded
    },
    (error) => {
        droppedRealtimeFrames += 1
        console.warn(`[Supabase] Dropped malformed realtime frame (#${droppedRealtimeFrames})`, error)
        if (typeof window !== 'undefined') {
            void import('./wim-posthog')
                .then(({ trackEvent }) => trackEvent('realtime_frame_dropped', { total_dropped: droppedRealtimeFrames }))
                .catch(() => {
                    /* observability is best-effort */
                })
        }
    }
)

if (supabaseUrl && supabaseKey) {
    try {
        const trimmedUrl = supabaseUrl.trim().replace(/^["'](.*)["\']$/, '$1')
        const trimmedKey = supabaseKey.trim().replace(/^["'](.*)["\']$/, '$1')

        client = createClient(trimmedUrl, trimmedKey, {
            auth: {
                // Auto-detect on normal pages (magic link / recovery). Off on
                // /auth/callback so we exchange the Google PKCE code once.
                detectSessionInUrl:
                    typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth/callback'),
                flowType: 'pkce',
                autoRefreshToken: true,
                persistSession: true,
                storage: typeof window !== 'undefined' ? window.localStorage : undefined,
            },
            realtime: {
                // realtime-js types the decoder against its own frame shapes; the
                // guard is deliberately library-agnostic, so bridge it here.
                decode: guardedRealtimeDecode as unknown as SupabaseRealtimeDecode,
            },
        })
        realtimeClient = (client as unknown as { realtime?: typeof realtimeClient }).realtime ?? null
        isConfigured = true
    } catch (e) {
        console.error('[Supabase] Init failed:', e)
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
        subscribe: function (cb?: (status: string) => void) {
            cb?.('SUBSCRIBED')
            return this
        },
        track: async function () { return 'ok' },
        untrack: async function () { return 'ok' },
        presenceState: function () { return {} },
    }),
    removeChannel: () => {},
    getChannels: () => [],
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
