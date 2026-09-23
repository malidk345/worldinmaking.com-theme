// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { measureKeyboardOverlay, nextStableLayoutHeight } from './useKeyboardInset'

describe('keyboard inset against a stationary window', () => {
    it('keeps the pre-keyboard height when innerHeight shrinks and width does not', () => {
        const locked = nextStableLayoutHeight({ width: 390, height: 800 }, 390, 520)
        expect(locked).toEqual({ width: 390, height: 800 })
        expect(measureKeyboardOverlay(locked.height, 520, 0)).toEqual({ inset: 280, pan: 0, open: true })
    })

    it('resets the lock on rotation and grows when the keyboard closes', () => {
        const turned = nextStableLayoutHeight({ width: 390, height: 800 }, 700, 390)
        expect(turned).toEqual({ width: 700, height: 390 })
        const closed = nextStableLayoutHeight(turned, 700, 420)
        expect(closed.height).toBe(420)
        expect(measureKeyboardOverlay(closed.height, 420, 0).open).toBe(false)
    })
})
