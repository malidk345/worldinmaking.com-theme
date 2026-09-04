import { test, expect } from '@playwright/test'
import { CONSENT_KEY, hasConsentDecision, readConsent, writeConsent } from '../src/lib/wim-consent'
import { LEGAL_PATHS, LEGAL_TITLES } from '../src/lib/legal-paths'

test.describe('analytics consent', () => {
    test('only yes/no count as a decision', () => {
        expect(CONSENT_KEY).toBe('cookie_consent')
        expect(readConsent()).toBeNull()
        expect(hasConsentDecision()).toBe(false)
        if (typeof window !== 'undefined') {
            writeConsent('yes')
            expect(readConsent()).toBe('yes')
        }
    })
})

test.describe('legal paths', () => {
    test('includes cookies, refund, guidelines, copyright', () => {
        expect(LEGAL_PATHS).toContain('/cookies')
        expect(LEGAL_PATHS).toContain('/refund')
        expect(LEGAL_PATHS).toContain('/guidelines')
        expect(LEGAL_PATHS).toContain('/copyright')
        expect(LEGAL_TITLES['/cookies']).toBe('Cookies')
    })
})

test.describe('first-visit banner', () => {
    test('shows the WIM mark and honest analytics copy', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.removeItem('cookie_consent')
        })
        await page.goto('/')
        const banner = page.getByRole('dialog', { name: 'Cookies and analytics' })
        await expect(banner).toBeVisible()
        await expect(banner.getByAltText('WorldInMaking')).toBeVisible()
        await expect(banner.getByLabel('wim')).toBeVisible()
        await expect(banner.getByLabel('wim')).toHaveClass(/lowercase/)
        await expect(banner).toContainText('Optional product analytics')
        await expect(banner).not.toContainText('We do not track you')
        await banner.getByRole('button', { name: 'Decline' }).click()
        await expect(banner).toHaveCount(0)
    })

    test('terms say this is an individual, not a company', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('cookie_consent', 'no')
        })
        await page.goto('/terms')
        await expect(page.getByText(/not a registered company/i).first()).toBeVisible()
        await expect(page.getByText(/WorldInMaking, Inc/i)).toHaveCount(0)
    })
})

