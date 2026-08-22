import { test, expect } from '@playwright/test'
import {
    ACTIVE_WINDOWS_PANEL_RESERVE,
    layoutMissionControlWindow,
    missionControlGrid,
} from '../src/lib/mission-control-layout'

test.describe('mission control layout', () => {
    test('1–3 windows stay on a single row', () => {
        expect(missionControlGrid(1)).toEqual({ cols: 1, rows: 1 })
        expect(missionControlGrid(2)).toEqual({ cols: 2, rows: 1 })
        expect(missionControlGrid(3)).toEqual({ cols: 3, rows: 1 })
    })

    test('4 windows use a 2×2 grid, 5–9 use 3 columns', () => {
        expect(missionControlGrid(4)).toEqual({ cols: 2, rows: 2 })
        expect(missionControlGrid(5)).toEqual({ cols: 3, rows: 2 })
        expect(missionControlGrid(9)).toEqual({ cols: 3, rows: 3 })
    })

    test('two windows sit side by side left of the side panel', () => {
        const viewport = { width: 1440, height: 900 }
        const insets = { top: 60, right: ACTIVE_WINDOWS_PANEL_RESERVE, bottom: 24, left: 24 }
        const size = { width: 800, height: 600 }
        const a = layoutMissionControlWindow({ index: 0, count: 2, size, viewport, insets })
        const b = layoutMissionControlWindow({ index: 1, count: 2, size, viewport, insets })
        expect(a).not.toBeNull()
        expect(b).not.toBeNull()
        expect(a!.x).toBeLessThan(b!.x)
        const panelLeft = viewport.width - ACTIVE_WINDOWS_PANEL_RESERVE
        const aRight = a!.x + size.width / 2 + (size.width * a!.scale) / 2
        const bRight = b!.x + size.width / 2 + (size.width * b!.scale) / 2
        expect(aRight).toBeLessThan(panelLeft)
        expect(bRight).toBeLessThan(panelLeft)
    })

    test('last-row leftovers are centered', () => {
        const viewport = { width: 1440, height: 900 }
        const insets = { top: 60, right: ACTIVE_WINDOWS_PANEL_RESERVE, bottom: 24, left: 24 }
        const size = { width: 700, height: 500 }
        const first = layoutMissionControlWindow({ index: 3, count: 5, size, viewport, insets })
        const second = layoutMissionControlWindow({ index: 4, count: 5, size, viewport, insets })
        const mid = (viewport.width - insets.left - insets.right) / 2 + insets.left
        const firstCenter = first!.x + size.width / 2
        const secondCenter = second!.x + size.width / 2
        expect((firstCenter + secondCenter) / 2).toBeCloseTo(mid, 0)
    })
})
