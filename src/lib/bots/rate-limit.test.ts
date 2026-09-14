import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
    checkRateLimit,
    checkRateLimitDurable,
    resetRateLimit,
    buildRateLimitHeaders,
} from './rate-limit';

describe('rate-limit helpers', () => {
    beforeEach(() => {
        resetRateLimit();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('checkRateLimit (memory)', () => {
        it('allows requests under the limit and tracks remaining', () => {
            const key = 'test:mem:1';
            const res1 = checkRateLimit(key, 2, 60000);
            expect(res1.allowed).toBe(true);
            expect(res1.remaining).toBe(1);

            const res2 = checkRateLimit(key, 2, 60000);
            expect(res2.allowed).toBe(true);
            expect(res2.remaining).toBe(0);

            const res3 = checkRateLimit(key, 2, 60000);
            expect(res3.allowed).toBe(false);
            expect(res3.remaining).toBe(0);
        });

        it('resets after the window expires', () => {
            const key = 'test:mem:2';
            checkRateLimit(key, 1, 1000); // Uses the 1 allowed request
            const blocked = checkRateLimit(key, 1, 1000);
            expect(blocked.allowed).toBe(false);

            vi.advanceTimersByTime(1001); // Advance past 1s window
            const allowed = checkRateLimit(key, 1, 1000);
            expect(allowed.allowed).toBe(true);
            expect(allowed.remaining).toBe(0);
        });
    });

    describe('buildRateLimitHeaders', () => {
        it('builds headers for an allowed request', () => {
            const res = checkRateLimit('test:headers:1', 10, 60000);
            const headers = buildRateLimitHeaders(res);
            expect(headers['X-RateLimit-Limit']).toBe('10');
            expect(headers['X-RateLimit-Remaining']).toBe('9');
            expect(headers['X-RateLimit-Reset']).toBeDefined();
            expect(headers['Retry-After']).toBeUndefined();
        });

        it('builds headers for a blocked request, including Retry-After', () => {
            checkRateLimit('test:headers:2', 1, 60000);
            const res = checkRateLimit('test:headers:2', 1, 60000);
            const headers = buildRateLimitHeaders(res);
            expect(headers['X-RateLimit-Limit']).toBe('1');
            expect(headers['X-RateLimit-Remaining']).toBe('0');
            expect(headers['Retry-After']).toBeDefined();
            expect(headers['Retry-After']).toBe(String(res.retryAfterSec));
        });
    });

    describe('checkRateLimitDurable', () => {
        const mockEnv = {
            'UPSTASH_REDIS_REST_URL': 'https://mock.upstash.io',
            'UPSTASH_REDIS_REST_TOKEN': 'mock-token',
        };

        it('falls back to memory if fetch fails and failClosed is false', async () => {
            global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
            const res = await checkRateLimitDurable('test:durable:1', 5, 60000, mockEnv as any);
            expect(res.source).toBe('memory');
            expect(res.allowed).toBe(true);
        });

        it('fails closed if fetch fails and failClosed is true', async () => {
            global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
            const res = await checkRateLimitDurable('test:durable:2', 5, 60000, mockEnv as any, { failClosed: true });
            expect(res.source).toBe('unavailable');
            expect(res.allowed).toBe(false);
        });

        it('uses upstash if available', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => [{ result: 1 }],
            });
            const res = await checkRateLimitDurable('test:durable:3', 5, 60000, mockEnv as any);
            expect(res.source).toBe('durable');
            expect(res.allowed).toBe(true);
            expect(res.remaining).toBe(4);
        });
    });
});
