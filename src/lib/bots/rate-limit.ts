/**
 * Rate limiting for edge runtimes.
 *
 * `checkRateLimit` — in-memory per-isolate limiter. Resets when the isolate
 * recycles; fine as an always-available fallback.
 *
 * `checkRateLimitDurable` — Upstash Redis (REST) fixed-window limiter that
 * survives isolate recycling. Falls back to the in-memory limiter when
 * UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not configured.
 * When credentials are present but the store is unreachable, callers may pass
 * `{ failClosed: true }` to deny the request instead of falling open to memory.
 */
import { envFrom, getRuntimeEnv, type EnvStore } from './runtime-env'
type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()
let callsSincePrune = 0

function pruneExpired(now: number): void {
    buckets.forEach((bucket, key) => {
        if (now >= bucket.resetAt) buckets.delete(key)
    })

    // A hard cap prevents attacker-controlled identifiers from growing this map forever.
    if (buckets.size > 50000) {
        let remaining = buckets.size - 50000
        buckets.forEach((_bucket, key) => {
            if (remaining > 0) {
                buckets.delete(key)
                remaining -= 1
            }
        })
    }
}

export interface RateLimitResult {
    allowed: boolean
    limit: number
    remaining: number
    resetSec: number
    retryAfterSec: number
    /** Where the decision came from. `unavailable` only when failClosed and durable store failed. */
    source?: 'durable' | 'memory' | 'unavailable'
}

/**
 * @param key e.g. `forum_reply:nietzsche` or `cron:tick`
 * @param limit max hits in the window
 * @param windowMs window length (default 1 hour)
 */
export function checkRateLimit(key: string, limit = 20, windowMs = 60 * 60 * 1000): RateLimitResult {
    const now = Date.now()
    callsSincePrune += 1
    if (callsSincePrune >= 100) {
        callsSincePrune = 0
        pruneExpired(now)
    }
    let b = buckets.get(key)
    if (!b || now >= b.resetAt) {
        b = { count: 0, resetAt: now + windowMs }
        buckets.set(key, b)
    }
    const resetSec = Math.max(1, Math.ceil((b.resetAt - now) / 1000))
    if (b.count >= limit) {
        return {
            allowed: false,
            limit,
            remaining: 0,
            resetSec,
            retryAfterSec: resetSec,
        }
    }
    b.count += 1
    return {
        allowed: true,
        limit,
        remaining: Math.max(0, limit - b.count),
        resetSec,
        retryAfterSec: resetSec,
    }
}

// ── Durable Upstash-backed limiter ───────────────────────────────────────────

type UpstashCreds = { url: string; token: string }

function readUpstashCreds(env?: EnvStore): UpstashCreds | null {
    const store = env ?? getRuntimeEnv()
    const url = envFrom(store, 'UPSTASH_REDIS_REST_URL').replace(/\/+$/, '')
    const token = envFrom(store, 'UPSTASH_REDIS_REST_TOKEN')
    if (!url || !token) return null
    return { url, token }
}

const UPSTASH_TIMEOUT_MS = 2_500

/**
 * Fixed-window counter in Redis:
 *   key = `rl:{name}:{windowIndex}` with PEXPIRE so old windows self-clean.
 * Returns null when Upstash is not configured or unreachable (caller falls back).
 */
async function upstashRateLimit(
    creds: UpstashCreds,
    key: string,
    limit: number,
    windowMs: number
): Promise<RateLimitResult | null> {
    const now = Date.now()
    const windowIndex = Math.floor(now / windowMs)
    const windowStart = windowIndex * windowMs
    const redisKey = `rl:${key}:${windowIndex}`

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), UPSTASH_TIMEOUT_MS)
    try {
        const res = await fetch(`${creds.url}/pipeline`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${creds.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify([
                ['INCR', redisKey],
                ['PEXPIREAT', redisKey, windowStart + windowMs + 60_000],
            ]),
            signal: controller.signal,
        })
        if (!res.ok) return null
        const data = (await res.json()) as Array<{ result?: number; error?: string }>
        const count = Number(data?.[0]?.result)
        if (!Number.isFinite(count) || count < 1) return null

        const resetSec = Math.max(1, Math.ceil((windowStart + windowMs - now) / 1000))
        const allowed = count <= limit
        return {
            allowed,
            limit,
            remaining: Math.max(0, limit - count),
            resetSec,
            retryAfterSec: resetSec,
        }
    } catch {
        return null
    } finally {
        clearTimeout(timer)
    }
}

/**
 * Preferred limiter for public LLM endpoints. Uses durable Upstash counters
 * when configured; otherwise degrades to the per-isolate in-memory bucket.
 * Never throws.
 *
 * @param opts.failClosed When Upstash creds are configured but the call fails,
 *   deny the request (`source: 'unavailable'`) instead of falling back to memory.
 *   Default false preserves the historical soft fallback.
 */
export async function checkRateLimitDurable(
    key: string,
    limit = 20,
    windowMs = 60 * 60 * 1000,
    env?: EnvStore,
    opts?: { failClosed?: boolean }
): Promise<RateLimitResult> {
    const creds = readUpstashCreds(env)
    if (creds) {
        const durable = await upstashRateLimit(creds, key, limit, windowMs)
        if (durable) return { ...durable, source: 'durable' }
        if (opts?.failClosed) {
            return {
                allowed: false,
                limit,
                remaining: 0,
                resetSec: 60,
                retryAfterSec: 60,
                source: 'unavailable',
            }
        }
    }
    return { ...checkRateLimit(key, limit, windowMs), source: 'memory' }
}

export function resetRateLimit(key?: string): void {
    if (key) {
        buckets.delete(key)
    } else {
        buckets.clear()
    }
}

export function buildRateLimitHeaders(rl: RateLimitResult): Record<string, string> {
    const headers: Record<string, string> = {
        'X-RateLimit-Limit': String(rl.limit),
        'X-RateLimit-Remaining': String(rl.remaining),
        'X-RateLimit-Reset': String(rl.resetSec),
    }
    if (!rl.allowed) {
        headers['Retry-After'] = String(rl.retryAfterSec)
    }
    return headers
}
