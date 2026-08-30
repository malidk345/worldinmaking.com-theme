import { test, expect } from '@playwright/test'

test.describe('WorldInMaking Shell Smoke Suite', () => {
    test('Root route loads desktop shell', async ({ page }) => {
        const response = await page.goto('/')
        expect(response?.status()).toBe(200)
    })

    test('Desktop route (/desktop) redirects to home', async ({ page }) => {
        const response = await page.goto('/desktop')
        expect(response?.status()).toBe(200)
        expect(new URL(page.url()).pathname).toBe('/')
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

    test.skip('Bot APIs reject malformed requests without invoking an LLM', async ({ request }) => {
        const chat = await request.post('/api/chat', {
            data: '{}',
            headers: { 'Content-Type': 'application/json' },
        })
        expect(chat.status()).toBe(400)

        const invalidChatModel = await request.post('/api/chat', {
            data: JSON.stringify({ prompt: 'hello', modelId: 'not-a-real-model' }),
            headers: { 'Content-Type': 'application/json' },
        })
        expect(invalidChatModel.status()).toBe(400)

        const invalidChatHistory = await request.post('/api/chat', {
            data: JSON.stringify({ prompt: 'hello', modelId: 'nietzsche', chatHistory: ['not-a-string'] }),
            headers: { 'Content-Type': 'application/json' },
        })
        expect(invalidChatHistory.status()).toBe(400)

        const invalidMessages = await request.post('/api/chat', {
            data: JSON.stringify({
                prompt: 'hello',
                modelId: 'nietzsche',
                messages: [{ role: 'system', content: 'nope' }],
            }),
            headers: { 'Content-Type': 'application/json' },
        })
        expect(invalidMessages.status()).toBe(400)

        const act = await request.post('/api/bots/act', {
            data: 'null',
            headers: { 'Content-Type': 'application/json' },
        })
        expect(act.status()).toBe(400)

        const coauthor = await request.post('/api/notebook/co-author', {
            data: '{}',
            headers: { 'Content-Type': 'application/json' },
        })
        expect(coauthor.status()).toBe(400)

        const philosopherMethod = await request.get('/api/philosopher-bot')
        expect(philosopherMethod.status()).toBe(405)

        const philosopherBody = await request.post('/api/philosopher-bot', {
            data: 'null',
            headers: { 'Content-Type': 'application/json' },
        })
        expect(philosopherBody.status()).toBe(400)

        const unknownAction = await request.post('/api/bots/act', {
            data: JSON.stringify({ action: 'not-a-real-action' }),
            headers: { 'Content-Type': 'application/json' },
        })
        expect(unknownAction.status()).toBe(400)

        const unknownBot = await request.post('/api/bots/act', {
            data: JSON.stringify({ action: 'chat', bot: 'not-a-real-bot', question: 'hello' }),
            headers: { 'Content-Type': 'application/json' },
        })
        expect(unknownBot.status()).toBe(400)

        const intent = await request.post('/api/bots/intent', {
            data: '{}',
            headers: { 'Content-Type': 'application/json' },
        })
        expect(intent.status()).toBe(400)

        const webSearch = await request.post('/api/bots/search', {
            data: '{}',
            headers: { 'Content-Type': 'application/json' },
        })
        expect(webSearch.status()).toBe(400)

        const chats = await request.get('/api/chats')
        expect(chats.status()).toBe(401)

        const admin = await request.get('/api/admin/dashboard?resource=overview')
        expect(admin.status()).toBe(401)

        const share = await request.get('/api/share/not-a-real-share-token')
        expect([404, 503]).toContain(share.status())
    })

    test('Cron endpoint never runs on GET', async ({ request }) => {
        const response = await request.get('/api/cron/philosopher-bots')
        expect(response.status()).toBe(405)
    })

    test('Cron endpoint rejects unauthenticated POST', async ({ request }) => {
        const response = await request.post('/api/cron/philosopher-bots', {
            data: { phase: 'topic' },
        })
        expect([401, 503]).toContain(response.status())
        const body = await response.json()
        expect(body.success).toBe(false)
    })

    test.skip('Shared chat page renders a not-found state for unknown tokens', async ({ page }) => {
        const response = await page.goto('/share/not-a-real-share-token')
        expect(response?.status()).toBe(200)
        await expect(page.getByText('Sohbet bulunamadı')).toBeVisible()
    })
})
