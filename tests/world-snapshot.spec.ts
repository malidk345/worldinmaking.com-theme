import { test, expect } from '@playwright/test'
import {
    chromeColorFor,
    DEFAULT_REDUCE_TRANSPARENCY,
    DEFAULT_WALLPAPER,
    migrateAppearanceSettings,
    SITE_APPEARANCE_DEFAULTS_VERSION,
} from '../src/lib/wallpaperChrome'
import { isCancelledRouteError } from '../src/lib/swallow-cancelled-route'
import {
    buildWorldSnapshot,
    collectWorldWindows,
    createRoomToken,
    parseWorldSnapshot,
    restoreAppWindowFromWorld,
} from '../src/lib/world-snapshot'
import { buildSnapOverrides } from '../src/lib/windowState'

test.describe('world snapshot parse', () => {
    test('accepts a valid v1 snapshot and remaps retired wallpapers', () => {
        const parsed = parseWorldSnapshot({
            v: 1,
            wallpaper: 'keyboard-garden',
            colorMode: 'dark',
            reduceTransparency: true,
            clickBehavior: 'single',
            windows: [
                {
                    path: '/notebooks',
                    position: { x: 10, y: 20 },
                    size: { width: 40, height: 50 },
                    zIndex: 2,
                },
            ],
            pinnedItems: [{ label: 'Notes', url: '/notebooks', notebookId: 'n1' }],
        })
        expect(parsed).not.toBeNull()
        expect(parsed?.wallpaper).toBe('keyboard-mint')
        expect(parsed?.colorMode).toBe('dark')
        expect(parsed?.clickBehavior).toBe('single')
        expect(parsed?.windows).toEqual([
            {
                path: '/notebooks',
                position: { x: 10, y: 20 },
                size: { width: 40, height: 50 },
                zIndex: 2,
            },
        ])
        expect(parsed?.pinnedItems).toEqual([{ label: 'Notes', url: '/notebooks', notebookId: 'n1' }])
    })

    test('retains snapped properties from windows if present', () => {
        const parsed = parseWorldSnapshot({
            v: 1,
            wallpaper: 'cobalt',
            windows: [
                {
                    path: '/a',
                    position: { x: 10, y: 20 },
                    size: { width: 40, height: 50 },
                    zIndex: 2,
                    snapped: 'left',
                },
                {
                    path: '/b',
                    position: { x: 10, y: 20 },
                    size: { width: 40, height: 50 },
                    zIndex: 3,
                    snapped: 'right',
                },
                {
                    path: '/c',
                    position: { x: 10, y: 20 },
                    size: { width: 40, height: 50 },
                    zIndex: 4,
                    snapped: 'up', // Invalid snapped value
                },
            ],
        })
        expect(parsed?.windows).toEqual([
            {
                path: '/a',
                position: { x: 10, y: 20 },
                size: { width: 40, height: 50 },
                zIndex: 2,
                snapped: 'left',
            },
            {
                path: '/b',
                position: { x: 10, y: 20 },
                size: { width: 40, height: 50 },
                zIndex: 3,
                snapped: 'right',
            },
            {
                path: '/c',
                position: { x: 10, y: 20 },
                size: { width: 40, height: 50 },
                zIndex: 4,
            },
        ])
        expect(parsed?.pinnedItems).toEqual([])
    })

    test('drops unsafe window paths and clamps percents', () => {
        const parsed = parseWorldSnapshot({
            wallpaper: 'cobalt',
            windows: [
                { path: 'javascript:alert(1)', position: { x: 0, y: 0 }, size: { width: 40, height: 50 } },
                { path: '//evil.example', position: { x: 0, y: 0 }, size: { width: 40, height: 50 } },
                { path: '/ok', position: { x: 240, y: -20 }, size: { width: '12', height: 8 } },
            ],
            pinnedItems: [{ label: 'Nope', url: 'https://evil.example' }, { label: 'Home', url: '/home' }],
        })
        expect(parsed?.windows).toHaveLength(1)
        expect(parsed?.windows[0]).toEqual({
            path: '/ok',
            position: { x: 100, y: 0 },
            size: { width: 12, height: 8 },
            zIndex: 0,
        })
        expect(parsed?.pinnedItems).toEqual([{ label: 'Home', url: '/home' }])
    })

    test('rejects non-objects', () => {
        expect(parseWorldSnapshot(null)).toBeNull()
        expect(parseWorldSnapshot('{}')).toBeNull()
        expect(parseWorldSnapshot([])).toBeNull()
    })

    test('product defaults migrate old draft-world + transparency off once', () => {
        expect(DEFAULT_WALLPAPER).toBe('keyboard-mint')
        expect(DEFAULT_REDUCE_TRANSPARENCY).toBe(true)
        const migrated = migrateAppearanceSettings({
            wallpaper: 'draft-world',
            reduceTransparency: false,
        })
        expect(migrated.wallpaper).toBe('keyboard-mint')
        expect(migrated.reduceTransparency).toBe(true)
        const kept = migrateAppearanceSettings({
            wallpaper: 'hogzilla',
            reduceTransparency: false,
            siteDefaultsVersion: 2,
        })
        expect(kept.wallpaper).toBe('hogzilla')
        expect(kept.reduceTransparency).toBe(false)
    })

    test('v3 migrates icon set to pixel once without clobbering later custom choice', () => {
        expect(SITE_APPEARANCE_DEFAULTS_VERSION).toBe(3)
        const migrated = migrateAppearanceSettings({
            wallpaper: 'hogzilla',
            iconSet: 'default',
            siteDefaultsVersion: 2,
        })
        expect(migrated.iconSet).toBe('pixel')
        expect(migrated.wallpaper).toBe('hogzilla')
        const kept = migrateAppearanceSettings({
            wallpaper: 'hogzilla',
            iconSet: 'default',
            siteDefaultsVersion: 3,
        })
        expect(kept.iconSet).toBe('default')
    })

    test('browser chrome color follows the wallpaper field, not a generic page bg', () => {
        expect(chromeColorFor('cobalt', 'light', 'light')).toBe('#2F7ED4')
        expect(chromeColorFor('cobalt', 'dark', 'dark')).toBe('#1E5DAD')
        expect(chromeColorFor('keyboard-mint', 'system', 'light', true)).toBe('#141E18')
        expect(chromeColorFor('keyboard-mint', 'system', 'light', false)).toBe('#C9D0BE')
    })

    test('cancelled Next.js route errors are recognized', () => {
        expect(isCancelledRouteError(new Error('Cancel rendering route'))).toBe(true)
        expect(isCancelledRouteError({ cancelled: true })).toBe(true)
        expect(isCancelledRouteError(new Error('boom'))).toBe(false)
    })

    test('room tokens are unlisted-looking and long enough', () => {
        const token = createRoomToken()
        expect(token.startsWith('r')).toBe(true)
        expect(token.length).toBeGreaterThanOrEqual(8)
        expect(token).toMatch(/^r[abcdefghijkmnopqrstuvwxyz23456789]+$/)
        expect(createRoomToken()).not.toBe(token)
    })
})

test.describe('world snapshot collect/restore helpers', () => {
    test('collectWorldWindows percent-normalizes and keeps snapped', () => {
        const windows = collectWorldWindows(
            [
                {
                    path: '/notebooks/abc',
                    minimized: false,
                    position: { x: 128, y: 80 },
                    size: { width: 640, height: 400 },
                    zIndex: 2,
                    snapped: 'left',
                },
                {
                    path: '/minimized',
                    minimized: true,
                    position: { x: 0, y: 0 },
                    size: { width: 100, height: 100 },
                    zIndex: 1,
                },
                {
                    path: 'relative',
                    minimized: false,
                    position: { x: 0, y: 0 },
                    size: { width: 100, height: 100 },
                    zIndex: 3,
                },
            ],
            { innerWidth: 1280, innerHeight: 800, taskbarHeight: 40 }
        )
        expect(windows).toHaveLength(1)
        expect(windows[0]).toEqual({
            path: '/notebooks/abc',
            position: { x: 10, y: 80 / 760 * 100 },
            size: { width: 50, height: 50 },
            zIndex: 2,
            snapped: 'left',
        })
    })

    test('buildWorldSnapshot remaps wallpaper and defaults clickBehavior', () => {
        const snap = buildWorldSnapshot({
            wallpaper: 'keyboard-garden',
            colorMode: 'dark',
            windows: [],
            pinnedItems: [],
        })
        expect(snap.v).toBe(1)
        expect(snap.wallpaper).toBe('keyboard-mint')
        expect(snap.clickBehavior).toBe('double')
        expect(snap.reduceTransparency).toBe(false)
    })

    test('restoreAppWindowFromWorld applies buildSnapOverrides for left snap', () => {
        const restored = restoreAppWindowFromWorld(
            {
                path: '/a',
                position: { x: 0, y: 0 },
                size: { width: 50, height: 50 },
                zIndex: 2,
                snapped: 'left',
            },
            0,
            {
                innerWidth: 1000,
                innerHeight: 800,
                taskbarHeight: 40,
                fullW: 984,
                fullH: 744,
                isMobileClient: false,
                applySnapOverrides: buildSnapOverrides,
                getSnapRect: (side) =>
                    side === 'left'
                        ? { size: { width: 492, height: 744 }, position: { x: 0, y: 0 } }
                        : { size: { width: 492, height: 744 }, position: { x: 492, y: 0 } },
            }
        )
        expect(restored.snapped).toBe('left')
        expect(restored.size).toEqual({ width: 492, height: 744 })
        expect(restored.position).toEqual({ x: 0, y: 0 })
        expect(restored.previousSize).toEqual({ width: 500, height: 400 })
        expect(restored.windowed).toBe(false)
        expect(restored.expanded).toBe(false)
    })

    test('restoreAppWindowFromWorld skips snap overrides on mobile', () => {
        const restored = restoreAppWindowFromWorld(
            {
                path: '/a',
                position: { x: 10, y: 10 },
                size: { width: 40, height: 40 },
                zIndex: 1,
                snapped: 'right',
            },
            1,
            {
                innerWidth: 390,
                innerHeight: 844,
                taskbarHeight: 40,
                fullW: 374,
                fullH: 788,
                isMobileClient: true,
                applySnapOverrides: buildSnapOverrides,
                getSnapRect: () => ({ size: { width: 100, height: 100 }, position: { x: 9, y: 9 } }),
            }
        )
        expect(restored.snapped).toBe(false)
        expect(restored.expanded).toBe(true)
        expect(restored.size).toEqual({ width: 374, height: 788 })
        expect(restored.position).toEqual({ x: 0, y: 0 })
    })
})

