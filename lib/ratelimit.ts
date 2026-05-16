import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis/cloudflare'

// Initialize Redis only if the environment variables are present
// This ensures that the application won't break if Redis is not configured
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;

// Rate limiter for general requests
export const ratelimit = redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '10 s'), // 10 requests per 10 seconds
    analytics: true,
    prefix: '@ratelimit',
}) : null;

// Rate limiter for authentication
export const authRatelimit = redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 requests per minute
    analytics: true,
    prefix: '@auth-ratelimit',
}) : null;
