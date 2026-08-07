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
