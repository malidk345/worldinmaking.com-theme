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

// Solid SVG thumbs only (no 3D / remote art) — colors match window chrome tokens
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
            // Warm cream base (wimpos keyboard-garden gradient ends), not sage green
            thumb: {
                light: svgThumb('#FDF6E3'),
                dark: svgThumb('#1a1b1f'),
            },
            classes: '',
        },
    },
    {
        label: 'Hogzilla',
        value: 'hogzilla',
        background: {
            thumb: {
                light: svgThumb('#E3E1E4'),
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
                light: svgThumb('#E7E0DA'),
                dark: svgThumb('#686E88'),
            },
            classes: 'wallpaper-startup-monopoly:bg-black/50 dark:wallpaper-startup-monopoly:bg-black/60',
        },
    },
    {
        label: 'Office party',
        value: 'office-party',
        background: {
            thumb: {
                light: svgThumb('#C4B8A8'),
                dark: svgThumb('#2A2520'),
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
