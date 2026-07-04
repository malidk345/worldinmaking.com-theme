import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis/cloudflare'

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

// Initialize Redis only if actual valid environment variables are present (not placeholders)
const redis = url && token && url.startsWith('https://') && url !== 'your-upstash-url'
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
