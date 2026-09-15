import { test, expect } from '@playwright/test'

test.describe('Study Window', () => {
    test('mounts flashcard ui on /study path', async ({ page }) => {
        await page.goto('/study')

        // Assert header exists
        await expect(page.locator('text=Study Session')).toBeVisible()

        // Assert first card content exists
        await expect(page.locator('text=What is active recall?')).toBeVisible()

        // Flip card
        await page.locator('text=What is active recall?').click()

        // Assert back of card exists
        await expect(page.locator('text=Actively stimulating memory during the learning process.')).toBeVisible()

        // Rate card
        await page.locator('text=Good (3)').click()

        // Next card is visible
        await expect(page.locator('text=What is spaced repetition?')).toBeVisible()
    })
})
