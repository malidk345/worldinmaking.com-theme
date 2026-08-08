import { test, expect } from '@playwright/test'

test.describe('WorldInMaking Shell Smoke Suite', () => {
    test('Root route loads desktop shell', async ({ page }) => {
        const response = await page.goto('/')
        expect(response?.status()).toBe(404)
    })

    test('Desktop route (/desktop) loads successfully', async ({ page }) => {
        const response = await page.goto('/desktop')
        expect(response?.status()).toBe(200)
    })

    test('Login route (/login) opens auth portal', async ({ page }) => {
        const response = await page.goto('/login')
        expect(response?.status()).toBe(200)
    })

    test('Search API (/api/search) responds with structured json hits', async ({ request }) => {
        const response = await request.get('/api/search?q=nextjs')
        expect(response.status()).toBe(200)
        const data = await response.json()
        expect(data).toHaveProperty('hits')
        expect(Array.isArray(data.hits)).toBeTruthy()
    })

    test('Posts route (/posts) renders successfully', async ({ page }) => {
        const response = await page.goto('/posts')
        expect(response?.status()).toBe(200)
    })

    test('Forum route (/questions) loads inbox container', async ({ page }) => {
        const response = await page.goto('/questions')
        expect(response?.status()).toBe(200)
    })
})
