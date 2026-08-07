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
