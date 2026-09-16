import { test, expect } from '@playwright/test'

test.describe('Study Window', () => {
    test('mounts empty study session when no deck is stored', async ({ page }) => {
        await page.goto('/study')

        await expect(page.locator('text=Study Session')).toBeVisible()
        await expect(page.locator('text=No flashcards yet')).toBeVisible()
    })
})
