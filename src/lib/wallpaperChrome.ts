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

function upsertNamedMeta(name: string, content: string): void {
    const head = document.head
    let meta = head.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null
    if (!meta) {
        meta = document.createElement('meta')
        meta.setAttribute('name', name)
        head.appendChild(meta)
    }
    meta.setAttribute('content', content)
}

export function applyWallpaperBrowserChrome(opts: {
    wallpaper: string
    colorMode: ColorMode
    theme: ResolvedTheme
}): void {
    if (typeof document === 'undefined') return

    const pair = WALLPAPER_THEME_COLORS[resolveKeptWallpaper(opts.wallpaper)]
    const head = document.head
    head.querySelectorAll('meta[name="theme-color"]').forEach((el) => el.remove())

    const addThemeColor = (content: string, media?: string) => {
        const meta = document.createElement('meta')
        meta.setAttribute('name', 'theme-color')
        meta.setAttribute('content', content)
        if (media) meta.setAttribute('media', media)
        head.appendChild(meta)
    }

    if (opts.colorMode === 'system') {
        addThemeColor(pair.light, '(prefers-color-scheme: light)')
        addThemeColor(pair.dark, '(prefers-color-scheme: dark)')
    } else {
        addThemeColor(opts.theme === 'dark' ? pair.dark : pair.light)
    }

    const active =
        opts.colorMode === 'system'
            ? window.matchMedia('(prefers-color-scheme: dark)').matches
                ? pair.dark
                : pair.light
            : opts.theme === 'dark'
              ? pair.dark
              : pair.light

    // iOS PWA status bar: translucent over dark fields, default (dark glyphs) on light paper.
    upsertNamedMeta(
        'apple-mobile-web-app-status-bar-style',
        hexLuminance(active) < 150 ? 'black-translucent' : 'default'
    )
    upsertNamedMeta('msapplication-navbutton-color', active)
}
