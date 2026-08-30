import { test, expect } from '@playwright/test'
import crypto from 'crypto'
import { isUserPro, verifyLemonSqueezySignature, BILLING_PLANS } from '../src/lib/wim-billing'

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
        expect(BILLING_PLANS.free.dailyChatLimit).toBe(400)
        expect(BILLING_PLANS.pro.dailyChatLimit).toBe(3000)
        expect(BILLING_PLANS.pro.hourlyChatLimit).toBeGreaterThan(BILLING_PLANS.free.hourlyChatLimit)
        expect(BILLING_PLANS.pro.features.some((f) => f.includes('frontier reasoning'))).toBe(true)
    })

    test('verifyLemonSqueezySignature validates HMAC SHA256 signatures', () => {
        const secret = 'webhook_secret_key_123'
        const rawBody = JSON.stringify({ event: 'subscription_created', data: { id: 'sub_1' } })

        const hmac = crypto.createHmac('sha256', secret)
        const validSignature = hmac.update(rawBody).digest('hex')

        expect(verifyLemonSqueezySignature(rawBody, validSignature, secret)).toBe(true)
        expect(verifyLemonSqueezySignature(rawBody, 'invalid_signature', secret)).toBe(false)
        expect(verifyLemonSqueezySignature(rawBody, validSignature, 'wrong_secret')).toBe(false)
        expect(verifyLemonSqueezySignature('', validSignature, secret)).toBe(false)
    })
})
