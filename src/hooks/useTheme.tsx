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

const cobaltThumb = (mode: 'light' | 'dark', extra: 'field' | 'clouds' | 'bang') => {
    const top = mode === 'light' ? '#2F7ED4' : '#1E5DAD'
    const bot = mode === 'light' ? '#5EB0F0' : '#3D8FDC'
    const cloud = extra === 'field' ? '' : `<ellipse cx="400" cy="230" rx="280" ry="36" fill="white" fill-opacity="0.55"/>`
    const bang =
        extra === 'bang'
            ? `<g transform="translate(620,40)"><ellipse cx="48" cy="52" rx="28" ry="40" fill="#1E4A86"/><circle cx="48" cy="108" r="14" fill="#1E4A86"/><ellipse cx="40" cy="38" rx="8" ry="12" fill="#F5E6B8" fill-opacity="0.85"/></g>`
            : ''
    return (
        'data:image/svg+xml,' +
        encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
                <defs>
                    <linearGradient id="cb-${mode}-${extra}" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="${top}"/>
                        <stop offset="100%" stop-color="${bot}"/>
                    </linearGradient>
                </defs>
                <rect width="100%" height="100%" fill="url(#cb-${mode}-${extra})"/>
                ${cloud}
                ${bang}
            </svg>`
        )
    )
}

const meadowThumb = (mode: 'light' | 'dark', extra: 'field' | 'grass' | 'flowers') => {
    const sky = mode === 'light' ? '#2F6A24' : '#1E4A1A'
    const mid = mode === 'light' ? '#275820' : '#173C15'
    const ground = mode === 'light' ? '#1C4518' : '#102A0F'
    const blades = extra === 'field' ? '' : `<g fill="${mode === 'light' ? '#7BC44A' : '#3D8B2E'}" fill-opacity="0.7">
        <rect x="40" y="310" width="4" height="18"/><rect x="80" y="300" width="4" height="26"/>
        <rect x="140" y="318" width="4" height="16"/><rect x="220" y="292" width="4" height="28"/>
        <rect x="310" y="308" width="4" height="20"/><rect x="400" y="298" width="4" height="24"/>
        <rect x="490" y="312" width="4" height="18"/><rect x="580" y="294" width="4" height="26"/>
        <rect x="670" y="306" width="4" height="22"/><rect x="740" y="300" width="4" height="24"/>
    </g>`
    const blooms =
        extra === 'flowers'
            ? `<g><circle cx="180" cy="360" r="6" fill="#F7F1DC"/><circle cx="180" cy="360" r="2.5" fill="#E7B83A"/><circle cx="420" cy="390" r="6" fill="#F7F1DC"/><circle cx="420" cy="390" r="2.5" fill="#E7B83A"/><circle cx="620" cy="350" r="5" fill="#F7F1DC"/><circle cx="620" cy="350" r="2" fill="#E7B83A"/></g>`
            : ''
    return (
        'data:image/svg+xml,' +
        encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
                <defs>
                    <linearGradient id="md-${mode}-${extra}" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="${sky}"/>
                        <stop offset="42%" stop-color="${mid}"/>
                        <stop offset="100%" stop-color="${ground}"/>
                    </linearGradient>
                </defs>
                <rect width="100%" height="100%" fill="url(#md-${mode}-${extra})"/>
                ${blades}
                ${blooms}
            </svg>`
        )
    )
}

const draftThumb = (mode: 'light' | 'dark', extra: 'field' | 'grid' | 'world') => {
    const paper = mode === 'light' ? '#E8E2D6' : '#141E40'
    const ring = mode === 'light' ? 'rgba(30,74,134,0.28)' : 'rgba(243,230,180,0.28)'
    const grain = extra === 'field' ? '' : `<g fill="${mode === 'light' ? '#DDD6C8' : '#1A2748'}" fill-opacity="0.55">
        <rect x="40" y="40" width="6" height="6"/><rect x="120" y="90" width="6" height="6"/>
        <rect x="220" y="50" width="6" height="6"/><rect x="340" y="110" width="6" height="6"/>
        <rect x="500" y="70" width="6" height="6"/><rect x="640" y="40" width="6" height="6"/>
    </g>`
    const marks =
        extra === 'world'
            ? `<g><rect x="90" y="80" width="8" height="2" fill="#1E4A86"/><rect x="93" y="77" width="2" height="8" fill="#1E4A86"/><rect x="260" y="200" width="4" height="4" fill="#D08A3A"/><ellipse cx="680" cy="360" rx="22" ry="30" fill="#1E4A86"/><circle cx="680" cy="402" r="10" fill="#1E4A86"/></g>`
            : ''
    return (
        'data:image/svg+xml,' +
        encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
                <rect width="100%" height="100%" fill="${paper}"/>
                ${extra === 'field' ? '' : `<circle cx="400" cy="250" r="160" fill="none" stroke="${ring}" stroke-width="2"/>`}
                ${grain}
                ${marks}
            </svg>`
        )
    )
}

const haloThumb = (extra: 'field' | 'disc' | 'sparks') => {
    const sparks =
        extra === 'sparks'
            ? Array.from({ length: 8 }, (_, i) => {
                  const a = (i / 8) * Math.PI * 2
                  const x = 400 + Math.cos(a) * 150
                  const y = 250 + Math.sin(a) * 150
                  return `<rect x="${x - 2}" y="${y - 6}" width="3" height="12" fill="#F3E6B4"/><rect x="${x - 6}" y="${y - 2}" width="12" height="3" fill="#F3E6B4"/>`
              }).join('')
            : ''
    const disc = extra === 'field' ? '' : `<circle cx="400" cy="250" r="110" fill="#F3E6B4"/>`
    return (
        'data:image/svg+xml,' +
        encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
                <rect width="100%" height="100%" fill="#1B2748"/>
                ${disc}
                ${sparks}
            </svg>`
        )
    )
}

const rainThumb = (extra: 'field' | 'fall' | 'embers') => {
    const drops =
        extra === 'field'
            ? ''
            : `<g fill="#D7E7F4" fill-opacity="0.7">
                <rect x="80" y="40" width="2" height="28"/><rect x="140" y="90" width="2" height="18"/>
                <rect x="220" y="30" width="2" height="34"/><rect x="310" y="70" width="2" height="22"/>
                <rect x="400" y="50" width="2" height="30"/><rect x="490" y="100" width="2" height="16"/>
                <rect x="580" y="35" width="2" height="26"/><rect x="670" y="80" width="2" height="20"/>
                <rect x="740" y="45" width="2" height="32"/>
            </g>`
    const embers =
        extra === 'embers'
            ? `<g fill="#D08A3A"><rect x="180" y="200" width="3" height="12"/><rect x="520" y="160" width="3" height="10"/><ellipse cx="120" cy="380" rx="18" ry="24" fill="#1E4A86"/></g>`
            : ''
    return (
        'data:image/svg+xml,' +
        encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
                <rect width="100%" height="100%" fill="#1A3350"/>
                ${drops}
                ${embers}
            </svg>`
        )
    )
}

const dawnThumb = (extra: 'field' | 'grain' | 'sun') => {
    const paper = '#F8F1E6'
    const sun = extra === 'field' ? '' : extra === 'grain' ? '' : `<circle cx="520" cy="200" r="90" fill="#F3D7A0"/>`
    const sparks =
        extra === 'sun'
            ? `<g fill="#E8C98A"><rect x="80" y="70" width="2" height="10"/><rect x="76" y="74" width="10" height="2"/><rect x="200" y="120" width="2" height="8"/><rect x="196" y="123" width="8" height="2"/></g>`
            : ''
    return (
        'data:image/svg+xml,' +
        encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
                <defs>
                    <linearGradient id="dawn-${extra}" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#FDE6D2"/>
                        <stop offset="100%" stop-color="#F0D9C4"/>
                    </linearGradient>
                </defs>
                <rect width="100%" height="100%" fill="url(#dawn-${extra})"/>
                ${extra === 'field' ? '' : `<rect width="100%" height="100%" fill="${paper}" fill-opacity="0.18"/>`}
                ${sun}
                ${sparks}
            </svg>`
        )
    )
}

const iceThumb = (extra: 'field' | 'grain' | 'marks') => {
    const panes =
        extra === 'field'
            ? ''
            : `<rect x="70" y="60" width="140" height="140" rx="18" fill="white" fill-opacity="0.28" stroke="#1E4A86" stroke-opacity="0.2"/>
               <rect x="560" y="280" width="110" height="110" rx="16" fill="white" fill-opacity="0.2" stroke="#1E4A86" stroke-opacity="0.16"/>`
    const marks =
        extra === 'marks'
            ? `<g fill="#1E4A86"><rect x="240" y="80" width="2" height="10"/><rect x="236" y="84" width="10" height="2"/><ellipse cx="680" cy="110" rx="18" ry="24"/></g>`
            : ''
    return (
        'data:image/svg+xml,' +
        encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
                <defs>
                    <linearGradient id="ice-${extra}" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#E7F3FB"/>
                        <stop offset="100%" stop-color="#C2DCF0"/>
                    </linearGradient>
                </defs>
                <rect width="100%" height="100%" fill="url(#ice-${extra})"/>
                ${panes}
                ${marks}
            </svg>`
        )
    )
}

const plazaThumb = (mode: 'light' | 'dark', extra: 'field' | 'carpet' | 'bang') => {
    const bg = mode === 'light' ? '#E6DFD2' : '#141E40'
    const fg = mode === 'light' ? '#CFC6B6' : '#1E2C4A'
    const carpet =
        extra === 'field'
            ? ''
            : `<g fill="${fg}">
                <rect x="0" y="0" width="20" height="80" transform="rotate(45 40 40)"/>
                <rect x="40" y="0" width="20" height="80" transform="rotate(45 80 40)"/>
                <rect x="80" y="0" width="20" height="80" transform="rotate(-45 120 40)"/>
                <rect x="120" y="0" width="20" height="80" transform="rotate(-45 160 40)"/>
            </g>`
    const bang =
        extra === 'bang'
            ? `<ellipse cx="640" cy="340" rx="36" ry="50" fill="#1E4A86"/><circle cx="640" cy="410" r="16" fill="#1E4A86"/>`
            : ''
    return (
        'data:image/svg+xml,' +
        encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
                <rect width="100%" height="100%" fill="${bg}"/>
                ${carpet}
                ${bang}
            </svg>`
        )
    )
}

const lawnThumb = (mode: 'light' | 'dark', extra: 'field' | 'tufts' | 'bang') => {
    const bg = mode === 'light' ? '#6FA04A' : '#325628'
    const blade = mode === 'light' ? '#3F6E2C' : '#8FBC62'
    const tufts =
        extra === 'field'
            ? ''
            : `<g stroke="${blade}" fill="none" stroke-width="2" stroke-linecap="round">
                <path d="M80 400 L70 340 M80 400 L80 330 M80 400 L92 345"/>
                <path d="M200 360 L188 300 M200 360 L202 290 M200 360 L214 308"/>
                <path d="M360 420 L348 360 M360 420 L362 350 M360 420 L374 368"/>
                <path d="M520 380 L508 322 M520 380 L522 310 M520 380 L534 328"/>
                <path d="M680 410 L668 350 M680 410 L682 340 M680 410 L694 358"/>
            </g>`
    const bang =
        extra === 'bang' ? `<ellipse cx="640" cy="340" rx="32" ry="44" fill="#1E4A86"/><circle cx="640" cy="400" r="14" fill="#1E4A86"/>` : ''
    return (
        'data:image/svg+xml,' +
        encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
                <rect width="100%" height="100%" fill="${bg}"/>
                ${tufts}
                ${bang}
            </svg>`
        )
    )
}

export const themeOptions: ThemeOption[] = [
    {
        label: 'Cobalt',
        value: 'cobalt',
        background: {
            thumb: {
                light: cobaltThumb('light', 'field'),
                dark: cobaltThumb('dark', 'field'),
            },
        },
    },
    {
        label: 'Hogzilla',
        value: 'hogzilla',
        background: {
            thumb: {
                light: svgThumb('#E8E6E9'),
                dark: svgThumb('#2A1F5C'),
            },
            classes: 'wallpaper-hogzilla:bg-black/50 dark:wallpaper-hogzilla:bg-black/60',
        },
    },
    {
        label: 'Draft world',
        value: 'draft-world',
        background: {
            thumb: {
                light: draftThumb('light', 'world'),
                dark: draftThumb('dark', 'world'),
            },
        },
    },
    {
        label: 'Rain embers',
        value: 'rain-embers',
        background: {
            thumb: {
                light: rainThumb('embers'),
                dark: rainThumb('embers'),
            },
        },
    },
    {
        label: 'Plaza bang',
        value: 'plaza-bang',
        background: {
            thumb: {
                light: plazaThumb('light', 'bang'),
                dark: plazaThumb('dark', 'bang'),
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
