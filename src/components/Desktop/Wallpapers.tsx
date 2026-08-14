import React from 'react'

/**
 * Wallpapers — same scenes / colors as wimpos, without 3D / character overlays.
 *
 * Keep: gradients, photo BGs, carpet tiles (the wallpaper itself).
 * Drop: hedge, hogzilla figure, office prop art, etc. stacked on top.
 *
 * Visibility: body[data-wallpaper] (theme-init / App.tsx).
 */

const FADE_OPACITY = 'transition-opacity duration-700 ease-in-out'
const FADE_COLORS = 'transition-colors duration-700 ease-in-out'

/** wimpos Hogzilla base — no hogzilla PNG overlay */
const Hogzilla = () => (
    <>
        <div
            className={`absolute inset-0 bg-[linear-gradient(268.63deg,#E3E1E4_0%,#FDFDFD_80%,#FDFDFD_100%)] opacity-100 dark:opacity-0 ${FADE_OPACITY}`}
        />
        <div
            className={`absolute inset-0 bg-[linear-gradient(180deg,#141E40_0%,#46368B_100%)] opacity-0 dark:opacity-100 ${FADE_OPACITY}`}
        />
    </>
)

/** wimpos Startup Monopoly base colors + board photos (scene art, not a 3D sprite) */
const StartupMonopoly = () => (
    <>
        <div className={`absolute inset-0 bg-[#E7E0DA] dark:bg-[#686E88] ${FADE_COLORS}`} />
    </>
)

/** wimpos Office Party carpet — no office character PNG */
const OfficeParty = () => (
    <>
        <div
            className="absolute inset-0 opacity-100"
            style={{
                backgroundImage: "url('https://res.cloudinary.com/dmukukwp6/image/upload/carpet_light_27d74f73b5.png')",
                backgroundSize: '200px 198px',
                backgroundRepeat: 'repeat',
            }}
        />
        <div
            className={`absolute inset-0 opacity-0 dark:opacity-100 ${FADE_OPACITY}`}
            style={{
                backgroundImage: "url('https://res.cloudinary.com/dmukukwp6/image/upload/carpet_dark_f1c9f5ce39.png')",
                backgroundSize: '200px 198px',
                backgroundRepeat: 'repeat',
            }}
        />
    </>
)

const mulberry32 = (seed: number) => {
    let s = seed | 0
    return () => {
        s = (s + 0x6d2b79f5) | 0
        let t = Math.imul(s ^ (s >>> 15), 1 | s)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

const blob = (nx: number, ny: number, cx: number, cy: number, rx: number, ry: number) => {
    const dx = (nx - cx) / rx
    const dy = (ny - cy) / ry
    return Math.exp(-(dx * dx + dy * dy))
}

/** 0..1 density field: empty pockets, packed clusters, stronger toward edges/top. */
const densityAt = (nx: number, ny: number) => {
    const edge = Math.max(nx, 1 - nx, ny, 1 - ny)
    const rim = Math.max(0, (edge - 0.38) / 0.62)
    const top = Math.max(0, 1 - ny * 2.4)
    const wave = 0.5 + 0.5 * Math.sin(nx * 8.1 + ny * 3.4) * Math.sin(nx * 2.7 - ny * 7.2)
    const field =
        0.04 +
        rim * 0.5 +
        top * 0.22 +
        blob(nx, ny, 0.16, 0.68, 0.2, 0.26) * 0.72 +
        blob(nx, ny, 0.86, 0.24, 0.18, 0.2) * 0.62 +
        blob(nx, ny, 0.72, 0.78, 0.16, 0.18) * 0.48 +
        blob(nx, ny, 0.38, 0.18, 0.14, 0.12) * 0.38 +
        wave * 0.1
    return Math.min(1, field)
}

/** Full-frame speckle (not a repeating tile) so density clusters stay unique. */
const speckleField = (
    seed: number,
    cols: number,
    rows: number,
    rMin: number,
    rMax: number,
    densityScale = 1
): string => {
    const W = 1600
    const H = 1000
    const rand = mulberry32(seed)
    const circles: string[] = []
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const nx = (x + 0.14 + rand() * 0.72) / cols
            const ny = (y + 0.14 + rand() * 0.72) / rows
            if (rand() > densityAt(nx, ny) * densityScale) continue
            const r = rMin + rand() * (rMax - rMin)
            const o = 0.28 + rand() * 0.62
            circles.push(
                `<circle cx="${(nx * W).toFixed(1)}" cy="${(ny * H).toFixed(1)}" r="${r.toFixed(2)}" fill="#000" fill-opacity="${o.toFixed(2)}"/>`
            )
        }
    }
    return `url("data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">${circles.join('')}</svg>`
    )}")`
}

const SPECKLE_FINE = speckleField(11, 86, 54, 0.35, 0.95, 1)
const SPECKLE_LOOSE = speckleField(29, 30, 19, 0.9, 1.85, 0.72)

const speckleLayer = (mask: string, color: string): React.CSSProperties => ({
    backgroundColor: color,
    WebkitMaskImage: mask,
    maskImage: mask,
    WebkitMaskSize: 'cover',
    maskSize: 'cover',
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
    WebkitMaskPosition: 'center',
    maskPosition: 'center',
})

/**
 * WIM Agora — Hogzilla field + clustered speckle (own scene; Hogzilla stays plain).
 */
const Agora = () => (
    <>
        <div
            className={`absolute inset-0 bg-[linear-gradient(268.63deg,#E3E1E4_0%,#FDFDFD_80%,#FDFDFD_100%)] opacity-100 dark:opacity-0 ${FADE_OPACITY}`}
        />
        <div
            className={`absolute inset-0 bg-[linear-gradient(180deg,#141E40_0%,#46368B_100%)] opacity-0 dark:opacity-100 ${FADE_OPACITY}`}
        />

        <div
            className={`absolute inset-0 opacity-100 dark:opacity-0 ${FADE_OPACITY}`}
            style={speckleLayer(SPECKLE_FINE, 'rgba(44,40,52,0.52)')}
        />
        <div
            className={`absolute inset-0 opacity-100 dark:opacity-0 ${FADE_OPACITY}`}
            style={speckleLayer(SPECKLE_LOOSE, 'rgba(44,40,52,0.24)')}
        />
        <div
            className={`absolute inset-0 opacity-0 dark:opacity-100 ${FADE_OPACITY}`}
            style={speckleLayer(SPECKLE_FINE, 'rgba(200,187,255,0.42)')}
        />
        <div
            className={`absolute inset-0 opacity-0 dark:opacity-100 ${FADE_OPACITY}`}
            style={speckleLayer(SPECKLE_LOOSE, 'rgba(200,187,255,0.2)')}
        />
    </>
)

/**
 * wimpos Keyboard Garden — cream base + photo BGs only.
 * No hedge PNG overlay (that was the 3D layer on top).
 */
const KeyboardGarden = () => (
    <>
        <div className="absolute inset-0 bg-gradient-to-b from-[#FDEECD] to-[#FFFEF4]" />

        <div
            className={`absolute inset-0 sm:hidden opacity-100 dark:opacity-0 ${FADE_OPACITY}`}
            style={{
                backgroundImage:
                    "url('https://res.cloudinary.com/dmukukwp6/image/upload/9000_mobile_bg_light_95ed14e5a3.jpg')",
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right bottom',
            }}
        />
        <div
            className={`absolute inset-0 sm:hidden opacity-0 dark:opacity-100 ${FADE_OPACITY}`}
            style={{
                backgroundImage:
                    "url('https://res.cloudinary.com/dmukukwp6/image/upload/9000_mobile_bg_dark_8a84515f2d.jpg')",
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right bottom',
            }}
        />
        <div
            className={`absolute inset-0 hidden sm:block opacity-100 dark:opacity-0 ${FADE_OPACITY}`}
            style={{
                backgroundImage:
                    "url('https://res.cloudinary.com/dmukukwp6/image/upload/9000_bg_light_07316896be.jpg')",
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right bottom',
            }}
        />
        <div
            className={`absolute inset-0 hidden sm:block opacity-0 dark:opacity-100 ${FADE_OPACITY}`}
            style={{
                backgroundImage: "url('https://res.cloudinary.com/dmukukwp6/image/upload/9000_bg_dark_9a32796f77.jpg')",
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right bottom',
            }}
        />
    </>
)

const SCENES: { key: string; Scene: React.FC; visible: string }[] = [
    { key: 'hogzilla', Scene: Hogzilla, visible: 'wallpaper-hogzilla:block' },
    { key: 'startup-monopoly', Scene: StartupMonopoly, visible: 'wallpaper-startup-monopoly:block' },
    { key: 'office-party', Scene: OfficeParty, visible: 'wallpaper-office-party:block' },
    { key: 'keyboard-garden', Scene: KeyboardGarden, visible: 'wallpaper-keyboard-garden:block' },
    { key: 'agora', Scene: Agora, visible: 'wallpaper-agora:block' },
]

export interface WallpaperGlow {
    light: string
    dark: string
}

export const WALLPAPER_GLOW: Record<string, WallpaperGlow> = {
    'keyboard-garden': { light: '#53FFCB', dark: '#49BAC5' },
    hogzilla: { light: '#FF9528', dark: '#9370F0' },
    'startup-monopoly': { light: '#37B878', dark: '#96B4F0' },
    'office-party': { light: '#FF6E54', dark: '#D084F8' },
    agora: { light: '#FF9528', dark: '#9370F0' },
}

export const DEFAULT_WALLPAPER_GLOW: WallpaperGlow = WALLPAPER_GLOW['keyboard-garden']

export const getWallpaperGlow = (wallpaper: string): WallpaperGlow =>
    WALLPAPER_GLOW[wallpaper] ?? DEFAULT_WALLPAPER_GLOW

export default function Wallpapers(_props?: {
    wallpaper?: string
    reduceMotion?: boolean
}): JSX.Element {
    return (
        <div className="fixed inset-0 -z-10 select-none overflow-hidden pointer-events-none">
            {SCENES.map(({ key, Scene, visible }) => (
                <div key={key} className={`hidden ${visible} absolute inset-0`}>
                    <Scene />
                </div>
            ))}
        </div>
    )
}
