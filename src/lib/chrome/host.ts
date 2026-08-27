import { FALLBACK_CHROME, type ChromeSnapshot } from './tokens'

function readVar(style: CSSStyleDeclaration, name: string, fallback: string): string {
    return style.getPropertyValue(name).trim() || fallback
}

export function rgbTripletToHex(triplet: string): string {
    const parts = triplet.split(/[\s,]+/).map((part) => Number(part))
    if (parts.length < 3 || parts.slice(0, 3).some((n) => !Number.isFinite(n))) return '#000000'
    return `#${parts
        .slice(0, 3)
        .map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0'))
        .join('')}`
}

/** Live host tokens so wallpaper / dark mode flow into isolated previews. */
export function readHostChrome(): ChromeSnapshot {
    if (typeof document === 'undefined') return FALLBACK_CHROME
    const style = getComputedStyle(document.body)
    const dark =
        document.documentElement.classList.contains('dark') ||
        document.body.classList.contains('dark') ||
        document.documentElement.dataset.notebookHostTheme === 'dark'
    return {
        bg: readVar(style, '--bg', FALLBACK_CHROME.bg),
        accent: readVar(style, '--accent', FALLBACK_CHROME.accent),
        border: readVar(style, '--border', FALLBACK_CHROME.border),
        textPrimary: readVar(style, '--text-primary', FALLBACK_CHROME.textPrimary),
        textSecondary: readVar(style, '--text-secondary', FALLBACK_CHROME.textSecondary),
        textMuted: readVar(style, '--text-muted', FALLBACK_CHROME.textMuted),
        inputBg: readVar(style, '--input-bg', FALLBACK_CHROME.inputBg),
        inputBorder: readVar(style, '--input-border', FALLBACK_CHROME.inputBorder),
        navy: FALLBACK_CHROME.navy,
        radius: FALLBACK_CHROME.radius,
        font: FALLBACK_CHROME.font,
        dark,
    }
}
