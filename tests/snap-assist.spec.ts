import { test, expect } from '@playwright/test'
import {
    SNAP_ARM_DISTANCE,
    resolveSnapZone,
    snapLayout,
    snapZoneFromPoint,
} from '../src/components/AppWindow/SnapAssistOverlay'

function bounds(width = 1000, height = 800, left = 0, top = 0): DOMRect {
    return {
        left,
        top,
        right: left + width,
        bottom: top + height,
        width,
        height,
        x: left,
        y: top,
        toJSON() {
            return this
        },
    } as DOMRect
}

test.describe('Windows-like snap zones', () => {
    test('cursor at the left edge snaps left', () => {
        expect(snapZoneFromPoint(10, 200, bounds())).toBe('left')
    })

    test('cursor at the right edge snaps right', () => {
        expect(snapZoneFromPoint(990, 200, bounds())).toBe('right')
    })

    test('cursor at the top edge maximizes', () => {
        expect(snapZoneFromPoint(500, 8, bounds())).toBe('maximize')
    })

    test('cursor in the middle does not snap', () => {
        expect(snapZoneFromPoint(500, 400, bounds())).toBeNull()
    })

    test('a window kissing an edge does not snap if the cursor is in the middle', () => {
        expect(resolveSnapZone(400, 300, bounds(), { dragDistance: 80 })).toBeNull()
    })

    test('snap stays off until the pointer has actually moved', () => {
        expect(resolveSnapZone(10, 200, bounds(), { dragDistance: 4 })).toBeNull()
        expect(resolveSnapZone(10, 200, bounds(), { dragDistance: SNAP_ARM_DISTANCE })).toBe('left')
    })

    test('the zone the drag started in is ignored so a docked window can be pulled out', () => {
        expect(resolveSnapZone(10, 200, bounds(), { dragDistance: 80, ignoreZone: 'left' })).toBeNull()
        expect(resolveSnapZone(990, 200, bounds(), { dragDistance: 80, ignoreZone: 'left' })).toBe('right')
    })

    test('committed snap is flush with the desktop, not inset by the taskbar', () => {
        const desktop = { width: 1200, height: 800 }
        const left = snapLayout('left', desktop, 0)
        const right = snapLayout('right', desktop, 0)
        expect(left).toEqual({ x: 0, y: 0, width: 600, height: 800 })
        expect(right).toEqual({ x: 600, y: 0, width: 600, height: 800 })
        expect(left.x + left.width).toBe(right.x)
        expect(right.x + right.width).toBe(desktop.width)
    })

    test('preview snap keeps a glass inset inside the same desktop box', () => {
        const desktop = { width: 1200, height: 800 }
        const left = snapLayout('left', desktop, 8)
        expect(left.x).toBe(8)
        expect(left.y).toBe(8)
        expect(left.width).toBe(1200 / 2 - 12)
        expect(left.height).toBe(784)
    })
})
