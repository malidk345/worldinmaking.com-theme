export type WallpaperName =
    | 'cobalt'
    | 'hogzilla'
    | 'keyboard-mint'
    | 'draft-world'
    | 'rain-embers'
    | 'plaza-bang'
export type ColorMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export const DEFAULT_WALLPAPER: WallpaperName = 'keyboard-mint'
export const DEFAULT_REDUCE_TRANSPARENCY = true
export const DEFAULT_ICON_SET = 'pixel' as const
/** Bump when product appearance defaults change so existing local settings pick them up once. */
export const SITE_APPEARANCE_DEFAULTS_VERSION = 3
const PREVIOUS_DEFAULT_WALLPAPER: WallpaperName = 'draft-world'

export const KEPT_WALLPAPERS: readonly WallpaperName[] = [
    'keyboard-mint',
    'cobalt',
    'hogzilla',
    'draft-world',
    'rain-embers',
    'plaza-bang',
]

export interface WallpaperTone {
    light: string
    dark: string
}

export type WallpaperField = {
    top: string
    bottom: string
    /** Same field as `Wallpapers.tsx` — paints html/body so top and bottom chrome continue. */
    css: string
}

/**
 * Field 0% = top of the viewport (status bar / theme-color).
 * Field 100% = bottom of the viewport (home indicator / overscroll).
 * `css` must match the wallpaper layer in `Wallpapers.tsx`.
 */
export const WALLPAPER_FIELDS: Record<WallpaperName, { light: WallpaperField; dark: WallpaperField }> = {
    cobalt: {
        light: {
            top: '#2F7ED4',
            bottom: '#5EB0F0',
            css: 'linear-gradient(180deg, #2F7ED4 0%, #4A9EE6 42%, #5EB0F0 100%)',
        },
        dark: {
            top: '#1E5DAD',
            bottom: '#3D8FDC',
            css: 'linear-gradient(180deg, #1E5DAD 0%, #2F7ED4 50%, #3D8FDC 100%)',
        },
    },
    hogzilla: {
        light: {
            top: '#B4ADC4',
            bottom: '#8B839C',
            css: 'linear-gradient(180deg, #B4ADC4 0%, #9E97AE 52%, #8B839C 100%)',
        },
        dark: {
            top: '#141E40',
            bottom: '#46368B',
            css: 'linear-gradient(180deg, #141E40 0%, #46368B 100%)',
        },
    },
    'keyboard-mint': {
        light: {
            top: '#D8DCCE',
            bottom: '#BDC6B0',
            css: 'linear-gradient(200deg, #D8DCCE 0%, #C9D0BE 48%, #BDC6B0 100%)',
        },
        dark: {
            top: '#141E18',
            bottom: '#121A14',
            css: 'linear-gradient(200deg, #141E18 0%, #18241C 52%, #121A14 100%)',
        },
    },
    'draft-world': {
        light: {
            top: '#F3EFE6',
            bottom: '#DDD6C8',
            css: 'linear-gradient(180deg, #F3EFE6 0%, #E8E2D6 55%, #DDD6C8 100%)',
        },
        dark: {
            top: '#141E40',
            bottom: '#121A33',
            css: 'linear-gradient(180deg, #141E40 0%, #1A2748 55%, #121A33 100%)',
        },
    },
    'rain-embers': {
        light: {
            top: '#1A3350',
            bottom: '#163044',
            css: 'linear-gradient(180deg, #1A3350 0%, #23486A 52%, #163044 100%)',
        },
        dark: {
            top: '#0F2236',
            bottom: '#0C1A28',
            css: 'linear-gradient(180deg, #0F2236 0%, #17324A 50%, #0C1A28 100%)',
        },
    },
    'plaza-bang': {
        light: { top: '#E6DFD2', bottom: '#E6DFD2', css: '#E6DFD2' },
        dark: { top: '#141E40', bottom: '#141E40', css: '#141E40' },
    },
}

export const WALLPAPER_THEME_COLORS: Record<WallpaperName, WallpaperTone> = {
    cobalt: { light: WALLPAPER_FIELDS.cobalt.light.top, dark: WALLPAPER_FIELDS.cobalt.dark.top },
    hogzilla: { light: WALLPAPER_FIELDS.hogzilla.light.top, dark: WALLPAPER_FIELDS.hogzilla.dark.top },
    'keyboard-mint': {
        light: WALLPAPER_FIELDS['keyboard-mint'].light.top,
        dark: WALLPAPER_FIELDS['keyboard-mint'].dark.top,
    },
    'draft-world': { light: WALLPAPER_FIELDS['draft-world'].light.top, dark: WALLPAPER_FIELDS['draft-world'].dark.top },
    'rain-embers': { light: WALLPAPER_FIELDS['rain-embers'].light.top, dark: WALLPAPER_FIELDS['rain-embers'].dark.top },
    'plaza-bang': { light: WALLPAPER_FIELDS['plaza-bang'].light.top, dark: WALLPAPER_FIELDS['plaza-bang'].dark.top },
}

export const DEFAULT_WALLPAPER_THEME_COLOR: WallpaperTone = WALLPAPER_THEME_COLORS[DEFAULT_WALLPAPER]
export const DEFAULT_WALLPAPER_FIELD = WALLPAPER_FIELDS[DEFAULT_WALLPAPER]

export function resolveKeptWallpaper(wallpaper: string | null | undefined): WallpaperName {
    return KEPT_WALLPAPERS.includes(wallpaper as WallpaperName)
        ? (wallpaper as WallpaperName)
        : DEFAULT_WALLPAPER
}

export function migrateAppearanceSettings<T extends {
    wallpaper?: string
    reduceTransparency?: boolean
    iconSet?: string
    siteDefaultsVersion?: number
}>(settings: T): T {
    const version = Number(settings.siteDefaultsVersion || 0)
    let next: T = {
        ...settings,
        wallpaper: resolveKeptWallpaper(settings.wallpaper),
    }
    if (version >= SITE_APPEARANCE_DEFAULTS_VERSION) {
        return next
    }
    if (version < 2) {
        const raw = settings.wallpaper
        next = {
            ...next,
            wallpaper:
                !raw || raw === PREVIOUS_DEFAULT_WALLPAPER || !KEPT_WALLPAPERS.includes(raw as WallpaperName)
                    ? DEFAULT_WALLPAPER
                    : resolveKeptWallpaper(raw),
            reduceTransparency: DEFAULT_REDUCE_TRANSPARENCY,
        }
    }
    if (version < 3) {
        next = { ...next, iconSet: DEFAULT_ICON_SET }
    }
    return {
        ...next,
        siteDefaultsVersion: SITE_APPEARANCE_DEFAULTS_VERSION,
    }
}

export function getWallpaperThemeColor(wallpaper: string, mode: ResolvedTheme): string {
    return WALLPAPER_THEME_COLORS[resolveKeptWallpaper(wallpaper)][mode]
}

export function getWallpaperField(wallpaper: string, mode: ResolvedTheme): WallpaperField {
    return WALLPAPER_FIELDS[resolveKeptWallpaper(wallpaper)][mode]
}

export function resolveChromeTheme(colorMode: ColorMode, theme: ResolvedTheme, prefersDark = false): ResolvedTheme {
    if (colorMode === 'system') return prefersDark ? 'dark' : 'light'
    return theme === 'dark' ? 'dark' : 'light'
}

export function chromeColorFor(
    wallpaper: string,
    colorMode: ColorMode,
    theme: ResolvedTheme,
    prefersDark = false
): string {
    return getWallpaperThemeColor(wallpaper, resolveChromeTheme(colorMode, theme, prefersDark))
}

/** iOS WebKit: status bar overlays the page; the opaque chrome is the bottom toolbar. */
export function usesOverlayStatusBar(): boolean {
    if (typeof navigator === 'undefined') return false
    const ua = navigator.userAgent || ''
    if (/iP(hone|od|ad)/i.test(ua)) return true
    if (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1) return true
    return false
}

export function themeColorForEngine(field: WallpaperField): string {
    return usesOverlayStatusBar() ? field.bottom : field.top
}

function hexLuminance(hex: string): number {
    const raw = hex.replace('#', '')
    const normalized = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw
    const n = parseInt(normalized, 16)
    if (Number.isNaN(n)) return 255
    const r = (n >> 16) & 255
    const g = (n >> 8) & 255
    const b = n & 255
    return (r * 299 + g * 587 + b * 114) / 1000
}

function upsertNamedMeta(name: string, content: string): HTMLMetaElement | null {
    if (typeof document === 'undefined') return null
    const head = document.head
    let meta = head.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null
    if (!meta) {
        meta = document.createElement('meta')
        meta.setAttribute('name', name)
        head.appendChild(meta)
    }
    meta.setAttribute('content', content)
    return meta
}

function syncThemeColorMeta(color: string): void {
    const head = document.head
    chromeGuard?.disconnect()
    const metas = Array.from(head.querySelectorAll('meta[name="theme-color"]')) as HTMLMetaElement[]
    const keep = metas[0] || upsertNamedMeta('theme-color', color)
    if (keep) {
        keep.removeAttribute('media')
        keep.setAttribute('content', color)
    }
    for (const extra of metas.slice(1)) extra.remove()
    chromeGuard?.observe(head, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['content', 'media', 'name'],
    })
}

let chromeGuard: MutationObserver | null = null
let lastChromeColor = ''
let lastChromeKey = ''
let lastChromeOpts: {
    wallpaper: string
    colorMode: ColorMode
    theme: ResolvedTheme
} | null = null
let chromeLifetime = false

function startChromeGuard(): void {
    if (typeof document === 'undefined' || chromeGuard) return
    chromeGuard = new MutationObserver(() => {
        if (!lastChromeColor) return
        const metas = document.head.querySelectorAll('meta[name="theme-color"]')
        const first = metas[0] as HTMLMetaElement | undefined
        if (metas.length === 1 && first && !first.media && first.content === lastChromeColor) return
        syncThemeColorMeta(lastChromeColor)
    })
    chromeGuard.observe(document.head, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['content', 'media', 'name'],
    })
}

function startChromeLifetime(): void {
    if (chromeLifetime || typeof window === 'undefined') return
    chromeLifetime = true
    const relock = () => {
        if (!lastChromeOpts) return
        applyWallpaperBrowserChrome({ ...lastChromeOpts, force: true })
    }
    window.addEventListener('pageshow', relock)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') relock()
    })
}

export function applyWallpaperBrowserChrome(opts: {
    wallpaper: string
    colorMode: ColorMode
    theme: ResolvedTheme
    force?: boolean
}): void {
    if (typeof document === 'undefined') return

    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false
    const mode = resolveChromeTheme(opts.colorMode, opts.theme, prefersDark)
    const field = getWallpaperField(opts.wallpaper, mode)
    const chrome = themeColorForEngine(field)
    const key = `${resolveKeptWallpaper(opts.wallpaper)}|${mode}|${chrome}`
    lastChromeOpts = { wallpaper: opts.wallpaper, colorMode: opts.colorMode, theme: opts.theme }
    if (!opts.force && key === lastChromeKey && lastChromeColor === chrome) return
    lastChromeKey = key
    lastChromeColor = chrome

    const root = document.documentElement
    root.style.setProperty('--browser-chrome', field.top)
    root.style.setProperty('--browser-chrome-bottom', field.bottom)
    root.style.setProperty('--browser-chrome-field', field.css)
    root.style.removeProperty('background-color')
    if (document.body) document.body.style.removeProperty('background-color')

    syncThemeColorMeta(chrome)
    upsertNamedMeta(
        'apple-mobile-web-app-status-bar-style',
        usesOverlayStatusBar() ? 'black-translucent' : hexLuminance(field.top) < 150 ? 'black-translucent' : 'default'
    )
    upsertNamedMeta('msapplication-navbutton-color', field.bottom)
    startChromeGuard()
    startChromeLifetime()
}
