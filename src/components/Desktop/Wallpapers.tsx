import React from 'react'

/**
 * Wallpapers — solid scenes only (no 3D / Cloudinary art).
 *
 * Visibility: body[data-wallpaper] (theme-init / App.tsx).
 * Default keyboard-garden uses the same warm cream base as wimpos
 * (#FDEECD → #FFFEF4), not sage green — so WINDOW_BG frosted glass
 * (tertiary --bg /75) stays cream-neutral like original OS chrome.
 */

const FADE_COLORS = 'transition-colors duration-700 ease-in-out'
const FADE_OPACITY = 'transition-opacity duration-700 ease-in-out'

/** Matches wimpos KeyboardGarden base gradient (no hedge / photo layers). */
const KeyboardGarden = () => (
    <>
        <div
            className={`absolute inset-0 bg-gradient-to-b from-[#FDEECD] to-[#FFFEF4] opacity-100 dark:opacity-0 ${FADE_OPACITY}`}
        />
        {/* Dark: deep charcoal (not sage), keeps glass reading cool-neutral */}
        <div className={`absolute inset-0 bg-[#1a1b1f] opacity-0 dark:opacity-100 ${FADE_COLORS}`} />
    </>
)

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

const StartupMonopoly = () => (
    <>
        <div className={`absolute inset-0 bg-[#E7E0DA] dark:bg-[#686E88] ${FADE_COLORS}`} />
    </>
)

const OfficeParty = () => (
    <>
        {/* Carpet tile color only — no office character art */}
        <div className={`absolute inset-0 bg-[#C4B8A8] opacity-100 dark:opacity-0 ${FADE_COLORS}`} />
        <div className={`absolute inset-0 bg-[#2A2520] opacity-0 dark:opacity-100 ${FADE_COLORS}`} />
    </>
)

const SCENES: { key: string; Scene: React.FC; visible: string }[] = [
    { key: 'hogzilla', Scene: Hogzilla, visible: 'wallpaper-hogzilla:block' },
    { key: 'startup-monopoly', Scene: StartupMonopoly, visible: 'wallpaper-startup-monopoly:block' },
    { key: 'office-party', Scene: OfficeParty, visible: 'wallpaper-office-party:block' },
    { key: 'keyboard-garden', Scene: KeyboardGarden, visible: 'wallpaper-keyboard-garden:block' },
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
