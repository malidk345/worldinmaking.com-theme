import React from 'react'
import CloudinaryImage from 'components/CloudinaryImage'

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
        <div className={`absolute inset-0 bg-accent ${FADE_COLORS}`} />
        <CloudinaryImage
            loading="lazy"
            src="https://res.cloudinary.com/dmukukwp6/image/upload/9000_monopoly_light_6614a8a5d5.jpg"
            alt=""
            width={2967}
            height={1463}
            className={`absolute right-0 top-0 w-[1483.5px] h-[731.5px] max-w-full opacity-100 dark:opacity-0 ${FADE_OPACITY}`}
        />
        <CloudinaryImage
            loading="lazy"
            src="https://res.cloudinary.com/dmukukwp6/image/upload/9000_monopoly_dark_26c85ccad8.jpg"
            alt=""
            width={1582}
            height={782}
            className={`absolute right-0 top-0 w-[1483.5px] h-[731.5px] max-w-full opacity-0 dark:opacity-100 ${FADE_OPACITY}`}
        />
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

const KeyboardGarden = () => (
    <>
        <div className={`absolute inset-0 bg-accent ${FADE_COLORS}`} />
        <div
            className={`absolute inset-0 opacity-100 dark:opacity-0 ${FADE_OPACITY}`}
            style={{
                backgroundImage:
                    "url('https://res.cloudinary.com/dmukukwp6/image/upload/keyboard_garden_bg_light_03a349af5c.png')",
                backgroundSize: '100px 100px',
                backgroundRepeat: 'repeat',
            }}
        />
        <div
            className={`absolute inset-0 opacity-0 dark:opacity-100 ${FADE_OPACITY}`}
            style={{
                backgroundImage:
                    "url('https://res.cloudinary.com/dmukukwp6/image/upload/keyboard_garden_bg_dark_9ab088797a.png')",
                backgroundSize: '200px 200px',
                backgroundRepeat: 'repeat',
            }}
        />
    </>
)

const CustomProWallpaper = () => (
    <>
        {/* Light Mode Wallpaper */}
        <div className={`absolute inset-0 bg-gradient-to-br from-[#F8FAFC] via-[#F1F5F9] to-[#E2E8F0] opacity-100 dark:opacity-0 ${FADE_OPACITY}`}>
            <div
                className="absolute inset-0 opacity-50 pointer-events-none"
                style={{
                    backgroundImage: `radial-gradient(rgba(59, 130, 246, 0.4) 1.4px, transparent 1.4px)`,
                    backgroundSize: '24px 24px',
                }}
            />
            <div className="absolute top-1/4 left-1/4 w-[550px] h-[550px] bg-blue-400/25 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-[650px] h-[650px] bg-indigo-300/25 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Dark Mode Wallpaper */}
        <div className={`absolute inset-0 bg-[#0B0F19] opacity-0 dark:opacity-100 ${FADE_OPACITY}`}>
            <div
                className="absolute inset-0 opacity-45 pointer-events-none"
                style={{
                    backgroundImage: `radial-gradient(rgba(59, 130, 246, 0.45) 1.4px, transparent 1.4px)`,
                    backgroundSize: '28px 28px',
                }}
            />
            <div className="absolute top-1/3 left-1/3 w-[650px] h-[650px] bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/3 right-1/4 w-[750px] h-[750px] bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        </div>
    </>
)

const SCENES: { key: string; Scene: React.FC }[] = [
    { key: 'hogzilla', Scene: Hogzilla },
    { key: 'startup-monopoly', Scene: StartupMonopoly },
    { key: 'office-party', Scene: OfficeParty },
    { key: 'keyboard-garden', Scene: KeyboardGarden },
    { key: 'custom-pro', Scene: CustomProWallpaper },
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
    'custom-pro': { light: '#3B82F6', dark: '#818CF8' },
}

export const DEFAULT_WALLPAPER_GLOW: WallpaperGlow = WALLPAPER_GLOW['keyboard-garden']

export const getWallpaperGlow = (wallpaper: string): WallpaperGlow =>
    WALLPAPER_GLOW[wallpaper] ?? DEFAULT_WALLPAPER_GLOW

export default function Wallpapers({ wallpaper: propWallpaper }: { wallpaper?: string }): JSX.Element {
    const activeWallpaper = propWallpaper || 'keyboard-garden'

    return (
        <div className="fixed inset-0 -z-10 select-none overflow-hidden pointer-events-none bg-primary dark:bg-[#1b1c1e] transition-colors duration-700">
            {SCENES.map(({ key, Scene }) => {
                const isVisible = activeWallpaper === key
                return (
                    <div
                        key={key}
                        className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                            isVisible ? 'opacity-100 z-0' : 'opacity-0 -z-10 pointer-events-none'
                        }`}
                    >
                        <Scene />
                    </div>
                )
            })}
        </div>
    )
}
