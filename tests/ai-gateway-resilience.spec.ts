import { test, expect } from '@playwright/test'
import {
    calculateExponentialCooldownWithJitter,
    isFamilyKeyCooling,
    resetKeyCooldownStreak,
} from '../src/lib/bots/ai-gateway'
import {
    checkRateLimit,
    buildRateLimitHeaders,
    resetRateLimit,
} from '../src/lib/bots/rate-limit'
import {
    cleanWimaiEditorOutput,
    buildWimaiEditorUserPrompt,
} from '../src/lib/bots/wimai-editor'
import { stripThinkingBlocks } from '../src/lib/bots/thinking-tags'

test.describe('AI Gateway & Resilience Architecture', () => {
    test.beforeEach(() => {
        resetRateLimit()
    })

    test('circuit breaker exponential backoff increases cooldown with failures', () => {
        const family = 'groq-test'
        const key = 'gsk_sample_test_key_12345'
        resetKeyCooldownStreak(family, key)

        const cd1 = calculateExponentialCooldownWithJitter(family, key, 10000, 300000)
        expect(cd1).toBeGreaterThanOrEqual(10000)
        expect(cd1).toBeLessThan(15000)

        const cd2 = calculateExponentialCooldownWithJitter(family, key, 10000, 300000)
        expect(cd2).toBeGreaterThanOrEqual(18000)

        const cd3 = calculateExponentialCooldownWithJitter(family, key, 10000, 300000)
        expect(cd3).toBeGreaterThan(cd2)

        resetKeyCooldownStreak(family, key)
        expect(isFamilyKeyCooling(family, key)).toBe(false)
    })

    test('rate limiter tracks sliding window, remaining count, and generates standard headers', () => {
        const testKey = 'test-ip-user-1'
        const limit = 5

        const r1 = checkRateLimit(testKey, limit, 60000)
        expect(r1.allowed).toBe(true)
        expect(r1.remaining).toBe(4)
        expect(r1.limit).toBe(5)
        expect(r1.resetSec).toBeGreaterThan(0)

        const h1 = buildRateLimitHeaders(r1)
        expect(h1['X-RateLimit-Limit']).toBe('5')
        expect(h1['X-RateLimit-Remaining']).toBe('4')
        expect(h1['X-RateLimit-Reset']).toBeDefined()
        expect(h1['Retry-After']).toBeUndefined()

        // Exhaust limit
        checkRateLimit(testKey, limit, 60000)
        checkRateLimit(testKey, limit, 60000)
        checkRateLimit(testKey, limit, 60000)
        const r5 = checkRateLimit(testKey, limit, 60000)
        expect(r5.allowed).toBe(true)
        expect(r5.remaining).toBe(0)

        // Exceeded
        const r6 = checkRateLimit(testKey, limit, 60000)
        expect(r6.allowed).toBe(false)
        expect(r6.remaining).toBe(0)
        expect(r6.retryAfterSec).toBeGreaterThan(0)

        const h6 = buildRateLimitHeaders(r6)
        expect(h6['X-RateLimit-Remaining']).toBe('0')
        expect(h6['Retry-After']).toBe(String(r6.retryAfterSec))
    })

    test('stripThinkingBlocks safely strips reasoning tags and handles malformed unclosed tags', () => {
        const outputWithThinking = '<think>I should evaluate the ethical framework first.</think>Virtue ethics emphasizes character.'
        const cleaned = stripThinkingBlocks(outputWithThinking)
        expect(cleaned).toBe('Virtue ethics emphasizes character.')
        expect(cleaned).not.toContain('<think>')

        const plain = 'Direct philosophical answer without thinking tags.'
        expect(stripThinkingBlocks(plain)).toBe(plain)
    })

    test('wimai-editor prompt constructor sanitizes context fences and isolates instruction', () => {
        const prompt = buildWimaiEditorUserPrompt({
            instruction: 'Make it more concise',
            selection: 'Knowledge is justified true belief.',
            notebook: '# Philosophy 101\nEpistemology overview',
        })

        expect(prompt).toContain('Instruction:')
        expect(prompt).toContain('Make it more concise')
        expect(prompt).toContain('Target text')
        expect(prompt).toContain('Knowledge is justified true belief.')
        expect(prompt).toContain('Surrounding notebook')

        const cleaned = cleanWimaiEditorOutput('```markdown\nSimplified epistemological definition.\n```')
        expect(cleaned).toBe('Simplified epistemological definition.')
    })
})
