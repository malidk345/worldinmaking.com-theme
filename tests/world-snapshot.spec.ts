import { test, expect } from '@playwright/test'
import {
    DEFAULT_REDUCE_TRANSPARENCY,
    DEFAULT_WALLPAPER,
    migrateAppearanceSettings,
} from '../src/lib/wallpaperChrome'
import { isCancelledRouteError } from '../src/lib/swallow-cancelled-route'
import { createRoomToken, parseWorldSnapshot } from '../src/lib/world-snapshot'

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
