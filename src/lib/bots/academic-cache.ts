/**
 * Shared academic cache on the Cloudflare Cache API (`caches.default`).
 *
 * Keys are synthetic HTTPS URLs built from a SHA-256 of the normalized
 * query + filters, so results are shared across users and turns in the same
 * colo. No Supabase, no KV binding. Everywhere the Cache API is missing
 * (vitest, `next dev`, Node scripts) every call is a silent no-op.
 */

import { foldText } from './academic-common'

export const ACADEMIC_SEARCH_TTL_S = 3 * 24 * 60 * 60 // ~3 days
export const ACADEMIC_PARTIAL_TTL_S = 30 * 60 // partial (some sources failed) results
export const ACADEMIC_DOI_TTL_S = 30 * 24 * 60 * 60 // ~30 days (Unpaywall / Crossref DOI)
export const ACADEMIC_DOI_MISS_TTL_S = 24 * 60 * 60 // DOI not found — re-check daily

const CACHE_ORIGIN = 'https://academic-cache.worldinmaking.com'
const CACHE_VERSION = 'v1'

type CacheLike = {
    match(request: Request | string): Promise<Response | undefined>
    put(request: Request | string, response: Response): Promise<void>
}

let cacheOverride: CacheLike | null | undefined

/** Test hook: inject a fake cache (or null to force "unavailable"); undefined restores auto-detect. */
export function __setAcademicCacheForTests(cache: CacheLike | null | undefined): void {
    cacheOverride = cache
}

function defaultCache(): CacheLike | null {
    if (cacheOverride !== undefined) return cacheOverride
    try {
        const c = (globalThis as { caches?: { default?: CacheLike } }).caches
        const d = c?.default
        return d && typeof d.match === 'function' && typeof d.put === 'function' ? d : null
    } catch {
        return null
    }
}

export function academicCacheAvailable(): boolean {
    return defaultCache() !== null
}

/** Stable, order-insensitive normalization of a key object (strings folded, whitespace collapsed). */
export function normalizeCacheKeyParts(parts: Record<string, unknown>): string {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(parts).sort()) {
        const value = parts[key]
        if (value === undefined || value === null || value === '' || value === false) continue
        out[key] = typeof value === 'string' ? foldText(value).replace(/\s+/g, ' ').trim() : value
    }
    return JSON.stringify(out)
}

async function sha256Hex(text: string): Promise<string> {
    const subtle = (globalThis.crypto as Crypto | undefined)?.subtle
    if (subtle) {
        const buf = await subtle.digest('SHA-256', new TextEncoder().encode(text))
        return Array.from(new Uint8Array(buf))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('')
    }
    // Fallback (should not happen on Workers/Node 18+): FNV-1a 32-bit.
    let h = 0x811c9dc5
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i)
        h = Math.imul(h, 0x01000193)
    }
    return (h >>> 0).toString(16)
}

export async function academicCacheUrl(namespace: string, parts: Record<string, unknown>): Promise<string> {
    const hash = await sha256Hex(`${namespace}|${normalizeCacheKeyParts(parts)}`)
    return `${CACHE_ORIGIN}/${CACHE_VERSION}/${encodeURIComponent(namespace)}/${hash}`
}

export async function academicCacheGet<T>(namespace: string, parts: Record<string, unknown>): Promise<T | undefined> {
    const cache = defaultCache()
    if (!cache) return undefined
    try {
        const res = await cache.match(await academicCacheUrl(namespace, parts))
        if (!res || !res.ok) return undefined
        const body = (await res.json()) as { v?: T }
        return body && 'v' in body ? body.v : undefined
    } catch {
        return undefined
    }
}

export async function academicCachePut<T>(
    namespace: string,
    parts: Record<string, unknown>,
    value: T,
    ttlSeconds: number
): Promise<void> {
    const cache = defaultCache()
    if (!cache || ttlSeconds <= 0) return
    try {
        const res = new Response(JSON.stringify({ v: value }), {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': `public, max-age=${Math.round(ttlSeconds)}`,
            },
        })
        await cache.put(await academicCacheUrl(namespace, parts), res)
    } catch {
        // Cache is best-effort.
    }
}
