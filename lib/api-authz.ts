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

/**
 * Validate Supabase user JWT via Auth REST only (signature + expiry checked by GoTrue).
 * Never decode an unverified JWT. Never embed project keys in source.
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
        ''

    const anon =
        envFrom(env, 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY') ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        ''

    const serviceKey =
        envFrom(env, 'SUPABASE_SERVICE_ROLE_KEY') || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

    if (!base || !anon) return null

    try {
        const res = await fetch(`${base.replace(/\/$/, '')}/auth/v1/user`, {
            headers: {
                Authorization: `Bearer ${token}`,
                apikey: anon,
            },
            cache: 'no-store',
        })
        if (!res.ok) return null
        const user = (await res.json()) as Record<string, any>
        if (!user?.id || typeof user.id !== 'string') return null

        if (serviceKey) {
            try {
                const profileRes = await fetch(
                    `${base.replace(/\/$/, '')}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=*`,
                    {
                        headers: {
                            Authorization: `Bearer ${serviceKey}`,
                            apikey: serviceKey,
                        },
                        cache: 'no-store',
                    }
                )
                if (profileRes.ok) {
                    const profiles = (await profileRes.json()) as Record<string, any>[]
                    if (Array.isArray(profiles) && profiles.length > 0) {
                        user.profile = profiles[0]
                        if (profiles[0].role) user.role = profiles[0].role
                    }
                }
            } catch {
                /* profile enrichment is optional */
            }
        }
        return user
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
        envFrom(env, 'SUPABASE_SERVICE_ROLE_KEY') || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const base =
        envFrom(env, 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL') ||
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.SUPABASE_URL ||
        ''
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
