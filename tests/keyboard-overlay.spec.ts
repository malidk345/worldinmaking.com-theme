import { test, expect } from '@playwright/test'
import {
    keyboardRevealDelta,
    measureKeyboardOverlay,
    overlaySafeBottom,
    shouldPadWritingFrame,
} from '../src/hooks/useKeyboardInset'

test.describe('keyboard overlay', () => {
    test('keyboard shrink becomes inset without treating pan as extra height', () => {
        expect(measureKeyboardOverlay(800, 500, 0)).toEqual({ inset: 300, pan: 0, open: true })
        expect(measureKeyboardOverlay(800, 500, 300)).toEqual({ inset: 300, pan: 300, open: true })
    })

    test('small chrome changes are not a keyboard', () => {
        expect(measureKeyboardOverlay(800, 780, 0)).toEqual({ inset: 0, pan: 0, open: false })
        expect(measureKeyboardOverlay(800, 800, 0)).toEqual({ inset: 0, pan: 0, open: false })
    })

    test('iOS pan alone still counts as keyboard open and lifts composers', () => {
        expect(measureKeyboardOverlay(800, 800, 280)).toEqual({ inset: 280, pan: 280, open: true })
    })

    test('overlay-safe bottom is layout height minus keyboard minus gutter', () => {
        expect(overlaySafeBottom(800, 300, 12)).toBe(488)
        expect(overlaySafeBottom(200, 180, 12)).toBe(48)
    })

    test('a comment at the bottom of a thread scrolls up to sit on the keyboard', () => {
        expect(keyboardRevealDelta({ top: 620, bottom: 780 }, 12, overlaySafeBottom(800, 300, 12))).toBe(292)
        expect(keyboardRevealDelta({ top: 200, bottom: 360 }, 12, 488)).toBe(0)
        expect(keyboardRevealDelta({ top: -40, bottom: 80 }, 12, 488)).toBe(-52)
    })

    test('only pad a frame the keyboard actually covers, never a short split pane', () => {
        expect(shouldPadWritingFrame({ height: 700, bottom: 800 }, 800, 300)).toBe(true)
        expect(shouldPadWritingFrame({ height: 240, bottom: 800 }, 800, 300)).toBe(false)
        expect(shouldPadWritingFrame({ height: 700, bottom: 400 }, 800, 300)).toBe(false)
        expect(shouldPadWritingFrame({ height: 700, bottom: 800 }, 800, 0)).toBe(false)
    })

    test('mobile shell overlays the keyboard and keeps fields at 16px', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 })
        await page.goto('/', { waitUntil: 'domcontentloaded' })
        const viewport = page.locator('meta[name="viewport"][content*="overlays-content"]')
        await expect(viewport).toHaveCount(1)
        const inset = await page.evaluate(() =>
            getComputedStyle(document.documentElement).getPropertyValue('--keyboard-inset').trim()
        )
        expect(inset === '' || inset === '0px' || inset === '0').toBeTruthy()
        await page.evaluate(() => {
            const field = document.createElement('textarea')
            field.setAttribute('data-test-writing', '1')
            document.body.appendChild(field)
        })
        const fontSize = await page.locator('[data-test-writing]').evaluate((el) => getComputedStyle(el).fontSize)
        expect(fontSize).toBe('16px')
    })
})
