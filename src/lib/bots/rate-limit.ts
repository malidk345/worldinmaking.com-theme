/**
 * Lightweight in-memory rate limit for edge isolates.
 * Resets when the isolate recycles — good enough to stop accidental spam.
 */
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
    remaining: number
    retryAfterSec: number
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
    if (b.count >= limit) {
        return {
            allowed: false,
            remaining: 0,
            retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)),
        }
    }
    b.count += 1
    return {
        allowed: true,
        remaining: Math.max(0, limit - b.count),
        retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)),
    }
}
