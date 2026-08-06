import React from 'react'
import CloudinaryImage from 'components/CloudinaryImage'

/**
 * Wallpapers
 *
 * Renders every desktop scene; visibility is driven by `body[data-wallpaper]`,
 * set from localStorage in theme-init.js before React hydrates (and kept in sync
 * by App.tsx). That way the saved wallpaper paints on first frame — no flash of
 * the default scene.
 *
 * Light ↔ dark within a scene is a CSS fade via the persistent `dark` class.
 * Scene ↔ scene is an instant swap.
 */

const FADE_OPACITY = 'transition-opacity duration-700 ease-in-out'
const FADE_COLORS = 'transition-colors duration-700 ease-in-out'

const Hogzilla = () => (
    <>
        <div
            className={`absolute inset-0 bg-[linear-gradient(268.63deg,#E3E1E4_0%,#FDFDFD_80%,#FDFDFD_100%)] opacity-100 dark:opacity-0 ${FADE_OPACITY}`}
        />
        <div
            className={`absolute inset-0 bg-[linear-gradient(180deg,#141E40_0%,#46368B_100%)] opacity-0 dark:opacity-100 ${FADE_OPACITY}`}
        />
        <CloudinaryImage
            loading="lazy"
            src="https://res.cloudinary.com/dmukukwp6/image/upload/9000_hogzilla_359a450fb3.png"
            alt=""
            width={1780}
            height={868}
            className="absolute inset-0 flex items-end justify-end"
            imgClassName="w-full max-w-[1780px] h-auto z-10"
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
        <CloudinaryImage
            loading="lazy"
            src="https://res.cloudinary.com/dmukukwp6/image/upload/office_cc4ae8675f.png"
            alt=""
            width={997}
            height={858}
            className="absolute bottom-24 left-24 md:bottom-12 md:left-36 w-[498.5px] h-[429px]"
        />
    </>
)

/**
 * Default desktop: flat garden green — darker sage so chrome/glass pop.
 * Light #A8B8A8 — mid muted green (not pastel).
 * Dark #0F1612 — deeper green black.
 * Kept under key `keyboard-garden` so existing defaults / localStorage keep working.
 */
const SolidCanvas = () => (
    <>
        <div className={`absolute inset-0 bg-[#A8B8A8] opacity-100 dark:opacity-0 ${FADE_COLORS}`} />
        <div className={`absolute inset-0 bg-[#0F1612] opacity-0 dark:opacity-100 ${FADE_COLORS}`} />
    </>
)

// Visibility classes written out in full so Tailwind's JIT scanner can see them.
const SCENES: { key: string; Scene: React.FC; visible: string }[] = [
    { key: 'hogzilla', Scene: Hogzilla, visible: 'wallpaper-hogzilla:block' },
    { key: 'startup-monopoly', Scene: StartupMonopoly, visible: 'wallpaper-startup-monopoly:block' },
    { key: 'office-party', Scene: OfficeParty, visible: 'wallpaper-office-party:block' },
    { key: 'keyboard-garden', Scene: SolidCanvas, visible: 'wallpaper-keyboard-garden:block' },
]

export interface WallpaperGlow {
    light: string
    dark: string
}

export const WALLPAPER_GLOW: Record<string, WallpaperGlow> = {
    // Icon glow on sage canvas
    'keyboard-garden': { light: '#53FFCB', dark: '#49BAC5' },
    hogzilla: { light: '#FF9528', dark: '#9370F0' },
    'startup-monopoly': { light: '#37B878', dark: '#96B4F0' },
    'office-party': { light: '#FF6E54', dark: '#D084F8' },
}

export const DEFAULT_WALLPAPER_GLOW: WallpaperGlow = WALLPAPER_GLOW['keyboard-garden']

export const getWallpaperGlow = (wallpaper: string): WallpaperGlow =>
    WALLPAPER_GLOW[wallpaper] ?? DEFAULT_WALLPAPER_GLOW

// wallpaper/reduceMotion props are accepted for call-site compatibility; visibility
// is driven by body[data-wallpaper] (set in App.tsx / theme init), same as wimpos.
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
