import { test, expect } from '@playwright/test'

test.describe('Mobile Notebook Experience', () => {
    test.use({ viewport: { width: 375, height: 667 }, hasTouch: true }) // Mobile viewport

    test('mobile notebook e2e coverage', async ({ page }) => {
        // Mock notebook storage to start with a clean slate
        await page.addInitScript(() => {
            window.localStorage.setItem('cookie_consent', 'yes') // Suppress cookie banner using verified key
        })

        // We will open the "Notebooks" app directly via the desktop app
        await page.goto('/')

        // Click "Notebooks" in the Home window
        await page.getByRole('dialog', { name: 'Home' }).getByRole('button', { name: 'Notebooks Write and publish notes.' }).first().click()

        // Create a new notebook
        await page.getByRole('button', { name: /New notebook/i }).first().click()

        // Wait for editor to be ready
        const editor = page.getByRole('textbox', { name: 'Notebook editor' })
        await editor.waitFor({ state: 'visible', timeout: 30000 })

        // Click into the editor title
        const title = page.getByRole('heading', { name: 'Untitled notebook' })
        await title.click()

        // 1. Keyboard interaction / typing
        await page.keyboard.press('End')
        await page.keyboard.press('Enter') // Create new block
        await page.keyboard.type('Typing test.')
        await expect(editor).toContainText('Typing test.')

        // 2. Open slash/insert menu
        await page.keyboard.type('/')
        const insertMenu = page.locator('.MarkdownNotebook__insert-menu')
        await insertMenu.waitFor({ state: 'visible', timeout: 5000 })
        await expect(insertMenu.locator('.MarkdownNotebook__insert-item').first()).toBeVisible()

        // 3. Close slash menu
        await page.keyboard.press('Escape')
        await expect(insertMenu).not.toBeVisible()
    })
})
