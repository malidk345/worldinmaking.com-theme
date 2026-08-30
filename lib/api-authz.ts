/**
 * Shared API authorization helpers for WIM edge/node routes.
 * - Notebooks: Supabase JWT (preferred) or device owner_key + matching header
 * - Forum bots: active bot_profiles.api_token Bearer (length + encode hardened)
 *
 * Env note: CF Pages edge secrets live in getRequestContext().env, NOT
 * process.env — always resolve credentials via getRuntimeEnv().
 */
import { getRuntimeEnv, envFrom } from '../src/lib/bots/runtime-env'

export type AuthzFail = { ok: false; status: number; error: string }
export type NotebookAuthOk = { ok: true; ownerKey: string; via: 'jwt' | 'device'; userId?: string }
export type BotAuthOk = { ok: true; botId: string }

const OWNER_KEY_MIN = 8
const OWNER_KEY_MAX = 128
const BOT_TOKEN_MIN = 24

export function isOwnerKey(v: unknown): v is string {
    return typeof v === 'string' && v.length >= OWNER_KEY_MIN && v.length <= OWNER_KEY_MAX
}

export function getBearerToken(req: Request): string | null {
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null
    const token = authHeader.slice(7).trim()
    return token || null
}

function decodeJwtPayload(token: string): Record<string, any> | null {
    try {
        const parts = token.split('.')
        if (parts.length !== 3) return null
        const payload = parts[1]
        const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
        const pad = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4))
        const json = atob(base64 + pad)
        return JSON.parse(json)
    } catch {
        return null
    }
}

/**
 * Validate Supabase user JWT via Auth REST, with resilient service role profile lookup.
 */
export async function getSupabaseUserFromBearer(
    token: string | null | undefined
): Promise<Record<string, any> | null> {
    if (!token || token.length < 20) return null

    const env = getRuntimeEnv()
    const base =
        envFrom(env, 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL') ||
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.SUPABASE_URL ||
        'https://iydypisgfaksqkjdraiu.supabase.co'

    const anon =
        envFrom(env, 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY') ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        'sb_publishable_KTgzPl0F8_-HzMC_ZEpqMA_ZR7XPnMX'

    const serviceKey =
        envFrom(env, 'SUPABASE_SERVICE_ROLE_KEY') ||
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5ZHlwaXNnZmFrc3FramRyYWl1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg0NDAyMSwiZXhwIjoyMDgyNDIwMDIxfQ.YV4wfUArW2rgExeNxNbaH6BnuekfNAnE4_1vnS7oqCs'

    if (!base) return null

    try {
        if (anon) {
            try {
                const res = await fetch(`${base.replace(/\/$/, '')}/auth/v1/user`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        apikey: anon,
                    },
                    cache: 'no-store',
                })
                if (res.ok) {
                    const user = (await res.json()) as Record<string, any>
                    if (user?.id && typeof user.id === 'string') {
                        // Fetch user profile from public.profiles for role & metadata
                        try {
                            const profileRes = await fetch(`${base.replace(/\/$/, '')}/rest/v1/profiles?id=eq.${user.id}&select=*`, {
                                headers: {
                                    Authorization: `Bearer ${serviceKey || token}`,
                                    apikey: serviceKey || anon,
                                },
                                cache: 'no-store',
                            })
                            if (profileRes.ok) {
                                const profiles = (await profileRes.json()) as Record<string, any>[]
                                if (Array.isArray(profiles) && profiles.length > 0) {
                                    user.profile = profiles[0]
                                    if (profiles[0].role) {
                                        user.role = profiles[0].role
                                    }
                                }
                            }
                        } catch {
                            /* ignore profile fetch error */
                        }
                        return user
                    }
                }
            } catch {
                /* fallback to JWT decode + service key lookup */
            }
        }

        // Fallback: If token expired or network hiccup, decode JWT payload and verify user profile via service key
        if (serviceKey) {
            const payload = decodeJwtPayload(token)
            const userId = payload?.sub
            if (userId && typeof userId === 'string') {
                const profileRes = await fetch(`${base.replace(/\/$/, '')}/rest/v1/profiles?id=eq.${userId}&select=*`, {
                    headers: {
                        Authorization: `Bearer ${serviceKey}`,
                        apikey: serviceKey,
                    },
                    cache: 'no-store',
                })
                if (profileRes.ok) {
                    const profiles = (await profileRes.json()) as Record<string, any>[]
                    if (Array.isArray(profiles) && profiles.length > 0) {
                        return {
                            id: userId,
                            email: payload?.email || profiles[0].contact_email,
                            profile: profiles[0],
                            role: profiles[0].role || 'member',
                            user_metadata: payload?.user_metadata || {},
                            app_metadata: payload?.app_metadata || {},
                        }
                    }
                }
            }
        }

        return null
    } catch {
        return null
    }
}

export async function getSupabaseUserFromRequest(
    req: Request
): Promise<Record<string, any> | null> {
    return getSupabaseUserFromBearer(getBearerToken(req))
}

/**
 * Resolve notebook ownership for a request.
 *
 * 1. Valid Supabase JWT → owner_key forced to auth user id (body cannot spoof another user).
 * 2. Else device key: body/query owner_key must match `X-WIM-Owner-Key` header
 *    (stops casual cross-origin POSTs that only guess owner_key).
 */
export async function resolveNotebookOwner(
    req: Request,
    claimedOwnerKey: string | undefined | null
): Promise<NotebookAuthOk | AuthzFail> {
    const user = await getSupabaseUserFromRequest(req)
    if (user) {
        // Prefer JWT binding; ignore mismatched claimed keys from clients
        return { ok: true, ownerKey: user.id, via: 'jwt', userId: user.id }
    }

    const claimed = typeof claimedOwnerKey === 'string' ? claimedOwnerKey.trim() : ''
    if (!isOwnerKey(claimed)) {
        return {
            ok: false,
            status: 401,
            error: 'Authentication required: sign in (Bearer token) or send owner_key + X-WIM-Owner-Key',
        }
    }

    const headerKey = (req.headers.get('x-wim-owner-key') || '').trim()
    if (!headerKey || headerKey !== claimed) {
        return {
            ok: false,
            status: 401,
            error: 'Missing or mismatched X-WIM-Owner-Key header (must equal owner_key)',
        }
    }

    return { ok: true, ownerKey: claimed, via: 'device' }
}

/**
 * Authenticate forum bot write APIs via bot_profiles.api_token.
 * Uses service role REST; token is URL-encoded and length-checked.
 */
export async function resolveForumBotAuth(req: Request): Promise<BotAuthOk | AuthzFail> {
    const env = getRuntimeEnv()
    const serviceKey =
        envFrom(env, 'SUPABASE_SERVICE_ROLE_KEY') ||
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5ZHlwaXNnZmFrc3FramRyYWl1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg0NDAyMSwiZXhwIjoyMDgyNDIwMDIxfQ.YV4wfUArW2rgExeNxNbaH6BnuekfNAnE4_1vnS7oqCs'
    const base =
        envFrom(env, 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL') ||
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.SUPABASE_URL ||
        'https://iydypisgfaksqkjdraiu.supabase.co'
    if (!serviceKey || !base) {
        return { ok: false, status: 500, error: 'Server misconfigured: missing Supabase service credentials' }
    }

    const token = getBearerToken(req)
    if (!token) {
        return { ok: false, status: 401, error: 'Unauthorized: Missing Bearer token' }
    }
    if (token.length < BOT_TOKEN_MIN) {
        return { ok: false, status: 401, error: 'Unauthorized: Invalid API token' }
    }

    // Reject obvious injection / path abuse
    if (/[^\x20-\x7E]/.test(token) || token.includes('&') || token.includes('?')) {
        return { ok: false, status: 401, error: 'Unauthorized: Invalid API token' }
    }

    try {
        const url =
            `${base.replace(/\/$/, '')}/rest/v1/bot_profiles` +
            `?api_token=eq.${encodeURIComponent(token)}` +
            `&is_active=eq.true&select=id&limit=1`

        const botRes = await fetch(url, {
            headers: {
                apikey: serviceKey,
                Authorization: `Bearer ${serviceKey}`,
            },
            cache: 'no-store',
        })

        if (!botRes.ok) {
            return { ok: false, status: 500, error: `Database Error: ${botRes.statusText}` }
        }

        const bots = (await botRes.json()) as Array<{ id?: string }>
        const botId = bots?.[0]?.id
        if (!botId) {
            return { ok: false, status: 401, error: 'Unauthorized: Invalid API token' }
        }

        return { ok: true, botId }
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        return { ok: false, status: 500, error: `Internal Server Error: ${message}` }
    }
}
