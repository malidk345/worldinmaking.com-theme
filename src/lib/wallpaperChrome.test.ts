import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, expect, it } from 'vitest'
import {
    DEFAULT_WALLPAPER,
    KEPT_WALLPAPERS,
    migrateAppearanceSettings,
    SITE_APPEARANCE_DEFAULTS_VERSION,
    WALLPAPER_FIELDS,
    WALLPAPER_THEME_COLORS,
    type WallpaperName,
} from './wallpaperChrome'

const WALLPAPERS = resolve(__dirname, '../components/Desktop/Wallpapers.tsx')

function firstStop(source: string, needle: string): string | null {
    const at = source.indexOf(needle)
    if (at < 0) return null
    const slice = source.slice(at, at + 320)
    const match = slice.match(/#([0-9A-Fa-f]{6})_0%/) || slice.match(/bg-\[#([0-9A-Fa-f]{6})\]/)
    return match ? `#${match[1].toUpperCase()}` : null
}

function lastStop(source: string, needle: string): string | null {
    const at = source.indexOf(needle)
    if (at < 0) return null
    const slice = source.slice(at, at + 320)
    const hundred = slice.match(/#([0-9A-Fa-f]{6})_100%/)
    if (hundred) return `#${hundred[1].toUpperCase()}`
    const solid = slice.match(/bg-\[#([0-9A-Fa-f]{6})\]/)
    return solid ? `#${solid[1].toUpperCase()}` : null
}

describe('wallpaper chrome tokens match field 0% stops', () => {
    const source = readFileSync(WALLPAPERS, 'utf8')

    const fields: Record<WallpaperName, { light: string; dark: string }> = {
        cobalt: {
            light: 'linear-gradient(180deg,#2F7ED4_0%',
            dark: 'linear-gradient(180deg,#1E5DAD_0%',
        },
        hogzilla: {
            light: 'linear-gradient(180deg,#B4ADC4_0%',
            dark: 'linear-gradient(180deg,#141E40_0%',
        },
        'keyboard-mint': {
            light: 'linear-gradient(180deg,#2FD44E_0%',
            dark: 'linear-gradient(180deg,#1EAD3E_0%',
        },
        'draft-world': {
            light: 'linear-gradient(180deg,#F3EFE6_0%',
            dark: 'linear-gradient(180deg,#141E40_0%,#1A2748_55%',
        },
        'rain-embers': {
            light: 'linear-gradient(180deg,#1A3350_0%',
            dark: 'linear-gradient(180deg,#0F2236_0%',
        },
        'plaza-bang': {
            light: 'bg-[#E6DFD2]',
            dark: 'bg-[#141E40]',
        },
        'paper-white': {
            light: 'bg-[#FFFFFF]',
            dark: 'bg-[#121212]',
        },
    }

    it.each(Object.keys(fields) as WallpaperName[])('%s light/dark chrome equals wallpaper top and bottom', (name) => {
        const lightTop = firstStop(source, fields[name].light)
        const darkTop = firstStop(source, fields[name].dark)
        const lightBottom = lastStop(source, fields[name].light)
        const darkBottom = lastStop(source, fields[name].dark)
        expect(lightTop).toBe(WALLPAPER_THEME_COLORS[name].light.toUpperCase())
        expect(darkTop).toBe(WALLPAPER_THEME_COLORS[name].dark.toUpperCase())
        expect(lightBottom).toBe(WALLPAPER_FIELDS[name].light.bottom.toUpperCase())
        expect(darkBottom).toBe(WALLPAPER_FIELDS[name].dark.bottom.toUpperCase())
        expect(WALLPAPER_FIELDS[name].light.top.toUpperCase()).toBe(lightTop)
        expect(WALLPAPER_FIELDS[name].dark.top.toUpperCase()).toBe(darkTop)
    })
})


describe('migrateAppearanceSettings preserves user wallpaper', () => {
    it('keeps an explicit kept wallpaper when already on current defaults version', () => {
        const next = migrateAppearanceSettings({
            wallpaper: 'cobalt',
            siteDefaultsVersion: SITE_APPEARANCE_DEFAULTS_VERSION,
        })
        expect(next.wallpaper).toBe('cobalt')
        expect(next.siteDefaultsVersion).toBe(SITE_APPEARANCE_DEFAULTS_VERSION)
    })

    it('does not reset a kept wallpaper to keyboard-mint when migrating from v0', () => {
        const next = migrateAppearanceSettings({
            wallpaper: 'plaza-bang',
            siteDefaultsVersion: 0,
        })
        expect(next.wallpaper).toBe('plaza-bang')
        expect(next.siteDefaultsVersion).toBe(SITE_APPEARANCE_DEFAULTS_VERSION)
    })

    it('upgrades previous product default draft-world to keyboard-mint once', () => {
        const next = migrateAppearanceSettings({
            wallpaper: 'draft-world',
            siteDefaultsVersion: 0,
        })
        expect(next.wallpaper).toBe(DEFAULT_WALLPAPER)
        expect(next.siteDefaultsVersion).toBe(SITE_APPEARANCE_DEFAULTS_VERSION)
    })

    it('keeps paper-white through migration', () => {
        const next = migrateAppearanceSettings({
            wallpaper: 'paper-white',
            siteDefaultsVersion: 1,
        })
        expect(next.wallpaper).toBe('paper-white')
    })
})

describe('every kept wallpaper has chrome coverage', () => {
    const globalCss = readFileSync(resolve(__dirname, '../styles/global.css'), 'utf8')
    const mobileCss = readFileSync(resolve(__dirname, '../styles/wallpaper-mobile-chrome.css'), 'utf8')
    const themeInit = readFileSync(resolve(__dirname, '../../static/scripts/theme-init.js'), 'utf8')
    const documentBoot = readFileSync(resolve(__dirname, '../pages/_document.tsx'), 'utf8')

    it.each([...KEPT_WALLPAPERS])('%s is in WALLPAPER_FIELDS and THEME_COLORS tops match field 0%', (name) => {
        expect(WALLPAPER_FIELDS[name]).toBeTruthy()
        expect(WALLPAPER_THEME_COLORS[name]).toBeTruthy()
        expect(WALLPAPER_THEME_COLORS[name].light.toUpperCase()).toBe(WALLPAPER_FIELDS[name].light.top.toUpperCase())
        expect(WALLPAPER_THEME_COLORS[name].dark.toUpperCase()).toBe(WALLPAPER_FIELDS[name].dark.top.toUpperCase())
    })

    it.each([...KEPT_WALLPAPERS])('%s has html[data-wallpaper] tokens in global.css and mobile chrome css', (name) => {
        expect(globalCss).toContain(`html[data-wallpaper='${name}']`)
        expect(globalCss).toContain(`html.dark[data-wallpaper='${name}']`)
        expect(mobileCss).toContain(`html[data-wallpaper='${name}']`)
        expect(mobileCss).toContain(`html.dark[data-wallpaper='${name}']`)
    })

    it.each([...KEPT_WALLPAPERS])('%s light top is present in theme-init.js THEME_COLORS', (name) => {
        const top = WALLPAPER_FIELDS[name].light.top
        expect(themeInit).toContain(`'${name}'`)
        expect(themeInit.toUpperCase()).toContain(top.toUpperCase())
    })

    it('boot document resolves live wallpaper (no stale closure on theme change)', () => {
        expect(documentBoot).toContain('resolveWallpaper')
        expect(documentBoot).toContain('__setWallpaper')
        expect(documentBoot).toContain('window.__wallpaper')
    })

    it('mobile chrome extends body::before into safe-area insets', () => {
        expect(mobileCss).toContain('safe-area-inset-top')
        expect(mobileCss).toContain('safe-area-inset-bottom')
    })
})
