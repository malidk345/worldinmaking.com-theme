import { test, expect } from '@playwright/test'
import {
    isUserPro,
    verifyLemonSqueezySignature,
    BILLING_PLANS,
    BILLING_DISCOUNT,
    discountedUsd,
    lemonSqueezyMissingConfig,
    subscriptionEntitlement,
} from '../src/lib/wim-billing'

test.describe('billing & subscriptions', () => {
    test('isUserPro identifies pro, moderator, and admin roles', () => {
        expect(isUserPro(null)).toBe(false)
        expect(isUserPro({ role: 'member' })).toBe(false)
        expect(isUserPro({ role: { type: 'authenticated' } })).toBe(false)

        expect(isUserPro({ role: 'pro' })).toBe(true)
        expect(isUserPro({ role: { type: 'pro' } })).toBe(true)
        expect(isUserPro({ profile: { role: 'pro' } })).toBe(true)
        expect(isUserPro({ app_metadata: { plan: 'pro' } })).toBe(true)
        expect(isUserPro({ role: 'moderator' })).toBe(true)
        expect(isUserPro({ profile: { role: 'admin' } })).toBe(true)
    })

    test('BILLING_PLANS defines distinct quotas and features', () => {
        expect(BILLING_PLANS.free.dailyChatLimit).toBe(30)
        expect(BILLING_PLANS.pro.dailyChatLimit).toBe(300)
        expect(BILLING_PLANS.pro.hourlyChatLimit).toBeGreaterThan(BILLING_PLANS.free.hourlyChatLimit)
        expect(BILLING_PLANS.free.name).toBe('desk')
        expect(BILLING_PLANS.pro.name).toBe('study')
        expect(BILLING_PLANS.pro.features.some((f) => f.includes('panel'))).toBe(true)
        expect(BILLING_DISCOUNT.code).toBe('WIM25')
        expect(discountedUsd(9.99)).toBe(7.49)
        expect(discountedUsd(99.99)).toBe(74.99)
    })

    test('verifyLemonSqueezySignature validates HMAC SHA256 signatures', async () => {
        const secret = 'webhook_secret_key_123'
        const rawBody = JSON.stringify({ event: 'subscription_created', data: { id: 'sub_1' } })

        const key = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        )
        const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))
        const validSignature = Array.from(new Uint8Array(sigBuf))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('')

        expect(await verifyLemonSqueezySignature(rawBody, validSignature, secret)).toBe(true)
        expect(await verifyLemonSqueezySignature(rawBody, 'invalid_signature', secret)).toBe(false)
        expect(await verifyLemonSqueezySignature(rawBody, validSignature, 'wrong_secret')).toBe(false)
        expect(await verifyLemonSqueezySignature('', validSignature, secret)).toBe(false)
    })

    test('missing Lemon Squeezy config is reported instead of demo checkout', () => {
        const missing = lemonSqueezyMissingConfig({})
        expect(missing).toContain('LEMON_SQUEEZY_API_KEY')
        expect(missing).toContain('LEMON_SQUEEZY_STORE_ID')
        expect(lemonSqueezyMissingConfig({}, 'month')).toContain('LEMON_SQUEEZY_VARIANT_ID_PRO_MONTHLY')
        expect(lemonSqueezyMissingConfig({}, 'year')).toContain('LEMON_SQUEEZY_VARIANT_ID_PRO_YEARLY')
    })

    test('subscription entitlement keeps Pro through the paid period', () => {
        expect(subscriptionEntitlement('active')).toBe('pro')
        expect(subscriptionEntitlement('on_trial')).toBe('pro')
        expect(subscriptionEntitlement('paused')).toBe('pro')
        expect(subscriptionEntitlement('expired')).toBe('member')
        expect(subscriptionEntitlement('cancelled')).toBe('member')
        const future = new Date(Date.now() + 86400000).toISOString()
        expect(subscriptionEntitlement('cancelled', future)).toBe('pro')
    })
})
