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
/** Bump when product appearance defaults change so existing local settings pick them up once. */
export const SITE_APPEARANCE_DEFAULTS_VERSION = 2
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

/**
 * Top-of-field colors for each wallpaper — the band that sits under the mobile
 * browser tab / address bar. Keep these in lockstep with the CSS fields in
 * `src/components/Desktop/Wallpapers.tsx`.
 */
export const WALLPAPER_THEME_COLORS: Record<WallpaperName, WallpaperTone> = {
    cobalt: { light: '#2F7ED4', dark: '#1E5DAD' },
    hogzilla: { light: '#E3E1E4', dark: '#141E40' },
    'keyboard-mint': { light: '#C9D0BE', dark: '#141E18' },
    'draft-world': { light: '#F3EFE6', dark: '#141E40' },
    'rain-embers': { light: '#1A3350', dark: '#0F2236' },
    'plaza-bang': { light: '#E6DFD2', dark: '#141E40' },
}

export const DEFAULT_WALLPAPER_THEME_COLOR: WallpaperTone = WALLPAPER_THEME_COLORS[DEFAULT_WALLPAPER]

export function resolveKeptWallpaper(wallpaper: string | null | undefined): WallpaperName {
    return KEPT_WALLPAPERS.includes(wallpaper as WallpaperName)
        ? (wallpaper as WallpaperName)
        : DEFAULT_WALLPAPER
}

export function migrateAppearanceSettings<T extends {
    wallpaper?: string
    reduceTransparency?: boolean
    siteDefaultsVersion?: number
}>(settings: T): T {
    const version = Number(settings.siteDefaultsVersion || 0)
    if (version >= SITE_APPEARANCE_DEFAULTS_VERSION) {
        return {
            ...settings,
            wallpaper: resolveKeptWallpaper(settings.wallpaper),
        }
    }
    const raw = settings.wallpaper
    const wallpaper =
        !raw || raw === PREVIOUS_DEFAULT_WALLPAPER || !KEPT_WALLPAPERS.includes(raw as WallpaperName)
            ? DEFAULT_WALLPAPER
            : resolveKeptWallpaper(raw)
    return {
        ...settings,
        wallpaper,
        reduceTransparency: DEFAULT_REDUCE_TRANSPARENCY,
        siteDefaultsVersion: SITE_APPEARANCE_DEFAULTS_VERSION,
    }
}

export function getWallpaperThemeColor(wallpaper: string, mode: ResolvedTheme): string {
    return WALLPAPER_THEME_COLORS[resolveKeptWallpaper(wallpaper)][mode]
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
    const metas = Array.from(head.querySelectorAll('meta[name="theme-color"]')) as HTMLMetaElement[]
    const keep = metas[0] || upsertNamedMeta('theme-color', color)
    if (!keep) return
    keep.removeAttribute('media')
    keep.setAttribute('content', color)
    for (const extra of metas.slice(1)) extra.remove()
}

let chromeGuard: MutationObserver | null = null
let lastChromeColor = ''

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

export function applyWallpaperBrowserChrome(opts: {
    wallpaper: string
    colorMode: ColorMode
    theme: ResolvedTheme
}): void {
    if (typeof document === 'undefined') return

    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false
    const active = chromeColorFor(opts.wallpaper, opts.colorMode, opts.theme, prefersDark)
    lastChromeColor = active

    const root = document.documentElement
    root.style.setProperty('--browser-chrome', active)
    root.style.backgroundColor = active
    if (document.body) document.body.style.backgroundColor = active

    syncThemeColorMeta(active)
    upsertNamedMeta(
        'apple-mobile-web-app-status-bar-style',
        hexLuminance(active) < 150 ? 'black-translucent' : 'default'
    )
    upsertNamedMeta('msapplication-navbutton-color', active)
    startChromeGuard()
}
