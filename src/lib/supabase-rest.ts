/**
 * Shared Supabase REST fetch utility with 60-second in-memory caching.
 *
 * Used by community_posts, community_replies, and posts table queries.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iydypisgfaksqkjdraiu.supabase.co'
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_KTgzPl0F8_-HzMC_ZEpqMA_ZR7XPnMX'

interface CacheEntry {
    data: any
    timestamp: number
}

const memoryCache: Record<string, CacheEntry> = {}
const CACHE_TTL_MS = 60000

export async function fetchWithCache(url: string, options?: RequestInit): Promise<any> {
    const now = Date.now()
    const cached = memoryCache[url]

    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
        return cached.data
    }

    try {
        const res = await fetch(url, {
            ...options,
            headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                ...(options?.headers || {}),
            },
        })

        if (!res.ok) {
            return cached?.data ?? []
        }

        const data = await res.json()
        const result = Array.isArray(data) ? data : data
        if (Array.isArray(result) ? result.length > 0 : Boolean(result)) {
            memoryCache[url] = { data: result, timestamp: now }
        }
        return result
    } catch (err) {
        return cached?.data ?? []
    }
}

export function clearSupabaseCache(): void {
    Object.keys(memoryCache).forEach((key) => delete memoryCache[key])
}
