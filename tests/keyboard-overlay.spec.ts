import { test, expect } from '@playwright/test'
import { measureKeyboardOverlay } from '../src/hooks/useKeyboardInset'

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
})
