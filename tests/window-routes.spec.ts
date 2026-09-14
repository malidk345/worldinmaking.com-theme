import { test, expect } from '@playwright/test'

test.describe('Playwright window-routes matrix', () => {
    test.use({ viewport: { width: 1280, height: 720 } })
    test.setTimeout(60000)

    test('Loads about window on hard navigation', async ({ page }) => {
        const response = await page.goto('/about')
        expect(response?.status()).toBe(200)
        await expect(page.locator('[data-app="AppWindow"][data-path="/about"]')).toBeVisible()
    })

    test('Loads pricing window on hard navigation', async ({ page }) => {
        const response = await page.goto('/pricing')
        expect(response?.status()).toBe(200)
        await expect(page.locator('[data-app="AppWindow"][data-path="/pricing"]')).toBeVisible()
    })

    test('Loads posts slug on hard navigation', async ({ page }) => {
        const response = await page.goto('/posts/hello-world')
        expect(response?.status()).toBe(200)
        await expect(page.locator('[data-app="AppWindow"][data-path="/posts/hello-world"]')).toBeVisible()
    })

    test('Loads questions permalink on hard navigation', async ({ page }) => {
        const response = await page.goto('/questions/123')
        expect(response?.status()).toBe(200)
        await expect(page.locator('[data-app="AppWindow"][data-path="/questions/123"]')).toBeVisible()
    })

    test('Loads notebooks list on hard navigation', async ({ page }) => {
        const response = await page.goto('/notebooks')
        expect(response?.status()).toBe(200)
        await expect(page.locator('[data-app="AppWindow"][data-path="/notebooks"]')).toBeVisible()
    })

    test('Loads notebook editor id path on hard navigation', async ({ page }) => {
        const response = await page.goto('/notebooks/nb-1')
        expect(response?.status()).toBe(200)
        await expect(page.locator('[data-app="AppWindow"][data-path="/notebooks/nb-1"]')).toBeVisible()
    })

    test('Loads ask-ai on hard navigation', async ({ page }) => {
        const response = await page.goto('/workspace-chat')
        expect(response?.status()).toBe(200)
        await expect(page.locator('[data-app="AppWindow"][data-path="/workspace-chat"]')).toBeVisible()
    })
})

test.describe('Playwright window-routes matrix (Mobile 375px)', () => {
    test.use({ viewport: { width: 375, height: 812 } })
    test.setTimeout(60000)

    test('Loads ask-ai on hard navigation (mobile)', async ({ page }) => {
        const response = await page.goto('/workspace-chat')
        expect(response?.status()).toBe(200)
        await expect(page.locator('[data-app="AppWindow"][data-path="/workspace-chat"]')).toBeVisible()
    })
})
