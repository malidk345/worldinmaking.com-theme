import { test, expect } from '@playwright/test'
import { mapNotificationRow } from '../src/lib/wim-notifications'
import { notebookNotificationUrl, parseNotebookNotificationMark } from '../src/lib/notebook-notification-url'

test.describe('in-app notifications', () => {
    test('maps a stored reply notification into the panel question shape', () => {
        const mapped = mapNotificationRow({
            id: 9,
            post_id: 251,
            title: 'Agency after the feed',
            excerpt: 'New reply',
            reply_count: 3,
            created_at: '2026-08-15T12:00:00.000Z',
        })
        expect(mapped.id).toBe(9)
        expect(mapped.question.permalink).toBe('251')
        expect(mapped.question.subject).toBe('Agency after the feed')
        expect(mapped.question.replies).toHaveLength(3)
        expect(mapped.question.replies.every((reply) => reply.updatedAt === mapped.date)).toBe(true)
    })

    test('notebook mention links keep a mark query the editor can read', () => {
        expect(parseNotebookNotificationMark('/notebooks/nb-1?mark=mention')).toBe('mention')
        expect(parseNotebookNotificationMark('mention')).toBe('mention')
        expect(notebookNotificationUrl('nb-1', 'comment')).toBe('/notebooks/nb-1?mark=comment')
    })

    test('notifications page renders for guests or signed-in users', async ({ page }) => {
        const response = await page.goto('/community/notifications')
        expect(response?.status()).toBe(200)
    })
})
