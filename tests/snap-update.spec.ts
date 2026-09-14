import { test, expect } from '@playwright/test'
import { buildSnapOverrides } from '../src/lib/windowState'

test('buildSnapOverrides computes correct left/right snapped position and flags', () => {
    const prevWindow = { size: { width: 800, height: 600 }, position: { x: 50, y: 50 } }
    const snapRect = { size: { width: 500, height: 1000 }, position: { x: 0, y: 0 } }

    const leftOverrides = buildSnapOverrides('left', prevWindow, snapRect)
    expect(leftOverrides).toEqual({
        position: { x: 0, y: 0 },
        size: { width: 500, height: 1000 },
        previousSize: { width: 800, height: 600 },
        previousPosition: { x: 50, y: 50 },
        expanded: false,
        windowed: false,
        snapped: 'left',
    })

    const rightOverrides = buildSnapOverrides('right', prevWindow, snapRect)
    expect(rightOverrides).toEqual({
        position: { x: 0, y: 0 },
        size: { width: 500, height: 1000 },
        previousSize: { width: 800, height: 600 },
        previousPosition: { x: 50, y: 50 },
        expanded: false,
        windowed: false,
        snapped: 'right',
    })

    const falseOverrides = buildSnapOverrides(false, prevWindow, snapRect)
    expect(falseOverrides).toEqual({})

    const nullRectOverrides = buildSnapOverrides('left', prevWindow, null)
    expect(nullRectOverrides).toEqual({})
})
