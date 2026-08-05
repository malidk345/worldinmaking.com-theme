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

// Solid SVG thumbs for the default canvas wallpaper (no remote image needed)
const SOLID_THUMB_LIGHT =
    'data:image/svg+xml,' +
    encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="100%" height="100%" fill="#A8B8A8"/></svg>'
    )
const SOLID_THUMB_DARK =
    'data:image/svg+xml,' +
    encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="100%" height="100%" fill="#0F1612"/></svg>'
    )

export const themeOptions: ThemeOption[] = [
    {
        label: 'Garden green',
        value: 'keyboard-garden',
        background: {
            thumb: {
                light: SOLID_THUMB_LIGHT,
                dark: SOLID_THUMB_DARK,
            },
            classes: '',
        },
    },
    {
        label: 'Hogzilla',
        value: 'hogzilla',
        background: {
            thumb: {
                light: 'https://res.cloudinary.com/dmukukwp6/image/upload/w_800,h_500,c_pad,b_rgb:E3E1E4/9000_hogzilla_359a450fb3.png',
                dark: 'https://res.cloudinary.com/dmukukwp6/image/upload/w_800,h_500,c_pad,b_rgb:2A1F5C/9000_hogzilla_359a450fb3.png',
            },
            // Semi-transparent scrim behind labels — Hogzilla's busy artwork washes out plain white text.
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
            thumb: {
                light: 'https://res.cloudinary.com/dmukukwp6/image/upload/w_800,h_500,c_fill/l_office_cc4ae8675f/c_scale,w_420/fl_layer_apply,g_south_west,x_48,y_40/carpet_light_27d74f73b5.png',
                dark: 'https://res.cloudinary.com/dmukukwp6/image/upload/w_800,h_500,c_fill/l_office_cc4ae8675f/c_scale,w_420/fl_layer_apply,g_south_west,x_48,y_40/carpet_dark_f1c9f5ce39.png',
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
