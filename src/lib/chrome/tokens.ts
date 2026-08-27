/**
 * Host OS chrome contract.
 *
 * These names match `src/styles/global.css` (`--bg`, `--border`, `--text-primary`)
 * and `tailwind.config.js` (`bg-primary` = surface, `text-primary` = ink, `navy` = brand).
 * Artifacts must speak this vocabulary. shadcn `bg-primary` = brand is NOT the host meaning.
 */

export type ChromeSnapshot = {
    bg: string
    accent: string
    border: string
    textPrimary: string
    textSecondary: string
    textMuted: string
    inputBg: string
    inputBorder: string
    navy: string
    radius: string
    font: string
    dark: boolean
}

/** Light `[data-scheme=primary]` fallbacks from global.css. */
export const FALLBACK_CHROME: ChromeSnapshot = {
    bg: '253 253 253',
    accent: '230 230 230',
    border: '192 192 192',
    textPrimary: '17 17 17',
    textSecondary: '100 100 100',
    textMuted: '155 155 155',
    inputBg: '240 240 240',
    inputBorder: '210 210 210',
    navy: '#1D4ED8',
    radius: '6px',
    font: 'RoundHog, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    dark: false,
}

export const WIM_NAVY = FALLBACK_CHROME.navy
export const WIM_NAVY_SOFT = '#DBEAFE'
export const WIM_PAPER = '#FDFDFD'
export const WIM_INK = '#111111'
