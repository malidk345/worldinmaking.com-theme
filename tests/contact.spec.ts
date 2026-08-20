import { test, expect } from '@playwright/test'
import handler from '../src/pages/api/contact'

test.describe('Contact form API handler', () => {
    test('rejects non-POST requests', async () => {
        const req = new Request('https://worldinmaking.com/api/contact', {
            method: 'GET',
        })
        const res = await handler(req)
        expect(res.status).toBe(405)
    })

    test('validates required fields', async () => {
        const emptyReq = new Request('https://worldinmaking.com/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        })
        const emptyRes = await handler(emptyReq)
        expect(emptyRes.status).toBe(400)
        const emptyJson = await emptyRes.json()
        expect(emptyJson.error).toMatch(/name is required/i)

        const noEmailReq = new Request('https://worldinmaking.com/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Mustafa' }),
        })
        const noEmailRes = await handler(noEmailReq)
        expect(noEmailRes.status).toBe(400)
        const noEmailJson = await noEmailRes.json()
        expect(noEmailJson.error).toMatch(/email/i)

        const invalidEmailReq = new Request('https://worldinmaking.com/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Mustafa', email: 'not-an-email' }),
        })
        const invalidEmailRes = await handler(invalidEmailReq)
        expect(invalidEmailRes.status).toBe(400)

        const noMsgReq = new Request('https://worldinmaking.com/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Mustafa', email: 'mustafa@example.com' }),
        })
        const noMsgRes = await handler(noMsgReq)
        expect(noMsgRes.status).toBe(400)
        const noMsgJson = await noMsgRes.json()
        expect(noMsgJson.error).toMatch(/message/i)
    })
})
