/**
 * Compatibility facade. New code should import from `src/lib/chrome`.
 * Host token contract lives there; this file only re-exports.
 */

import { chromeStylesheet } from './chrome/css'
import { wrapChromeDocument, WIM_UI_CHROME_PROMPT } from './chrome/inject'
import { mermaidThemeVariables } from './chrome/mermaid'
import { FALLBACK_CHROME, WIM_INK, WIM_NAVY, WIM_NAVY_SOFT, WIM_PAPER } from './chrome/tokens'

export { WIM_INK, WIM_NAVY, WIM_NAVY_SOFT, WIM_PAPER, WIM_UI_CHROME_PROMPT }

export const WIM_RADIUS = FALLBACK_CHROME.radius
export const WIM_FONT = FALLBACK_CHROME.font
export const WIM_ARTIFACT_THEME_CSS = chromeStylesheet(FALLBACK_CHROME)
export const WIM_MERMAID_VARS_LIGHT = mermaidThemeVariables({ ...FALLBACK_CHROME, dark: false })
export const WIM_MERMAID_VARS_DARK = mermaidThemeVariables({ ...FALLBACK_CHROME, dark: true })

export function wrapHtmlArtifactDocument(html: string): string {
    return wrapChromeDocument(html)
}
