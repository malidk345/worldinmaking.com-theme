/**
 * Edge-safe Supabase REST helpers (no @supabase/supabase-js).
 * Uses getRuntimeEnv so Cloudflare secrets are visible.
 */
import { envFrom, getRuntimeEnv, type EnvStore } from './runtime-env'

export function getSupabaseConfig(env?: EnvStore) {
    const store = env ?? getRuntimeEnv()
    const url = envFrom(store, 'NEXT_PUBLIC_SUPABASE_URL').replace(/\/$/, '')
    const key =
        envFrom(store, 'SUPABASE_SERVICE_ROLE_KEY') ||
        envFrom(store, 'NEXT_PUBLIC_SUPABASE_ANON_KEY')
    return { url, key, hasServiceRole: !!envFrom(store, 'SUPABASE_SERVICE_ROLE_KEY') }
}

export type SupabaseRestResult<T> =
    | { ok: true; data: T; status: number }
    | { ok: false; error: string; status: number; detail?: string }

export async function supabaseRest<T = unknown>(
    pathAndQuery: string,
    init: RequestInit & { env?: EnvStore } = {}
): Promise<SupabaseRestResult<T>> {
    const { url, key } = getSupabaseConfig(init.env)
    if (!url || !key) {
        return { ok: false, error: 'Supabase not configured', status: 503 }
    }

    const path = pathAndQuery.startsWith('/') ? pathAndQuery : `/${pathAndQuery}`
    try {
        const res = await fetch(`${url}/rest/v1${path}`, {
            ...init,
            headers: {
                apikey: key,
                Authorization: `Bearer ${key}`,
                Accept: 'application/json',
                ...(init.body ? { 'Content-Type': 'application/json' } : {}),
                ...(init.headers || {}),
            },
            cache: 'no-store',
        })
        const text = await res.text()
        let data: any = null
        if (text) {
            try {
                data = JSON.parse(text)
            } catch {
                data = text
            }
        }
        if (!res.ok) {
            return {
                ok: false,
                error: `supabase ${res.status}`,
                status: res.status,
                detail: typeof data === 'string' ? data.slice(0, 400) : JSON.stringify(data).slice(0, 400),
            }
        }
        return { ok: true, data: data as T, status: res.status }
    } catch (e: any) {
        return { ok: false, error: e?.message || 'fetch failed', status: 500 }
    }
}

export function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 80) || `topic-${Date.now()}`
}
