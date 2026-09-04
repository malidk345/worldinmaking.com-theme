import { test, expect } from '@playwright/test'
import { initPostHog, trackPageView, identifyUser, resetUser, trackEvent, applyAnalyticsConsent } from '../src/lib/wim-posthog'

test.describe('PostHog Client Integration', () => {
    test('module exports core functions safely', () => {
        expect(typeof initPostHog).toBe('function')
        expect(typeof trackPageView).toBe('function')
        expect(typeof identifyUser).toBe('function')
        expect(typeof resetUser).toBe('function')
        expect(typeof trackEvent).toBe('function')
        expect(typeof applyAnalyticsConsent).toBe('function')
    })

    test('functions do not throw in non-browser or unconfigured environments', () => {
        expect(() => {
            initPostHog()
            trackPageView('/test-url')
            identifyUser('user-123', { plan: 'pro' })
            trackEvent('ask_ai_invoked', { model: 'gsk' })
            resetUser()
        }).not.toThrow()
    })
})
