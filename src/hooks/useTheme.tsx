import { useState, useEffect } from 'react'

export interface ThemeOption {
    label: string
    value: string
    background?: {
        thumb?: {
            light?: string
            dark?: string
        }
        classes?: string // Full Tailwind classes that Tailwind can see
    }
}

const svgThumb = (hex: string) =>
    'data:image/svg+xml,' +
    encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="100%" height="100%" fill="${hex}"/></svg>`
    )

const agoraThumb = (mode: 'light' | 'dark') => {
    const fill = mode === 'light' ? 'url(#agora-lg)' : 'url(#agora-dk)'
    const dot = mode === 'light' ? 'rgba(48,44,56,0.28)' : 'rgba(186,170,255,0.38)'
    return (
        'data:image/svg+xml,' +
        encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
                <defs>
                    <linearGradient id="agora-lg" x1="0" y1="0.2" x2="1" y2="0.4">
                        <stop offset="0%" stop-color="#E3E1E4"/>
                        <stop offset="80%" stop-color="#FDFDFD"/>
                    </linearGradient>
                    <linearGradient id="agora-dk" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#141E40"/>
                        <stop offset="100%" stop-color="#46368B"/>
                    </linearGradient>
                    <radialGradient id="agora-den-${mode}" cx="18%" cy="72%" r="42%">
                        <stop offset="0%" stop-color="${dot}" stop-opacity="0.85"/>
                        <stop offset="100%" stop-color="${dot}" stop-opacity="0"/>
                    </radialGradient>
                    <radialGradient id="agora-den2-${mode}" cx="84%" cy="22%" r="28%">
                        <stop offset="0%" stop-color="${dot}" stop-opacity="0.7"/>
                        <stop offset="100%" stop-color="${dot}" stop-opacity="0"/>
                    </radialGradient>
                    <pattern id="agora-dots-${mode}" width="36" height="36" patternUnits="userSpaceOnUse">
                        <circle cx="4" cy="7" r="0.7" fill="${dot}" fill-opacity="0.7"/>
                        <circle cx="17" cy="3" r="0.45" fill="${dot}" fill-opacity="0.45"/>
                        <circle cx="29" cy="9" r="0.85" fill="${dot}" fill-opacity="0.8"/>
                        <circle cx="11" cy="18" r="0.5" fill="${dot}" fill-opacity="0.4"/>
                        <circle cx="23" cy="22" r="0.7" fill="${dot}" fill-opacity="0.65"/>
                        <circle cx="7" cy="30" r="0.4" fill="${dot}" fill-opacity="0.5"/>
                        <circle cx="33" cy="27" r="0.55" fill="${dot}" fill-opacity="0.55"/>
                        <circle cx="19" cy="33" r="0.9" fill="${dot}" fill-opacity="0.35"/>
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="${fill}"/>
                <rect width="100%" height="100%" fill="url(#agora-dots-${mode})" opacity="0.28"/>
                <rect width="100%" height="100%" fill="url(#agora-den-${mode})"/>
                <rect width="100%" height="100%" fill="url(#agora-den2-${mode})"/>
            </svg>`
        )
    )
}

export const themeOptions: ThemeOption[] = [
    {
        label: 'Keyboard garden',
        value: 'keyboard-garden',
        background: {
            // Photo BG only (no hedge overlay)
            thumb: {
                light: 'https://res.cloudinary.com/dmukukwp6/image/upload/w_800,h_500,c_fill,g_south_east/9000_bg_light_07316896be.jpg',
                dark: 'https://res.cloudinary.com/dmukukwp6/image/upload/w_800,h_500,c_fill,g_south_east/9000_bg_dark_9a32796f77.jpg',
            },
            classes: '',
        },
    },
    {
        label: 'Hogzilla',
        value: 'hogzilla',
        background: {
            // Gradient base only (no hogzilla figure)
            thumb: {
                light: svgThumb('#E8E6E9'),
                dark: svgThumb('#2A1F5C'),
            },
            classes: 'wallpaper-hogzilla:bg-black/50 dark:wallpaper-hogzilla:bg-black/60',
        },
    },
    {
        label: 'Startup Monopoly',
        value: 'startup-monopoly',
        background: {
            thumb: {
                light: 'https://res.cloudinary.com/dmukukwp6/image/upload/w_800,h_500,c_fill,g_east/9000_monopoly_light_6614a8a5d5.jpg',
                dark: 'https://res.cloudinary.com/dmukukwp6/image/upload/w_800,h_500,c_fill,g_east/9000_monopoly_dark_26c85ccad8.jpg',
            },
            classes: 'wallpaper-startup-monopoly:bg-black/50 dark:wallpaper-startup-monopoly:bg-black/60',
        },
    },
    {
        label: 'Office party',
        value: 'office-party',
        background: {
            // Carpet only (no office character)
            thumb: {
                light: 'https://res.cloudinary.com/dmukukwp6/image/upload/w_800,h_500,c_fill/carpet_light_27d74f73b5.png',
                dark: 'https://res.cloudinary.com/dmukukwp6/image/upload/w_800,h_500,c_fill/carpet_dark_f1c9f5ce39.png',
            },
        },
    },
    {
        label: 'Agora',
        value: 'agora',
        background: {
            thumb: {
                light: agoraThumb('light'),
                dark: agoraThumb('dark'),
            },
        },
    },
]

const generateThemeClasses = (theme: ThemeOption) => {
    const { background } = theme

    // Only return predefined classes (colors, etc.)
    return background?.classes || ''
}

export const getWallpaperClasses = () => {
    return themeOptions.map(generateThemeClasses).join(' ')
}

export const getThemeSpecificBackgroundColors = () => {
    return themeOptions
        .filter((theme) => theme.background?.classes)
        .map((theme) => theme.background?.classes || '')
        .join(' ')
}

export default function useTheme() {
    return {
        themeOptions,
        getWallpaperClasses,
        getThemeSpecificBackgroundColors,
    }
}
