import { test, expect } from '@playwright/test'

test.describe('Admin dashboard API', () => {
    test('rejects unauthenticated reads and writes', async ({ request }) => {
        const missing = await request.get('/api/admin/dashboard?resource=overview')
        expect(missing.status()).toBe(401)
        const missingBody = await missing.json()
        expect(missingBody.error).toMatch(/authorization/i)

        const badToken = await request.get('/api/admin/dashboard?resource=overview', {
            headers: { Authorization: 'Bearer not-a-real-session' },
        })
        expect(badToken.status()).toBe(401)

        const write = await request.post('/api/admin/dashboard', {
            data: { action: 'delete_forum_post', payload: { id: '1' } },
        })
        expect(write.status()).toBe(401)

        const method = await request.put('/api/admin/dashboard')
        expect(method.status()).toBe(405)
    })

    test('rejects unknown resources and actions even before a valid session body is parsed as JSON', async ({
        request,
    }) => {
        const unknownResource = await request.get('/api/admin/dashboard?resource=not-a-table')
        expect(unknownResource.status()).toBe(401)

        const unknownAction = await request.post('/api/admin/dashboard', {
            data: { action: 'drop_database', payload: {} },
            headers: { Authorization: 'Bearer not-a-real-session' },
        })
        expect(unknownAction.status()).toBe(401)
    })

    test('forum resolve and staff thread actions require a session', async ({ request }) => {
        const resolve = await request.post('/api/forum/resolve', {
            data: { postId: '1', replyId: 1 },
        })
        expect(resolve.status()).toBe(401)

        const hide = await request.post('/api/admin/dashboard', {
            data: { action: 'hide_forum_reply', payload: { id: '1', hidden: true } },
        })
        expect(hide.status()).toBe(401)

        const archive = await request.post('/api/admin/dashboard', {
            data: { action: 'archive_forum_post', payload: { id: '1', archived: true } },
        })
        expect(archive.status()).toBe(401)
    })

    test('admin philosopher trigger requires a staff session and only accepts POST', async ({ request }) => {
        const get = await request.get('/api/admin/philosopher-bots')
        expect(get.status()).toBe(405)

        const missing = await request.post('/api/admin/philosopher-bots', {
            data: { phase: 'topic' },
        })
        expect(missing.status()).toBe(401)

        const badToken = await request.post('/api/admin/philosopher-bots', {
            data: { phase: 'topic' },
            headers: { Authorization: 'Bearer not-a-real-session' },
        })
        expect(badToken.status()).toBe(401)
    })

    test('admin page renders the access gate without a staff session', async ({ page }) => {
        const response = await page.goto('/admin')
        expect(response?.status()).toBe(200)
        await expect(page.getByText('Access Restricted')).toBeVisible()
        await expect(page.getByText('WorldInMaking Admin OS')).toHaveCount(0)
    })
})
