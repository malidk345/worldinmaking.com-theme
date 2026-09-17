import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, expect, it } from 'vitest'
import { WALLPAPER_FIELDS, WALLPAPER_THEME_COLORS, type WallpaperName } from './wallpaperChrome'

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
            light: 'linear-gradient(268.63deg,#E3E1E4_0%',
            dark: 'linear-gradient(180deg,#141E40_0%',
        },
        'keyboard-mint': {
            light: 'linear-gradient(200deg,#D8DCCE_0%',
            dark: 'linear-gradient(200deg,#141E18_0%',
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
