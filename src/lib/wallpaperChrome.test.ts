// @vitest-environment node
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, expect, it } from 'vitest'
import {
    applyWallpaperBrowserChrome,
    DEFAULT_WALLPAPER,
    KEPT_WALLPAPERS,
    migrateAppearanceSettings,
    SITE_APPEARANCE_DEFAULTS_VERSION,
    WALLPAPER_FIELDS,
    WALLPAPER_THEME_COLORS,
    resolveChromeTheme,
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
            light: 'linear-gradient(180deg,#4A8F7C_0%',
            dark: 'linear-gradient(180deg,#2E6B5C_0%',
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
        'keyboard-garden': {
            light: 'linear-gradient(180deg,#FDEECD_0%',
            dark: 'linear-gradient(180deg,#1E1F23_0%',
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


describe('resolveChromeTheme follows the saved color mode', () => {
    it('stays dark when the page class has not caught up', () => {
        expect(resolveChromeTheme('dark', 'light', false)).toBe('dark')
    })

    it('stays light when the saved mode is light', () => {
        expect(resolveChromeTheme('light', 'dark', true)).toBe('light')
    })

    it('uses the system preference when the mode is system', () => {
        expect(resolveChromeTheme('system', 'light', true)).toBe('dark')
        expect(resolveChromeTheme('system', 'dark', false)).toBe('light')
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

    it('does not reset a kept wallpaper to the product default when migrating from v0', () => {
        const next = migrateAppearanceSettings({
            wallpaper: 'plaza-bang',
            siteDefaultsVersion: 0,
        })
        expect(next.wallpaper).toBe('plaza-bang')
        expect(next.siteDefaultsVersion).toBe(SITE_APPEARANCE_DEFAULTS_VERSION)
    })

    it('upgrades previous product default draft-world to current DEFAULT_WALLPAPER once', () => {
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

    it('boot + theme-init recreate theme-color meta (Safari sticky chrome)', () => {
        expect(documentBoot).toContain('Safari caches theme-color')
        expect(themeInit).toContain('Safari caches theme-color')
        expect(documentBoot).toContain('metas[i].parentNode.removeChild(metas[i])')
        expect(themeInit).toContain('metas[i].parentNode.removeChild(metas[i])')
    })

    it('mobile chrome extends body::before into safe-area insets', () => {
        expect(mobileCss).toContain('safe-area-inset-top')
        expect(mobileCss).toContain('safe-area-inset-bottom')
    })

    it('unqualified html chrome fallback matches DEFAULT_WALLPAPER, not leftover keyboard-mint', () => {
        const light = WALLPAPER_FIELDS[DEFAULT_WALLPAPER].light
        const dark = WALLPAPER_FIELDS[DEFAULT_WALLPAPER].dark
        const css = globalCss.replace(/\r\n/g, '\n')
        expect(css).toContain(`--browser-chrome: ${light.top.toLowerCase()};`)
        expect(css).toContain(`--browser-chrome-field: ${light.css.toLowerCase()};`)
        expect(css).toContain(`html.dark {\n    --browser-chrome: ${dark.top.toLowerCase()};`)
        expect(css).toContain("html[data-wallpaper='keyboard-mint']")
        expect(css).not.toMatch(/html \{\s*--browser-chrome: #4a8f7c;/)
    })
})


describe('applyWallpaperBrowserChrome clears sticky mint chrome', () => {
    type Meta = { name: string; content: string; getAttribute: (k: string) => string | null; setAttribute: (k: string, v: string) => void; removeAttribute: (k: string) => void; remove: () => void; parentNode: { removeChild: (n: Meta) => void } | null }

    function installDom() {
        const metas: Meta[] = []
        const makeMeta = (name = '', content = ''): Meta => {
            const meta: Meta = {
                name,
                content,
                getAttribute(k) {
                    if (k === 'name') return meta.name
                    if (k === 'content') return meta.content
                    if (k === 'media') return null
                    return null
                },
                setAttribute(k, v) {
                    if (k === 'name') meta.name = v
                    if (k === 'content') meta.content = v
                },
                removeAttribute() {},
                remove() {
                    const i = metas.indexOf(meta)
                    if (i >= 0) metas.splice(i, 1)
                },
                parentNode: {
                    removeChild(n) {
                        const i = metas.indexOf(n)
                        if (i >= 0) metas.splice(i, 1)
                    },
                },
            }
            return meta
        }

        const styleStore: Record<string, string> = {}
        const attrs: Record<string, string> = {}
        const root = {
            style: {
                setProperty(k: string, v: string) {
                    styleStore[k] = v
                },
                getPropertyValue(k: string) {
                    return styleStore[k] || ''
                },
                removeProperty(k: string) {
                    delete styleStore[k]
                },
                cssText: '',
            },
            setAttribute(k: string, v: string) {
                attrs[k] = v
            },
            getAttribute(k: string) {
                return attrs[k] ?? null
            },
            removeAttribute(k: string) {
                delete attrs[k]
            },
            classList: { contains: () => false },
            offsetHeight: 1,
        }
        const bodyAttrs: Record<string, string> = {}
        const body = {
            style: {
                setProperty() {},
                getPropertyValue() {
                    return ''
                },
                removeProperty() {},
                cssText: '',
            },
            setAttribute(k: string, v: string) {
                bodyAttrs[k] = v
            },
            getAttribute(k: string) {
                return bodyAttrs[k] ?? null
            },
            removeAttribute(k: string) {
                delete bodyAttrs[k]
            },
            classList: { contains: () => false },
        }
        const head = {
            querySelector(sel: string) {
                if (sel.startsWith('meta[name="')) {
                    const name = sel.slice('meta[name="'.length, -2)
                    return metas.find((m) => m.name === name) || null
                }
                return null
            },
            querySelectorAll(sel: string) {
                if (sel.startsWith('meta[name="')) {
                    const name = sel.slice('meta[name="'.length, -2)
                    return metas.filter((m) => m.name === name) as unknown as NodeListOf<HTMLMetaElement>
                }
                return [] as unknown as NodeListOf<HTMLMetaElement>
            },
            appendChild(node: Meta) {
                metas.push(node)
                return node
            },
        }

        const doc = {
            documentElement: root,
            body,
            head,
            createElement(tag: string) {
                if (tag === 'meta') return makeMeta()
                return {}
            },
            visibilityState: 'visible',
            addEventListener() {},
        }

        Object.defineProperty(globalThis, 'document', { value: doc, configurable: true })
        Object.defineProperty(globalThis, 'window', {
            value: {
                __wallpaper: undefined as string | undefined,
                __setWallpaper: undefined as ((w: string) => void) | undefined,
                matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
                addEventListener() {},
                requestAnimationFrame: (cb: FrameRequestCallback) => {
                    cb(0)
                    return 0
                },
            },
            configurable: true,
        })
        Object.defineProperty(globalThis, 'navigator', {
            value: { userAgent: 'Mozilla/5.0', platform: 'Linux', maxTouchPoints: 0 },
            configurable: true,
        })
        Object.defineProperty(globalThis, 'MutationObserver', {
            value: class {
                observe() {}
                disconnect() {}
            },
            configurable: true,
        })
        return { root, body, metas, styleStore }
    }

    it('replaces theme-color meta node and CSS vars when leaving keyboard-mint for cobalt', async () => {
        const { root, body, metas, styleStore } = installDom()
        // Fresh module state would be ideal; force:true still replaces meta nodes.
        applyWallpaperBrowserChrome({
            wallpaper: 'keyboard-mint',
            colorMode: 'light',
            theme: 'light',
            force: true,
        })
        const mintMeta = metas.find((m) => m.name === 'theme-color')
        expect(mintMeta).toBeTruthy()
        expect(mintMeta!.content.toUpperCase()).toBe(WALLPAPER_FIELDS['keyboard-mint'].light.top.toUpperCase())
        expect(styleStore['--browser-chrome'].toUpperCase()).toBe(
            WALLPAPER_FIELDS['keyboard-mint'].light.top.toUpperCase()
        )
        expect(root.getAttribute('data-wallpaper')).toBe('keyboard-mint')

        applyWallpaperBrowserChrome({
            wallpaper: 'cobalt',
            colorMode: 'light',
            theme: 'light',
            force: true,
        })
        const themeMetas = metas.filter((m) => m.name === 'theme-color')
        expect(themeMetas).toHaveLength(1)
        const cobaltMeta = themeMetas[0]
        expect(cobaltMeta).not.toBe(mintMeta)
        expect(cobaltMeta.content.toUpperCase()).toBe(WALLPAPER_FIELDS.cobalt.light.top.toUpperCase())
        expect(root.getAttribute('data-wallpaper')).toBe('cobalt')
        expect(body.getAttribute('data-wallpaper')).toBe('cobalt')
        expect(styleStore['--browser-chrome'].toUpperCase()).toBe(WALLPAPER_FIELDS.cobalt.light.top.toUpperCase())
        expect(styleStore['--browser-chrome-bottom'].toUpperCase()).toBe(
            WALLPAPER_FIELDS.cobalt.light.bottom.toUpperCase()
        )
        expect(styleStore['--browser-chrome-field']).toBe(WALLPAPER_FIELDS.cobalt.light.css)
    })

    it('replaces theme-color meta when leaving keyboard-mint for paper-white', () => {
        const { root, metas, styleStore } = installDom()
        applyWallpaperBrowserChrome({
            wallpaper: 'keyboard-mint',
            colorMode: 'light',
            theme: 'light',
            force: true,
        })
        const mintMeta = metas.find((m) => m.name === 'theme-color')
        applyWallpaperBrowserChrome({
            wallpaper: 'paper-white',
            colorMode: 'light',
            theme: 'light',
            force: true,
        })
        const next = metas.find((m) => m.name === 'theme-color')
        expect(next).not.toBe(mintMeta)
        expect(next!.content.toUpperCase()).toBe('#FFFFFF')
        expect(styleStore['--browser-chrome'].toUpperCase()).toBe('#FFFFFF')
        expect(root.getAttribute('data-wallpaper')).toBe('paper-white')
    })
})
